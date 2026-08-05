/* ═══════════════════════════════════════════════════════════════════════
   LA COTIZACIÓN SALE DE LAS OFERTAS, YA NO DE `precios`
   · socio-comercial y Comisionista

   Qué se rompía: el sistema web dejó de escribir en `precios`. Un producto
   creado hoy nace con sus ofertas en `ofertas_piladora` y CERO filas en
   `precios`. La cotización de socio-comercial seguía leyendo `precios`: el
   vendedor NO podía cotizar ese producto, ni siquiera lo veía en la lista.
   Medido contra producción el 05/08/2026 (ztpwtddrblfvcnnhbevq):
   59 productos activos · 58 con fila vigente en `precios` · 59 con oferta
   vigente · 153 ofertas vigentes · 0 de demostración. El que faltaba era
   P-00197 «Arroz Crecedor»: activo, SIN MARCA, 2 presentaciones y 2 ofertas
   vivas de Piladora San Agustín ($37,00 contado / $38,00 crédito el quintal;
   la arroba, $9,25 / $9,50).

   EL PELIGRO DE ESTE CAMBIO ES EL PRECIO, y por eso media prueba lo vigila.
   Ojo, porque NO es la misma regla que en el Pedido:

     · en el PEDIDO la línea se cobra por la PRESENTACIÓN (un quintal, una
       arroba), así que `precio_contado` entra DIRECTO;
     · en la COTIZACIÓN la línea se cotiza en QUINTALES —la pantalla pide
       «Quintales de…» y el WhatsApp dice «40 qq × $38,00»—, así que cada
       oferta se pasa a precio POR QUINTAL (precio ÷ equiv_qq). La arroba de
       $9,25 con equivalencia 0,25 vale $37,00 el quintal, NO $9,25.

   Confundir las dos reglas saca cotizaciones con importes falsos y nadie lo
   nota hasta que el cliente reclama la factura. Por eso aquí se comprueban
   las dos caras: que el quintal salga a $37,00 y que la arroba NO se cuele
   como si fuera el precio del quintal.

   Lo que fija esta prueba:
     · un producto con oferta y SIN fila en `precios` se puede COTIZAR;
     · sale UNA sola vez aunque tenga varias presentaciones y varias piladoras;
     · cuando varias piladoras lo surten, manda el MÁS BARATO;
     · el precio de la línea es el del QUINTAL, con la equivalencia aplicada;
     · el total en quintales y el total en dólares cuadran, y el WhatsApp
       lleva lo mismo que la pantalla;
     · lo vencido, lo inactivo y lo que aún no rige NO se cotiza;
     · un producto dado de baja no se cotiza aunque tenga oferta viva;
     · un producto SIN MARCA sale con su nombre, nunca en blanco;
     · el buscador mira el nombre del producto Y la piladora, y el texto de
       ayuda dice la verdad.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Entre los mutantes hay
   dos TONTOS Y DIRECTOS (sumarle un dólar al precio), porque un mutante
   "inteligente" puede quedar neutralizado por los datos —multiplicar por una
   equivalencia que vale 1 no cambia nada— y entonces parece que la prueba no
   mide cuando el malo es el mutante. Si un mutante pasa entero, se dice a
   gritos en vez de suponer que la prueba está mal.

   Uso: node test_cotiza_ofertas.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("socio-comercial");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una prueba que se borra sin querer no pase inadvertida. ── */
