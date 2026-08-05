/* ═══════════════════════════════════════════════════════════════════════
   EL PEDIDO SALE DE LAS OFERTAS, YA NO DE `precios`
   · Comisionista y freelance-completo

   Qué se rompía: el sistema web dejó de escribir en `precios`. Un producto
   creado hoy nace con sus ofertas en `ofertas_piladora` y CERO filas en
   `precios`. El catálogo y la cotización ya migraron, pero el módulo PEDIDO
   seguía leyendo `precios`: el vendedor VEÍA el producto y hasta lo cotizaba,
   pero al llegar a «Tomar pedido» el producto no estaba y NO se podía pedir.
   Medido contra producción el 05/08/2026 (ztpwtddrblfvcnnhbevq):
   59 productos activos · 58 con fila vigente en `precios` · 59 con oferta
   vigente · 153 ofertas vigentes · 0 de demostración. El que faltaba era
   P-00197 «Arroz Crecedor»: activo, sin marca, 2 presentaciones, 2 ofertas
   vivas de Piladora San Agustín ($37,00 contado / $38,00 crédito el quintal).

   EL PELIGRO DE ESTE CAMBIO ES EL PRECIO, y por eso media prueba lo vigila:
   en la ficha de Productos el precio se muestra POR QUINTAL (precio ÷ equiv_qq);
   en el PEDIDO la línea se cobra por la PRESENTACIÓN, así que `precio_contado`
   de la oferta entra DIRECTO, sin dividir ni multiplicar por equiv_qq. Antes se
   multiplicaba, porque `precios.base_contado` venía por quintal. Si alguien
   confunde las dos cosas, el pedido sale con importes falsos y nadie lo nota
   hasta que llega la factura.

   Lo que fija esta prueba:
     · un producto con oferta y SIN fila en `precios` se puede PEDIR;
     · el importe de la línea es el de ESA presentación, ni el del quintal
       ni el de la presentación multiplicada por su equivalencia;
     · la equivalencia en quintales sigue viajando, porque el pedido se
       guarda en quintales (cantidad_qq = cant × equiv · precio ÷ equiv);
     · no se duplica: una línea por piladora + producto + presentación, y si
       hubiera dos ofertas vivas de la misma piladora manda la más barata;
     · cada piladora muestra SU precio (en el pedido la piladora se elige
       primero, así que aquí no se colapsa al más barato entre piladoras);
     · lo vencido, lo inactivo y lo que aún no rige NO se puede pedir;
     · un producto dado de baja no se puede pedir aunque tenga oferta viva;
     · un producto SIN MARCA sale con su nombre, nunca en blanco.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Si un mutante pasa
   entero, esa comprobación no está midiendo nada y lo dice a gritos.

   Uso: node test_pedido_ofertas.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una prueba que se borra sin querer no pase inadvertida. ── */
const ESPERADAS = 32;
const MUTANTES_ESPERADOS = 12;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));
/* fecha LOCAL, la del teléfono: la misma regla que usa la app */
const dia = (n) => { const d = new Date(Date.now() + n * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
const HOY = dia(0), AYER = dia(-1), MANANA = dia(1);

/* ══ La base de prueba, con la forma de producción ══ */
const PRODUCTOS_BD = [
  { prod_id:"P-00001", nombre:"Arrocillo Envejecido", marca:"Arrocillo Envejecido",
    linea:"Arroz", proveedor:"POR ASIGNAR", proveedor_cod:null, foto:null, estado:"activo" },
  /* el huérfano de verdad: sin marca y sin una sola fila en `precios` */
  { prod_id:"P-00197", nombre:"Arroz Crecedor", marca:null,
    linea:"Arroz", proveedor:"Piladora San Agustín", proveedor_cod:"AGU", foto:null, estado:"activo" },
  /* dado de baja: aunque tenga oferta viva, no se vende */
  { prod_id:"P-BAJA", nombre:"Arroz Retirado", marca:"Retirado",
    linea:"Arroz", proveedor:"POR ASIGNAR", proveedor_cod:null, foto:null, estado:"inactivo" },
];

const OFERTAS_BD = [
  /* Arrocillo: dos presentaciones × dos piladoras. En el PEDIDO la piladora se
     elige primero, así que cada una conserva SU precio: Cordero cobra más. */
  { prod_id:"P-00001", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"AGU", costo:17.50, costo_contado:17.00, precio_contado:19.00, precio_credito:20.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"ARR", presentacion:"Arroba",  equiv_qq:0.25, prov_cod:"AGU", costo:4.40,  costo_contado:4.25,  precio_contado:4.75,  precio_credito:5.00,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"COR", costo:19.00, costo_contado:18.50, precio_contado:21.00, precio_credito:22.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* la MISMA piladora con dos ofertas vivas del mismo quintal: manda la barata */
  { prod_id:"P-00001", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"COR", costo:19.00, costo_contado:18.50, precio_contado:25.00, precio_credito:26.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* tres trampas baratas: si alguna entra, el precio se desploma y se nota */
  { prod_id:"P-00001", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", costo:1, costo_contado:1, precio_contado:1.00, precio_credito:1.00, activo:true,  vigente_desde:"2026-01-01", vigente_hasta:AYER },
  { prod_id:"P-00001", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", costo:2, costo_contado:2, precio_contado:2.00, precio_credito:2.00, activo:false, vigente_desde:AYER,         vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", costo:3, costo_contado:3, precio_contado:3.00, precio_credito:3.00, activo:true,  vigente_desde:MANANA,       vigente_hasta:null },
  /* sin equivalencia no se puede pasar a quintales: no se ofrece */
  { prod_id:"P-00001", pres_cod:"SAC", presentacion:"Saco raro", equiv_qq:null, prov_cod:"AGU", costo:5, costo_contado:5, precio_contado:7.00, precio_credito:7.50, activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* Arroz Crecedor: una piladora, dos presentaciones. CERO filas en `precios`. */
  { prod_id:"P-00197", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"AGU", costo:34.00, costo_contado:33.00, precio_contado:37.00, precio_credito:38.00, activo:true, vigente_desde:HOY, vigente_hasta:null },
  { prod_id:"P-00197", pres_cod:"ARR", presentacion:"Arroba",  equiv_qq:0.25, prov_cod:"AGU", costo:8.50,  costo_contado:8.25,  precio_contado:9.25,  precio_credito:9.50,  activo:true, vigente_desde:HOY, vigente_hasta:null },
  /* el dado de baja sí tiene oferta viva: lo que lo saca es el producto */
  { prod_id:"P-BAJA", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", costo:9, costo_contado:9, precio_contado:10.00, precio_credito:10.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
];

const PROVEEDORES_BD = [
  { prov_cod:"AGU", nombre:"Piladora San Agustín", es_demo:false },
  { prov_cod:"COR", nombre:"Piladora Cordero",     es_demo:false },
];

const CLIENTES_BD = [
  { cli_id:"CLI-A", nombre:"ROCELUMA CIA LTDA", razon_social:"ROCELUMA CIA LTDA",
    es_demo:false, activo:true, bloqueado:false },
];
const UBIC_BD = [
  { ubic_id:"U-1", cli_id:"CLI-A", nombre:"Matriz", principal:true, tipo_entrega:"domicilio",
    ciudad:"Cuenca", direccion:"Mariscal Lamar 2-59", activo:true },
];

/* `precios` VACÍA: es el estado real de un producto nuevo del sistema web.
   Si el pedido volviera a depender de ella, aquí no habría nada que pedir. */
const PRECIOS_BD = [];

function datosDe(t) {
  if (t === "productos")          return PRODUCTOS_BD;
  if (t === "ofertas_piladora")   return OFERTAS_BD;
  if (t === "v_ofertas_vigentes") return OFERTAS_BD.filter(o => o.activo && !o.vigente_hasta && o.vigente_desde <= HOY);
  if (t === "proveedores")        return PROVEEDORES_BD;
  if (t === "clientes")           return CLIENTES_BD;
  if (t === "ubicaciones_cliente")return UBIC_BD;
  if (t === "precios")            return PRECIOS_BD;
  if (t === "presentaciones")     return [];
  if (t === "pedidos")            return [{ ped_id:"PD-0012" }];
  if (t === "usuarios")           return [{ usr_id:"SC1", auth_uid:"u1", nombre:"Carlos Andrade", rol:"comisionista", activo:true }];
  return [];
}

function montar(opciones) {
  const op = opciones || {};
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";

  const pedidas = [];
  const escrito = { pedidos:[], items:[], borrados:[] };
  /* La consulta de mentira RESPETA los filtros: el pedido saca los productos de
     baja con `.eq("estado","activo")`, y si aquí se ignorara el filtro la prueba
     estaría midiendo otra cosa. */
  function consulta(tabla, filtros) {
    const rota = op.tablaRota === tabla;
    const resolver = () => {
      if (rota) return Promise.resolve({ data:null, error:{ message:"permission denied for table " + tabla, code:"42501" } });
      let filas = datosDe(tabla).slice();
      filtros.forEach(f => {
        if (f[0] === "eq")  filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq") filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "is")  filas = filas.filter(r => (f[2] === null ? r[f[1]] == null : r[f[1]] === f[2]));
        if (f[0] === "in")  filas = filas.filter(r => (f[2] || []).indexOf(r[f[1]]) >= 0);
      });
      return Promise.resolve({ data:filas, error:null, count:filas.length });
    };
    const con = (t, c, v) => consulta(tabla, filtros.concat([[t, c, v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, range:()=>enc, filter:()=>enc,
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), is:(c,v)=>con("is",c,v), in:(c,v)=>con("in",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      insert:(f)=>{
        if (tabla === "pedidos")      escrito.pedidos.push(f);
        if (tabla === "pedido_items") escrito.items.push(f);
        return Promise.resolve({ error:null });
      },
      upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => r; return r; },
      delete:()=>({ eq:(c,v)=>{ escrito.borrados.push(v); return Promise.resolve({ error:null }); } }),
    };
    return enc;
  }
  w.SB = {
    auth: {
      getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"carlos@ejemplo.com" }, expires_at: Math.floor(Date.now()/1000)+3600 } } }),
      refreshSession: async () => ({ data:{ session:null } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => { pedidas.push(t); return consulta(t, []); },
    rpc: async () => ({ data:null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(op.js, ctx);
  return { ctx, pedidas, escrito, w };
}

/* ── La pantalla, manejada como la maneja el vendedor ── */
function pintar(m) {
  vm.runInContext(`
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(Pedido, {
        toast:function(){}, prodInicial:null, onConsumir:function(){}, go:function(){},
        irGuardado:function(){}, onGuardarPedido:function(){},
        cliInicial:null, onConsumirCli:function(){}, onCobrar:function(){} }));
    });
    window.__txt = function(){ return window.__c.textContent || ""; };
    window.__buscador = function(nombre){
      var cajas = window.__c.querySelectorAll(".ss input");
      for (var i=0;i<cajas.length;i++){
        var ph = (cajas[i].getAttribute("placeholder")||"").toLowerCase();
        if (ph.indexOf(nombre.toLowerCase()) >= 0) return cajas[i];
      }
      return null;
    };
    window.__escribir = function(caja, texto){
      if (!caja) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
    window.__opciones = function(){
      var op = window.__c.querySelectorAll(".opt"), r = [];
      for (var i=0;i<op.length;i++) r.push(op[i].textContent||"");
      return r.join(" ｜ ");
    };
    /* La ficha del producto pinta el NOMBRE y la PRESENTACIÓN en dos renglones
       distintos, sin separador: se busca la opción que contenga TODAS las partes. */
    window.__casa = function(txt, partes){
      for (var j=0;j<partes.length;j++) if (txt.indexOf(partes[j]) < 0) return false;
      return true;
    };
    window.__tocarOpcion = function(partes){
      if (typeof partes === "string") partes = [partes];
      var op = window.__c.querySelectorAll(".opt");
      for (var i=0;i<op.length;i++){
        if (window.__casa(op[i].textContent||"", partes)){
          op[i].dispatchEvent(new window.MouseEvent("mousedown",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
    window.__cuentaOpciones = function(partes){
      if (typeof partes === "string") partes = [partes];
      var op = window.__c.querySelectorAll(".opt"), n = 0;
      for (var i=0;i<op.length;i++) if (window.__casa(op[i].textContent||"", partes)) n++;
      return n;
    };
    window.__elegir = function(campo, texto){
      var caja = window.__buscador(campo);
      if (!caja) return "no está el buscador de " + campo;
      window.__escribir(caja, texto);
      return null;
    };
    /* OJO: la casilla de CANTIDAD comparte la clase .precio-in (es solo estilo).
       La del precio es la que vive dentro de la tarjeta 💵 Precio. */
    window.__precio = function(){
      var i = window.__c.querySelector(".tp-precio input.precio-in");
      return i ? String(i.value) : null;
    };
  `, m.ctx);
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);
async function elegir(m, campo, texto, tocar) {
  const err = corre(m, `window.__elegir(${JSON.stringify(campo)}, ${JSON.stringify(texto)})`);
  if (err) return err;
  await esperar(80);
  const ok = corre(m, `window.__tocarOpcion(${JSON.stringify(tocar || texto)})`);
  await esperar(80);
  return ok ? null : "no apareció la opción " + (tocar || texto);
}

/* ══ La batería. Se corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  const m = montar({ js });

  /* ── A) El catálogo del pedido, mirado por dentro ── */
  let cat = null;
  try {
    cat = corre(m, `construirCatalogoPedido(
      ${JSON.stringify(PROVEEDORES_BD)}, ${JSON.stringify(OFERTAS_BD)}, ${JSON.stringify(PRODUCTOS_BD)}, [])`);
  } catch (e) { cat = null; }
  const pres = (cat && cat.pres) ? Array.from(cat.pres) : [];
  const buscar = (prodId, cod, prov) => pres.find(p =>
    p.prodId === prodId && p.presCod === cod && (!prov || p.provId === prov)) || null;
  const crecQQ  = buscar("P-00197", "QQ",  "AGU");
  const crecARR = buscar("P-00197", "ARR", "AGU");

  comprobar("«Arroz Crecedor» se puede PEDIR aunque no tenga ni una fila en `precios`",
    pres.some(p => p.prodId === "P-00197"));
  comprobar("se pueden pedir sus DOS presentaciones: quintal y arroba",
    !!crecQQ && !!crecARR);
  comprobar("el quintal de Crecedor se pide a $37,00 de contado (precio de ESA presentación)",
    !!crecQQ && crecQQ.baseContado === 37);
  comprobar("y a crédito, $38,00",
    !!crecQQ && crecQQ.baseCredito === 38);
  comprobar("la ARROBA de Crecedor se pide a $9,25, no al precio del quintal ($37,00)",
    !!crecARR && crecARR.baseContado === 9.25);
  comprobar("la arroba NO se multiplicó por su equivalencia (no queda en $2,31)",
    !!crecARR && crecARR.baseContado !== 2.31 && crecARR.baseContado !== 2.3125);
  comprobar("la arroba a crédito, $9,50",
    !!crecARR && crecARR.baseCredito === 9.5);
  comprobar("la arroba conserva su equivalencia (0,25 qq): el pedido se guarda en quintales",
    !!crecARR && crecARR.equiv === 0.25);
  comprobar("el quintal conserva su equivalencia (1 qq)",
    !!crecQQ && crecQQ.equiv === 1);
  comprobar("el producto SIN MARCA lleva su nombre en la línea, nunca en blanco",
    !!crecQQ && crecQQ.nombre === "Arroz Crecedor · Quintal" && crecQQ.marca === "Arroz Crecedor");
  const claves = pres.map(p => p.id + "|" + p.provId);
  comprobar("no se duplica: una sola línea por piladora + producto + presentación",
    claves.length > 0 && new Set(claves).size === claves.length);
  comprobar("cada piladora muestra SU precio: San Agustín $19,00 y Cordero $21,00 el mismo quintal",
    (buscar("P-00001","QQ","AGU")||{}).baseContado === 19 &&
    (buscar("P-00001","QQ","COR")||{}).baseContado === 21);
  comprobar("dos ofertas vivas de la MISMA piladora: manda la más barata ($21,00, no $25,00)",
    pres.every(p => p.baseContado !== 25));
  comprobar("la oferta VENCIDA no se puede pedir (nadie queda en $1,00)",
    pres.every(p => p.baseContado !== 1));
  comprobar("la oferta INACTIVA no se puede pedir (nadie queda en $2,00)",
    pres.every(p => p.baseContado !== 2));
  comprobar("la oferta que aún NO rige no se puede pedir (nadie queda en $3,00)",
    pres.every(p => p.baseContado !== 3));
  comprobar("el producto dado de baja no se puede pedir aunque tenga oferta viva",
    !pres.some(p => p.prodId === "P-BAJA"));
  comprobar("el costo de la piladora sigue viajando con la línea (de ahí sale el margen)",
    !!crecQQ && crecQQ.costo === 34);
  comprobar("la oferta sin equivalencia no se cuela (no se podría pasar a quintales)",
    !pres.some(p => p.presCod === "SAC"));

  /* ── B) La carga contra la base ── */
  pintar(m);
  await esperar(400);
  comprobar("la carga del pedido consulta `ofertas_piladora`",
    m.pedidas.indexOf("ofertas_piladora") >= 0);
  comprobar("la carga del pedido YA NO consulta la tabla `precios`",
    m.pedidas.indexOf("precios") < 0);

  /* ── C) La pantalla, como la usa el vendedor ── */
  let e = await elegir(m, "cliente", "ROCELUMA CIA LTDA");
  const eProv = e ? "no se llegó a la piladora" : await elegir(m, "proveedor", "San Agustín", "San Agustín");
  comprobar("con la base viva se puede elegir cliente y piladora" + (e || eProv ? " → " + (e || eProv) : ""),
    !e && !eProv);
  corre(m, `window.__escribir(window.__buscador("producto"), "crecedor")`);
  await esperar(120);
  comprobar("elegida Piladora San Agustín, «Arroz Crecedor» aparece entre lo que se puede pedir",
    corre(m, `window.__cuentaOpciones(["Arroz Crecedor"])`) > 0);
  comprobar("y aparecen SUS DOS presentaciones, una sola vez cada una",
    corre(m, `window.__cuentaOpciones(["Arroz Crecedor","Quintal"])`) === 1 &&
    corre(m, `window.__cuentaOpciones(["Arroz Crecedor","Arroba"])`) === 1);

  const tomoQQ = corre(m, `window.__tocarOpcion(["Arroz Crecedor","Quintal"])`);
  await esperar(150);
  comprobar("se puede tomar el QUINTAL de Arroz Crecedor", !!tomoQQ);
  comprobar("y la app propone $38,00 — el precio de esa presentación, no el del quintal calculado",
    corre(m, `window.__precio()`) === "38.00");
  comprobar("la tarjeta muestra la base de esa presentación: «Pb. 38.00»",
    /Pb\. 38\.00/.test(corre(m, `window.__txt()`)));

  const m2 = montar({ js });
  pintar(m2);
  await esperar(400);
  await elegir(m2, "cliente", "ROCELUMA CIA LTDA");
  await elegir(m2, "proveedor", "San Agustín", "San Agustín");
  corre(m2, `window.__escribir(window.__buscador("producto"), "crecedor")`);
  await esperar(120);
  corre(m2, `window.__tocarOpcion(["Arroz Crecedor","Arroba"])`);
  await esperar(150);
  comprobar("tomada la ARROBA, la app propone $9,50 y no el precio del quintal",
    corre(m2, `window.__precio()`) === "9.50");

  /* ── D) Lo que se guarda: el pedido viaja al sistema en QUINTALES ── */
  const g = montar({ js });
  vm.runInContext(`CLI_ID_DE["ROCELUMA CIA LTDA"] = "CLI-A";`, g.ctx);
  let guardado = null;
  try {
    guardado = await vm.runInContext(`guardarPedidoEnBase({
      cli:{nombre:"ROCELUMA CIA LTDA"}, prov:{id:"AGU"}, retiro:true,
      carrito:[
        { prod:${JSON.stringify(crecQQ)},  prodNombre:"Arroz Crecedor · Quintal",
          cant:50, precio:${crecQQ ? crecQQ.baseCredito : 0}, tipo:"P1", credito:true, gratis:0, comisionTotal:0 },
        { prod:${JSON.stringify(crecARR)}, prodNombre:"Arroz Crecedor · Arroba",
          cant:8,  precio:${crecARR ? crecARR.baseContado : 0}, tipo:"P2", credito:false, gratis:0, comisionTotal:0 }
      ] })`, g.ctx);
  } catch (er) { guardado = null; }
  const items = (g.escrito.items[0]) || [];
  comprobar("el pedido de Arroz Crecedor llega a la base",
    !!guardado && guardado.ok === true && items.length === 2);
  comprobar("50 quintales se guardan como 50 qq a $38,00 el quintal",
    !!items[0] && items[0].cantidad_qq === 50 && items[0].precio_usd === 38);
  comprobar("8 arrobas se convierten a 2 quintales (el total en quintales sigue saliendo bien)",
    !!items[1] && items[1].cantidad_qq === 2);
  comprobar("y la arroba de $9,25 se lleva a $37,00 el quintal",
    !!items[1] && items[1].precio_usd === 37);

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  ["el pedido vuelve a leer la tabla `precios`",
    `window.SB.from("ofertas_piladora")
            .select("prod_id,pres_cod,presentacion,equiv_qq,prov_cod,costo,costo_contado,precio_contado,precio_credito,activo,vigente_desde,vigente_hasta")`,
    `window.SB.from("precios")
            .select("prod_id,base_contado,base_credito")`],
  /* el ancla lleva la línea de abajo pegada: «if(o.activo === false) return;»
     suelto también aparece en otro módulo de freelance-completo */
  ["se le olvida mirar si la oferta sigue activa",
    `if(o.activo === false) return;
    if(o.vigente_desde`, `if(false) return;
    if(o.vigente_desde`],
  ["se le olvida la fecha en que la oferta empieza a regir",
    `if(o.vigente_desde && String(o.vigente_desde).slice(0,10) >  hoyISO) return;`, ``],
  ["se le olvida la fecha en que la oferta deja de regir",
    `if(o.vigente_hasta && String(o.vigente_hasta).slice(0,10) <= hoyISO) return;`, ``],
  ["cobra el precio POR QUINTAL en la línea (divide por equiv_qq)",
    `baseContado:r2(pc), baseCredito:r2(pk),`, `baseContado:r2(pc/eq), baseCredito:r2(pk/eq),`],
  ["multiplica el precio por equiv_qq, como cuando venía de `precios`",
    `baseContado:r2(pc), baseCredito:r2(pk),`, `baseContado:r2(pc*eq), baseCredito:r2(pk*eq),`],
  ["no agrupa: dos ofertas vivas de la misma piladora salen duplicadas",
    `const clave=o.prod_id+"-"+o.pres_cod+"|"+(o.prov_cod||"");`,
    `const clave=o.prod_id+"-"+o.pres_cod+"|"+(o.prov_cod||"")+"|"+o.precio_contado;`],
  ["se queda con la última oferta en vez de la más barata",
    `if(ya && ya.baseContado <= r2(pc)) return;`, `if(false) return;`],
  ["el producto sin marca se queda en blanco",
    `nomDe[p.prod_id]=p.nombre||p.marca||p.prod_id;`, `nomDe[p.prod_id]=p.marca||"";`],
  ["el producto dado de baja se cuela en el pedido",
    `const nom=nomDe[o.prod_id];`, `const nom=nomDe[o.prod_id]||o.prod_id;`],
  ["deja de mirar el estado del producto (confía en que quien llame filtre)",
    `if(p.estado && p.estado!=="activo") return;`, `if(false) return;`],
  ["se pierde la equivalencia en quintales de la presentación",
    `equiv:eq, provId:o.prov_cod,`, `equiv:1, provId:o.prov_cod,`],
];

(async () => {
  console.log("═══ El pedido sale de las ofertas · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
      (ok + mal - 1) + ". Alguna se perdió o se agregó sin declararla.");
  }

  /* ── Nace roja: se rompe la regla y se comprueba que la prueba se cae ── */
  console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
  if (MUTANTES.length !== MUTANTES_ESPERADOS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + MUTANTES_ESPERADOS + " mutantes y hay " + MUTANTES.length + ".");
  }
  for (const [nombre, de, a] of MUTANTES) {
    const veces = jsx.split(de).length - 1;
    if (veces !== 1) {
      mal++;
      console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
      continue;
    }
    const mutado = jsx.replace(de, a);
    let res;
    try { res = await bateria(R.Babel.transform(mutado, { presets:["react"] }).code, false); }
    catch (e) { res = { mal:1, fallos:["reventó: " + e.message] }; }
    if (res.mal > 0) {
      ok++;
      console.log(`  ✓ «${nombre}» → la prueba se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
    } else {
      mal++;
      console.log(`  ✗ «${nombre}» → la prueba PASA IGUAL: no está midiendo nada`);
    }
  }

  console.log("Resultado del pedido: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