const ESPERADAS = 27;
const MUTANTES_ESPERADOS = 13;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 120));
/* fecha LOCAL, la del teléfono: la misma regla que usa la app */
const dia = (n) => { const d = new Date(Date.now() + n * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
const HOY = dia(0), AYER = dia(-1), MANANA = dia(1);

/* ══ La base de prueba, con la forma de producción ══ */
const PRODUCTOS_BD = [
  /* el huérfano de verdad: SIN MARCA y sin una sola fila en `precios`.
     Su etiqueta `proveedor` miente, como en producción (141 de 149 dicen
     "POR ASIGNAR"): quien manda es la oferta. */
  { prod_id:"P-00197", nombre:"Arroz Crecedor", marca:null, linea:"Arroz",
    proveedor:"POR ASIGNAR", estado:"activo" },
  /* lo surten DOS piladoras y a distinto precio: se dice cuántas, no una al azar */
  { prod_id:"P-00001", nombre:"Arrocillo Envejecido", marca:"Arrocillo", linea:"Arroz",
    proveedor:"POR ASIGNAR", estado:"activo" },
  /* dado de baja: aunque tenga oferta viva, no se cotiza */
  { prod_id:"P-BAJA", nombre:"Arroz Retirado", marca:"Retirado", linea:"Arroz",
    proveedor:"POR ASIGNAR", estado:"inactivo" },
  /* su única oferta ya venció: no se ofrece un precio que no existe */
  { prod_id:"P-VIE", nombre:"Arroz Precio Viejo", marca:"Precio Viejo", linea:"Arroz",
    proveedor:"POR ASIGNAR", estado:"activo" },
];

const OFERTAS_BD = [
  /* Arroz Crecedor: una piladora, dos presentaciones. CERO filas en `precios`.
     La arroba pasada a quintal da lo mismo que el quintal ($9,25 ÷ 0,25 = $37):
     si alguien la metiera DIRECTA, el producto se cotizaría a $9,25 el qq. */
  { prod_id:"P-00197", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"AGU", precio_contado:37.00, precio_credito:38.00, activo:true, vigente_desde:HOY,  vigente_hasta:null },
  { prod_id:"P-00197", pres_cod:"ARR", presentacion:"Arroba",  equiv_qq:0.25, prov_cod:"AGU", precio_contado:9.25,  precio_credito:9.50,  activo:true, vigente_desde:HOY,  vigente_hasta:null },
  /* Arrocillo: San Agustín $19,00 el qq y Cordero $21,00 → manda el barato.
     Su arroba a $4,75 son $19,00 el qq: metida directa, se desplomaría a $4,75. */
  { prod_id:"P-00001", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"AGU", precio_contado:19.00, precio_credito:20.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"COR", precio_contado:21.00, precio_credito:22.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"ARR", presentacion:"Arroba",  equiv_qq:0.25, prov_cod:"AGU", precio_contado:4.75,  precio_credito:5.00,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* tres trampas baratas: si alguna entra, el precio se desploma y se nota */
  { prod_id:"P-00001", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", precio_contado:1.00, precio_credito:1.00, activo:true,  vigente_desde:"2026-01-01", vigente_hasta:AYER },
  { prod_id:"P-00001", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", precio_contado:2.00, precio_credito:2.00, activo:false, vigente_desde:AYER,         vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", precio_contado:3.00, precio_credito:3.00, activo:true,  vigente_desde:MANANA,       vigente_hasta:null },
  /* el dado de baja sí tiene oferta viva: lo que lo saca es el producto */
  { prod_id:"P-BAJA", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", precio_contado:10.00, precio_credito:10.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* el producto vivo cuya única oferta venció */
  { prod_id:"P-VIE",  pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", precio_contado:99.00, precio_credito:99.00, activo:true, vigente_desde:"2026-01-01", vigente_hasta:AYER },
];

const PROVEEDORES_BD = [
  { prov_cod:"AGU", nombre:"Piladora San Agustín" },
  { prov_cod:"COR", nombre:"Piladora Cordero" },
];
const CLIENTES_BD = [
  { cli_id:"CLI-A", nombre:"ROCELUMA CIA LTDA", razon_social:"ROCELUMA CIA LTDA", ruc:"19347672001",
    tel:"967897120", tel2:null, plazo:30, condicion_pago:"Crédito", activo:true },
];
const UBIC_BD = [
  { cli_id:"CLI-A", ciudad:"Cuenca", direccion:"Mariscal Lamar 2-59", principal:true },
];
const ORG_BD = [{ nombre:"Richard Ramírez Salazar", ruc:"0919927533001", tel:"0997521936", correo:"intesgo@gmail.com" }];
/* Una sola fila ENVENENADA en `precios`: si la cotización volviera a leer esa
   tabla, la lista se llenaría de basura a $999 y esta prueba se caería sola. */
const PRECIOS_BD = [
  { prod_id:"P-VENENO", producto:"NO USAR", base_contado:999, base_credito:999, vigente_hasta:null },
];

function datosDe(t) {
  if (t === "productos")           return PRODUCTOS_BD;
  if (t === "ofertas_piladora")    return OFERTAS_BD;
  if (t === "v_ofertas_vigentes")  return OFERTAS_BD.filter(o => o.activo && !o.vigente_hasta && o.vigente_desde <= HOY);
  if (t === "proveedores")         return PROVEEDORES_BD;
  if (t === "clientes")            return CLIENTES_BD;
  if (t === "ubicaciones_cliente") return UBIC_BD;
  if (t === "organizaciones")      return ORG_BD;
  if (t === "precios")             return PRECIOS_BD;
  if (t === "usuarios")            return [{ usr_id:"SC1", auth_uid:"u1", nombre:"Carlos Andrade", rol:"comisionista", activo:true }];
  return [];
}

function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.navigator.vibrate = () => {};
  const impresiones = [];
  w.print = () => impresiones.push(1);
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";

  const pedidas = [];
  /* La consulta de mentira RESPETA los filtros: `yoUsuario` busca su fila con
     .eq("auth_uid", …) y si aquí se ignorara, la prueba mediría otra cosa. */
  function consulta(tabla, filtros) {
    const resolver = () => {
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
      insert:()=>Promise.resolve({ error:null }), upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => r; return r; },
      delete:()=>({ eq:()=>Promise.resolve({ error:null }) }),
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
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
  return { ctx, pedidas, impresiones, w };
}

/* ── La pantalla, manejada como la maneja el vendedor ── */
function pintar(m) {
  vm.runInContext(`
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(Cotizacion, { toast:function(){} }));
    });
    window.__txt = function(){ return window.__c.textContent || ""; };
    window.__tocar = function(texto){
      var bs = window.__c.querySelectorAll("button, a");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto) >= 0){ bs[i].click(); return true; } }
      return false;
    };
    window.__cuentaBotones = function(texto){
      var bs = window.__c.querySelectorAll("button"), n = 0;
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto) >= 0) n++; }
      return n;
    };
    window.__escribir = function(marcador, valor){
      var ins = window.__c.querySelectorAll("input");
      for(var i=0;i<ins.length;i++){
        if((ins[i].placeholder||"").indexOf(marcador) >= 0 || (ins[i].getAttribute("aria-label")||"").indexOf(marcador) >= 0){
          var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
          set.call(ins[i], valor);
          ins[i].dispatchEvent(new window.Event("input",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
    /* el texto de ayuda del buscador de productos, tal como lo lee el vendedor */
    window.__ayudaProducto = function(){
      var ins = window.__c.querySelectorAll("input"), r = "";
      for(var i=0;i<ins.length;i++){
        var ph = ins[i].placeholder || "";
        if(/producto/i.test(ph)) r = ph;
      }
      return r;
    };
    window.__enlaceWhats = function(){
      var a = window.__c.querySelector('a[href^="https://wa.me/"]');
      return a ? decodeURIComponent(a.getAttribute("href").replace("https://wa.me/?text=","")) : "";
    };
  `, m.ctx);
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);
const txt = (m) => corre(m, "window.__txt()");
const tocar = (m, t) => corre(m, `window.__tocar(${JSON.stringify(t)})`);
const escribir = (m, k, v) => corre(m, `window.__escribir(${JSON.stringify(k)}, ${JSON.stringify(v)})`);

/* ══ La batería. Se corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ── A) La lista de la cotización, mirada por dentro ── */
  const a = montar(js);
  let base = null;
  try { base = await corre(a, "cargarBaseCotiza()"); } catch (e) { base = null; }
  const prods = (base && base.productos) ? Array.from(base.productos) : [];
  const de = (id) => prods.find(p => p.id === id) || null;
  const crec = de("P-00197"), arroc = de("P-00001");

  comprobar("«Arroz Crecedor» se puede COTIZAR aunque no tenga ni una fila en `precios`",
    !!crec);
  comprobar("sale UNA sola vez aunque tenga dos presentaciones",
    prods.filter(p => p.id === "P-00197").length === 1);
  comprobar("el producto SIN MARCA lleva su nombre, nunca en blanco",
    !!crec && crec.nombre === "Arroz Crecedor");
  comprobar("el quintal de Crecedor se cotiza a $37,00 de contado",
    !!crec && crec.contado === 37);
  comprobar("y a crédito, $38,00",
    !!crec && crec.credito === 38);
  comprobar("la ARROBA de $9,25 no se cuela como si fuera el precio del quintal",
    !!crec && crec.contado !== 9.25 && crec.credito !== 9.5);
  comprobar("dice qué piladora lo surte de verdad, no la etiqueta «POR ASIGNAR»",
    !!crec && crec.piladora === "Piladora San Agustín");
  comprobar("si lo tienen dos piladoras, lo dice sin escoger una al azar",
    !!arroc && arroc.piladora === "2 piladoras lo tienen");
  comprobar("entre dos piladoras manda el MÁS BARATO ($19,00, no $21,00)",
    !!arroc && arroc.contado === 19 && arroc.credito === 20);
  comprobar("la arroba se pasa a quintal por su equivalencia ($4,75 la arroba = $19,00 el qq)",
    !!arroc && arroc.contado !== 4.75);
  comprobar("la oferta VENCIDA no se cotiza (nadie queda en $1,00)",
    prods.every(p => p.contado !== 1));
  comprobar("la oferta INACTIVA no se cotiza (nadie queda en $2,00)",
    prods.every(p => p.contado !== 2));
  comprobar("la oferta que aún NO rige no se cotiza (nadie queda en $3,00)",
    prods.every(p => p.contado !== 3));
  comprobar("el producto dado de baja no se cotiza aunque tenga oferta viva",
    !prods.some(p => p.id === "P-BAJA"));
  comprobar("el producto cuya única oferta venció no se ofrece",
    !prods.some(p => p.id === "P-VIE"));
  const ids = prods.map(p => p.id);
  comprobar("ningún producto sale repetido en la lista",
    ids.length > 0 && new Set(ids).size === ids.length);

  /* ── B) La pantalla, como la usa el vendedor ── */
  const m = montar(js);
  pintar(m);
  await esperar(450);
  let t = txt(m);

  comprobar("la cotización consulta `ofertas_piladora`",
    m.pedidas.indexOf("ofertas_piladora") >= 0);
  comprobar("la cotización YA NO consulta la tabla `precios`",
    m.pedidas.indexOf("precios") < 0);
  comprobar("con sesión trabaja con datos vivos", /Datos vivos/.test(t));

  escribir(m, "nombre, RUC o ciudad", "roceluma");
  await esperar(150);
  tocar(m, "ROCELUMA");
  await esperar(150);

  escribir(m, "producto", "crecedor");
  await esperar(150);
  comprobar("el buscador encuentra por el NOMBRE del producto y lo ofrece una sola vez",
    corre(m, `window.__cuentaBotones("Arroz Crecedor")`) === 1);
  comprobar("el texto de ayuda dice la verdad: también se busca por piladora",
    /piladora/i.test(corre(m, "window.__ayudaProducto()")));

  tocar(m, "Arroz Crecedor");
  await esperar(200);
  escribir(m, "Quintales de Arroz Crecedor", "40");
  await esperar(200);
  t = txt(m);
  /* 40 × 38,00 (crédito, la condición que ROCELUMA ya tiene acordada) = 1.520 */
  comprobar("40 quintales de Crecedor a crédito suman $1.520,00", /\$1\.520,00/.test(t));
  tocar(m, "De contado");
  await esperar(200);
  /* 40 × 37,00 = 1.480 */
  comprobar("de contado el total baja a $1.480,00", /\$1\.480,00/.test(txt(m)));
  tocar(m, "A crédito");
  await esperar(200);

  escribir(m, "producto", "agustín");
  await esperar(150);
  comprobar("el buscador encuentra también por la PILADORA que surte",
    corre(m, `window.__cuentaBotones("Arrocillo Envejecido")`) === 1);
  tocar(m, "Arrocillo Envejecido");
  await esperar(220);
  t = txt(m);
  /* 40 qq + 10 qq = 50 qq · 1.520 + 10×20,00 = 1.720 */
  comprobar("el total en quintales suma bien: 50 quintales", /50 quintales/.test(t));
  comprobar("y el total en dólares, $1.720,00", /\$1\.720,00/.test(t));

  tocar(m, "Ver cotización");
  await esperar(300);
  const whats = corre(m, "window.__enlaceWhats()");
  comprobar("el WhatsApp lleva el mismo total y el detalle del quintal de Crecedor",
    /\$1\.720,00/.test(whats) && /Arroz Crecedor: 40 qq × \$38,00/.test(whats));

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══
   Las dos primeras son TONTAS Y DIRECTAS a propósito (un dólar de más). Si
   ninguna de esas dos hace caer nada, la prueba no está mirando el precio. */
const MUTANTES = [
  ["TONTA · le suma un dólar al precio con el que se arma la lista",
    `contado: Math.round(g.contado * 100) / 100,`,
    `contado: Math.round(g.contado * 100) / 100 + 1,`],
  ["TONTA · le suma un dólar al precio que se cobra en la línea",
    `const precioDe = (p)=> condicion === "contado" ? p.contado : p.credito;`,
    `const precioDe = (p)=> (condicion === "contado" ? p.contado : p.credito) + 1;`],
  ["la cotización vuelve a leer la tabla `precios`",
    `window.SB.from("ofertas_piladora")
          .select("prod_id,pres_cod,presentacion,equiv_qq,prov_cod,precio_contado,precio_credito,activo,vigente_desde,vigente_hasta")
          .limit(4000),`,
    `window.SB.from("precios")
          .select("prod_id,producto,base_contado,base_credito,vigente_hasta")
          .limit(2000),`],
  ["se le olvida mirar si la oferta sigue activa",
    `o.activo !== false &&`, `true &&`],
  ["se le olvida la fecha en que la oferta empieza a regir",
    `(!o.vigente_desde || String(o.vigente_desde).slice(0,10) <= hoyISO) &&`, `true &&`],
  ["se le olvida la fecha en que la oferta deja de regir",
    `(!o.vigente_hasta || String(o.vigente_hasta).slice(0,10) >  hoyISO));`, `true);`],
  ["cobra el precio de la PRESENTACIÓN sin pasarlo a quintal (no divide por equiv_qq)",
    `const c = Number(o.precio_contado || 0) / eq;`, `const c = Number(o.precio_contado || 0);`],
  ["se queda con el precio MÁS CARO en vez del más barato",
    `if(c < g.contado){ g.contado = c; g.credito = k; }`,
    `if(c > g.contado){ g.contado = c; g.credito = k; }`],
  ["no agrupa por producto: el mismo grano sale una vez por presentación",
    `const g = porProd[o.prod_id] || (porProd[o.prod_id] = { contado:c, credito:k, provs:new Set() });`,
    `const g = (porProd[o.prod_id+"-"+o.pres_cod] = { contado:c, credito:k, provs:new Set() });`],
  ["el producto sin marca se queda en blanco",
    `return { id, nombre: d.nombre || d.marca || id,`, `return { id, nombre: d.marca || "",`],
  ["el producto dado de baja se cuela en la cotización",
    `if(!d || (d.estado && d.estado !== "activo")) return;`, `if(!d) return;`],
  ["la piladora sale con su código y no con su nombre",
    `const suyas = [...g.provs].map(pc => nProv[pc] || pc).filter(Boolean);`,
    `const suyas = [...g.provs].map(pc => pc).filter(Boolean);`],
  ["el buscador deja de mirar la piladora",
    `|| ((p.piladoras||p.piladora||"")).toLowerCase().includes(t);`, `;`],
];

(async () => {
  console.log("═══ La cotización sale de las ofertas · " + nombreApp);
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
  for (const [nombre, dede, aa] of MUTANTES) {
    const veces = jsx.split(dede).length - 1;
    if (veces !== 1) {
      mal++;
      console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
      continue;
    }
    const mutado = jsx.replace(dede, aa);
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

  console.log("Resultado de la cotización: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
