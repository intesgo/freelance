/* PED_TESTS_PARIDAD */
/* ═══════════════════════════════════════════════════════════════════════
   EL CUPO DE CRÉDITO SALE DE LOS DATOS REALES (clientes.cupo + cartera),
   NO DE UN TEXTO, Y NO TRANCA EL PEDIDO
   · Comisionista (app del vendedor)  ·  paridad con sistema-web

   Anclas del código: PED_CUPO_VIVO_PARIDAD.

   QUÉ CAMBIÓ EN LAS APPS: al armar un pedido en VIVO (con sesión y datos de la
   base), el cupo y lo «usado» del cliente ya NO salen de la ficha estática
   FICHA_CLIENTE. Se arma una ficha viva por nombre de cliente:
       FICHA_VIVA_PED[nombre] = {
         cupo:  clientes.cupo,
         debe:  Σ cartera_cliente.monto   (solo estado==="pendiente" y es_demo===false)
       }
   y el control de cupo lee de esa ficha viva. El Sistema Web hace lo mismo:
   arma cada cliente con usado = la MISMA suma de cartera pendiente (no demo),
   no clientes.usado. Así app y web dan el MISMO número, al centavo, del mismo
   dato.

   Reglas de negocio que esta prueba amarra (montando la pantalla de verdad y
   tocándola como el vendedor):

   1) Una línea de CONTADO (P2) NO ocupa el cupo del cliente. El cupo es un
      crédito: lo que se paga de una no compromete nada. Así que en una venta
      de contado NO debe salir el recuadro de cupo ni la etiqueta «con
      autorización», por grande que sea el monto.

   2) Una línea a CRÉDITO (P1) que SUPERA el cupo del cliente igual se puede
      ARMAR: el vendedor toma el pedido y queda «pendiente de autorización del
      freelance» para ampliar el crédito. Nunca se bloquea el botón por exceder
      el cupo: bloquearlo sería perder la venta en el campo.

   3) El número es REAL: cupo $3.000 (de clientes.cupo) y usado $1.500 (suma de
      la cartera PENDIENTE, no demo: dos movimientos 1.200 + 300; se EXCLUYEN
      una fila «pagada» y una fila «es_demo»). Con eso, una línea a crédito de
      $2.000 EXCEDE (1.500 + 2.000 = 3.500 > 3.000) pero una de $1.000 NO
      (1.500 + 1.000 = 2.500 < 3.000). Si el usado saliera en 0, la de $2.000
      no excedería: por eso el monto de la línea distingue «usado=1.500 de la
      cartera» de «usado=0».

   4) Cliente bloqueado: la consulta en vivo trae SOLO clientes no bloqueados
      (.eq("bloqueado",false)), así que un cliente bloqueado ni siquiera se
      ofrece en el buscador del armador: no se puede armar un pedido a su
      nombre.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Los mutantes tocan
   justo el origen del número (leer cupo/usado de FICHA_CLIENTE, o el usado de
   clientes.usado en vez de la cartera) y la regla del contado.

   PARIDAD WEB: además se renderiza PedidosWeb del Sistema Web (JSDOM, sin modo
   demo) con los MISMOS clientes (cupo 3.000) y la MISMA cartera, y se comprueba
   que el web calcula el MISMO usado (1.500): la opción del cliente muestra
   «Cupo disponible $1.500,00» y una línea a crédito cruza el mismo umbral de
   exceso que la app.

   NO SE ESCRIBE EN LA BASE DE VERDAD: los dobles de Supabase de aquí no tocan
   nada real.

   Uso: node test_paridad_cupo_app.js [ruta-app.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

const rutaWeb = R.app("sistema-web");
const htmlWeb = fs.readFileSync(rutaWeb, "utf-8");
const jsxWeb = htmlWeb.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones y mutantes se esperan. Se declara ANTES de correr
      para que una prueba borrada sin querer no pase inadvertida. ── */
const ESPERADAS = 10;        // batería de la app
const ESPERADAS_WEB = 4;     // paridad con el Sistema Web
const MUTANTES_ESPERADOS = 3;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

/* ══════════════════════════════════════════════════════════════════════
   FIXTURE DE LA APP · el cupo REAL sale de clientes.cupo + la cartera.
   El cliente se llama «Comercial Vela Import» a propósito: NO existe en
   FICHA_CLIENTE, así que si el código volviera a leer de FICHA_CLIENTE el
   cupo se cae a 0 y la prueba lo caza. ══════════════════════════════════ */
const CLI_NOMBRE = "Comercial Vela Import";
const CLI_ID = "CLI-VELA";
const BLOQ_NOMBRE = "Bodega Morosa";
const CUPO = 3000;
const USADO = 1500;   // 1.200 + 300 de cartera pendiente (no demo)

const PRODUCTOS_BD = [
  { prod_id:"PROD-DEMO-B", nombre:"Producto Demo B", marca:null,
    linea:"Arroz", proveedor:"Proveedor Demo A", proveedor_cod:"PROV-DEMO-A", foto:null, estado:"activo" },
];
const AYER = (()=>{ const d=new Date(Date.now()-86400000);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); })();
/* precios REDONDOS ($10) para que el monto de la línea sea exacto:
   cant 200 → $2.000 (excede), cant 100 → $1.000 (no excede). */
const OFERTAS_BD = [
  { prod_id:"PROD-DEMO-B", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"PROV-DEMO-A",
    costo:5.00, costo_contado:5.00, margen_min:0, precio_contado:10.00, precio_credito:10.00,
    activo:true, vigente_desde:AYER, vigente_hasta:null },
];
const PROVEEDORES_BD = [ { prov_cod:"PROV-DEMO-A", nombre:"Proveedor Demo A", es_demo:false } ];
/* El cliente REAL trae su cupo (3.000). `usado` va en 0 a propósito: nadie lo
   actualiza en producción y el «usado» de verdad nace de la cartera. Así, si
   el código leyera clientes.usado, saldría 0 y la prueba lo caza.
   Un SEGUNDO cliente bloqueado: la consulta lo filtra (.eq bloqueado,false). */
const CLIENTES_BD = [
  { cli_id:CLI_ID, nombre:CLI_NOMBRE, razon_social:CLI_NOMBRE+" S.A.",
    es_demo:false, activo:true, bloqueado:false, cupo:CUPO, usado:0, plazo:30, motivo_bloqueo:null },
  { cli_id:"CLI-BLOQ", nombre:BLOQ_NOMBRE, razon_social:BLOQ_NOMBRE+" S.A.",
    es_demo:false, activo:true, bloqueado:true, cupo:1000, usado:0, plazo:30, motivo_bloqueo:"Cheque protestado" },
];
/* La CARTERA que define el «usado» real. Suma pendiente-no-demo = 1.200 + 300 =
   1.500. La fila «pagada» y la fila «es_demo» NO deben contar. */
const CARTERA_BD = [
  { cli_id:CLI_ID, monto:1200, estado:"pendiente", es_demo:false },
  { cli_id:CLI_ID, monto:300,  estado:"pendiente", es_demo:false },
  { cli_id:CLI_ID, monto:9999, estado:"pagada",    es_demo:false },   // EXCLUIDA (no pendiente)
  { cli_id:CLI_ID, monto:5000, estado:"pendiente", es_demo:true  },   // EXCLUIDA (es demo)
];
const UBIC_BD = [
  { ubic_id:"UBI-VELA", cli_id:CLI_ID, nombre:"Local Vela", principal:true, tipo_entrega:"domicilio",
    ciudad:"Ciudad Demo", direccion:"Dirección Demo", activo:true },
];

function datosDe(t) {
  if (t === "productos")           return PRODUCTOS_BD;
  if (t === "ofertas_piladora")    return OFERTAS_BD;
  if (t === "proveedores")         return PROVEEDORES_BD;
  if (t === "clientes")            return CLIENTES_BD;
  if (t === "cartera_cliente")     return CARTERA_BD;
  if (t === "ubicaciones_cliente") return UBIC_BD;
  if (t === "precios")             return [];
  if (t === "pedidos")             return [{ ped_id:"PED-DEMO-12" }];
  if (t === "usuarios")            return [{ usr_id:"USR-DEMO", auth_uid:"u1", nombre:"Usuario Demo", rol:"comisionista", activo:true }];
  return [];   // promociones, promocion_tramos, zonas, tarifas_fe… → vacío
}

function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";

  const pedidas = [];
  const escrito = { pedidos:[], items:[], borrados:[], rpc:[] };
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
      getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"usuario@example.invalid" }, expires_at: Math.floor(Date.now()/1000)+3600 } } }),
      refreshSession: async () => ({ data:{ session:null } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => { pedidas.push(t); return consulta(t, []); },
    rpc: async (nombre,args) => {
      if(nombre==="mi_org_activa") return {data:"ORG-001",error:null};
      if(nombre==="gratis_que_concede") return {data:null,error:null};
      if(nombre!=="registrar_pedido_atomico") return {data:null,error:null};
      escrito.rpc.push({nombre,args});
      return {data:[{ped_id:"PED-DEMO-13",repetido:false}],error:null};
    },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
  return { ctx, pedidas, escrito, w };
}

const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* ── La pantalla del pedido, montada como la ve el vendedor, con los mismos
      ayudantes que usa test_qq_carrito para tocarla. ── */
function pintar(m) {
  corre(m, `
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    window.__Envoltura = function(){
      var st = React.useState(1);
      return React.createElement(Pedido, {
        toast:function(){}, prodInicial:null, onConsumir:function(){}, go:function(){},
        irGuardado:function(){}, onGuardarPedido:function(){},
        cliInicial:null, onConsumirCli:function(){}, onCobrar:function(){},
        paso:st[0], setPaso:st[1] });
    };
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(window.__Envoltura));
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
    window.__elegir = function(campo, texto){
      var caja = window.__buscador(campo);
      if (!caja) return "no está el buscador de " + campo;
      window.__escribir(caja, texto);
      return null;
    };
    window.__cantidad = function(n){
      var i = window.__c.querySelector("input.qty-input");
      if (!i) return "no está la casilla de cantidad";
      window.__escribir(i, String(n));
      return null;
    };
    /* elige un tipo de precio por su código (P1, P2, …) tocando su chip */
    window.__tipo = function(id){
      var chips = window.__c.querySelectorAll(".tchip");
      for (var i=0;i<chips.length;i++){
        if ((chips[i].textContent||"").indexOf(id) >= 0){
          chips[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
    /* estado del botón «agregar al carrito»: null si no está, true/false si está y su disabled */
    window.__carritoDisabled = function(){
      var b = window.__c.querySelector(".cta-carrito");
      return b ? !!b.disabled : null;
    };
    /* ¿el botón «agregar» muestra la etiqueta «con autorización»? */
    window.__conAutorizacion = function(){
      var b = window.__c.querySelector(".cta-carrito");
      return !!(b && (b.textContent||"").indexOf("con autorización") >= 0);
    };
  `);
}

async function elegir(m, campo, texto, tocar) {
  const err = corre(m, `window.__elegir(${JSON.stringify(campo)}, ${JSON.stringify(texto)})`);
  if (err) return err;
  await esperar(90);
  const ok = corre(m, `window.__tocarOpcion(${JSON.stringify(tocar || texto)})`);
  await esperar(140);
  return ok ? null : "no apareció la opción " + (tocar || texto);
}

/* Arma la pantalla hasta tener cliente + proveedor + producto + cantidad, en el
   tipo pedido (P1 crédito por defecto; P2 contado si se pide). Devuelve lo que
   se ve: si el botón está deshabilitado, si dice «con autorización», el texto. */
async function armar(js, { contado, cant }) {
  const m = montar(js);
  pintar(m);
  await esperar(400);
  let paso = await elegir(m, "cliente", CLI_NOMBRE, CLI_NOMBRE);
  if (!paso) paso = await elegir(m, "proveedor", "Proveedor Demo A", "Proveedor Demo A");
  if (!paso) paso = await elegir(m, "producto", "producto demo b", ["Producto Demo B","Quintal"]);
  await esperar(120);
  if (!paso && contado) { if (!corre(m, `window.__tipo("P2")`)) paso = "no se pudo elegir Contado (P2)"; await esperar(140); }
  if (!paso) paso = corre(m, `window.__cantidad(${cant})`);
  await esperar(160);
  if (paso) return { paso };
  return {
    paso:null,
    disabled: corre(m, `window.__carritoDisabled()`),
    conAut:   corre(m, `window.__conAutorizacion()`),
    txt:      corre(m, `window.__txt()`),
  };
}

/* Intenta elegir un cliente por su nombre y devuelve el error (null si se pudo).
   Sirve para el cliente bloqueado: no debe aparecer como opción. */
async function intentarCliente(js, nombre) {
  const m = montar(js);
  pintar(m);
  await esperar(400);
  return await elegir(m, "cliente", nombre, nombre);
}

/* ══ La batería de la app. Se corre igual contra el código bueno y los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ── 1) CRÉDITO por ENCIMA del cupo: usado 1.500 + línea 2.000 = 3.500 > 3.000.
         200 qq a $10 = $2.000. Con usado=0 NO excedería: aquí sí, porque el
         usado real es 1.500 (de la cartera). ── */
  const cSobre = await armar(js, { contado:false, cant:200 });
  comprobar("CRÉDITO sobre el cupo: el botón «agregar» NO se bloquea (el pedido se puede armar)"
    + (cSobre.paso ? " → " + cSobre.paso : ""),
    !cSobre.paso && cSobre.disabled === false);
  comprobar("CRÉDITO sobre el cupo: el botón dice «con autorización» (queda por autorizar)"
    + (cSobre.paso ? " → " + cSobre.paso : ""),
    !cSobre.paso && cSobre.conAut === true);
  comprobar("CRÉDITO sobre el cupo: sale el aviso «pendiente de autorización del freelance»"
    + (cSobre.paso ? " → " + cSobre.paso : ""),
    !cSobre.paso && /pendiente de autorización del freelance/.test(cSobre.txt || ""));
  comprobar("CRÉDITO sobre el cupo: el medidor marca «Excedido»"
    + (cSobre.paso ? " → " + cSobre.paso : ""),
    !cSobre.paso && /Excedido/.test(cSobre.txt || ""));
  /* El NÚMERO es real: el recuadro muestra cupo $3.000,00 y deuda $1.500,00
     (usado de la cartera, no de FICHA_CLIENTE ni de clientes.usado). */
  comprobar("CRÉDITO sobre el cupo: el recuadro muestra cupo $3.000,00 y deuda $1.500,00 (cupo real + usado de cartera)"
    + (cSobre.paso ? " → " + cSobre.paso : ""),
    !cSobre.paso && /\$3\.000,00/.test(cSobre.txt || "") && /\$1\.500,00/.test(cSobre.txt || ""));

  /* ── 2) CRÉDITO por DEBAJO del cupo (control): usado 1.500 + 1.000 = 2.500 < 3.000.
         100 qq a $10 = $1.000. ── */
  const cBajo = await armar(js, { contado:false, cant:100 });
  comprobar("CRÉDITO dentro del cupo (control): NO se marca «por autorizar» ni se bloquea"
    + (cBajo.paso ? " → " + cBajo.paso : ""),
    !cBajo.paso && cBajo.disabled === false && cBajo.conAut === false
      && !/pendiente de autorización del freelance/.test(cBajo.txt || ""));

  /* ── 3) CONTADO por un monto que excedería el cupo si fuera crédito:
         200 qq a $10 = $2.000. El contado NO ocupa cupo. ── */
  const ctdo = await armar(js, { contado:true, cant:200 });
  comprobar("CONTADO: NO aparece el recuadro de cupo de crédito (el contado no ocupa cupo)"
    + (ctdo.paso ? " → " + ctdo.paso : ""),
    !ctdo.paso && !/Cupo de crédito/.test(ctdo.txt || ""));
  comprobar("CONTADO: el botón NO dice «con autorización»"
    + (ctdo.paso ? " → " + ctdo.paso : ""),
    !ctdo.paso && ctdo.conAut === false);
  comprobar("CONTADO: el botón «agregar» está habilitado (venta normal, se puede armar)"
    + (ctdo.paso ? " → " + ctdo.paso : ""),
    !ctdo.paso && ctdo.disabled === false);

  /* ── 4) Cliente BLOQUEADO: la consulta en vivo lo filtra (.eq bloqueado,false),
         así que ni se ofrece en el buscador → no se puede armar a su nombre. ── */
  const errBloq = await intentarCliente(js, BLOQ_NOMBRE);
  comprobar("CLIENTE BLOQUEADO: no aparece como opción en el armador (la consulta lo excluye)"
    + (errBloq ? "" : " → apareció igual"),
    !!errBloq && /no apareció/.test(errBloq));

  return { ok, mal, fallos };
}

/* ══════════════════════════════════════════════════════════════════════
   PARIDAD WEB · el Sistema Web calcula el MISMO usado (1.500) del mismo dato.
   Se renderiza PedidosWeb de verdad (sin modo demo, url intesgo.app/home) con
   los MISMOS clientes (cupo 3.000) y la MISMA cartera, y se maneja la pantalla
   como el usuario. ═════════════════════════════════════════════════════ */
const CLIENTES_WEB_BD = [
  { cli_id:CLI_ID, nombre:CLI_NOMBRE, razon_social:CLI_NOMBRE+" S.A.",
    tipo:"Jurídica", ruc:"1790001234001", condicion_pago:"Crédito", cupo:CUPO, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-1", canal:"Mayorista", estado_cliente:"ACTIVO" },
];
const PROVEEDORES_WEB_BD = [ { prov_cod:"PROV-C1", nombre:"Piladora Vela", es_demo:false } ];
const PRODUCTOS_WEB_BD = [ { prod_id:"P-VELA", nombre:"Arroz Vela", linea:"Arroz", estado:"activo" } ];
const OFERTAS_WEB_BD = [
  { prod_id:"P-VELA", prov_cod:"PROV-C1", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
    costo:9, costo_contado:9, margen_min:0, precio_contado:10, precio_credito:10 },
];
function datosWeb(t) {
  if (t === "clientes")           return CLIENTES_WEB_BD;
  if (t === "cartera_cliente")    return CARTERA_BD;   // la MISMA cartera que la app
  if (t === "proveedores")        return PROVEEDORES_WEB_BD;
  if (t === "productos")          return PRODUCTOS_WEB_BD;
  if (t === "v_ofertas_vigentes") return OFERTAS_WEB_BD;
  return [];
}

function montarWeb(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.XLSX = null;

  function consulta(tabla, filtros) {
    const resolver = () => {
      let filas = datosWeb(tabla).slice();
      filtros.forEach(f => {
        if (f[0] === "eq")  filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq") filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "in")  filas = filas.filter(r => (f[2]||[]).indexOf(r[f[1]]) >= 0);
      });
      return Promise.resolve({ data:filas, error:null });
    };
    const con = (t,c,v) => consulta(tabla, filtros.concat([[t,c,v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, is:()=>enc, range:()=>enc, filter:()=>enc,
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), in:(c,v)=>con("in",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      insert:()=>Promise.resolve({ error:null }),
      upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => Promise.resolve({ error:null }); return r; },
      delete:()=>({ eq:()=>Promise.resolve({ error:null }) }),
    };
    return enc;
  }
  w.supa = {
    auth: { getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } }),
            onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
            getUser: async () => ({ data:{ user:{ id:"u1" } } }), signOut: async () => ({}) },
    from: (t) => consulta(t, []),
    rpc: async () => ({ data:null, error:null }),
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx);
  vm.runInContext(R.reactDomDev(), ctx);
  vm.runInContext(js, ctx);

  vm.runInContext(`
    window.__render = function(){
      window.__c = document.createElement("div");
      document.body.appendChild(window.__c);
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__c).render(React.createElement(PedidosWeb, {
          usuario: { usuario:"richard", nombre:"Richard Ramírez", cargo:"freelance",
                     rol:"Freelance", empresaId:"ORG-001", secciones:[] } }));
      });
    };
    window.__flush = function(){ ReactDOM.flushSync(function(){}); };
    window.__txt = function(){ return (window.__c && window.__c.textContent) || ""; };

    var setV = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
    window.__escribir = function(inp, txt){
      if(!inp) return false;
      setV.call(inp, txt);
      inp.dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
    window.__inp = function(phSub){
      var ins = window.__c.querySelectorAll("input");
      for(var i=0;i<ins.length;i++){
        var ph=(ins[i].getAttribute("placeholder")||"").toLowerCase();
        if(ph.indexOf(phSub.toLowerCase())>=0) return ins[i];
      }
      return null;
    };
    window.__buscarEscribir = function(phSub, texto){
      var inp = window.__inp(phSub);
      if(!inp) return "no está el buscador ("+phSub+")";
      window.__escribir(inp, texto);
      return null;
    };
    window.__dropdown = function(phSub){
      var inp = window.__inp(phSub);
      if(!inp) return null;
      var wrap = inp.parentNode;
      for(var i=0;i<wrap.children.length;i++){
        var c = wrap.children[i];
        if(c.tagName==="DIV" && c.style && c.style.maxHeight==="220px") return c;
      }
      return null;
    };
    window.__dropdownTxt = function(phSub){
      var dd = window.__dropdown(phSub);
      return dd ? (dd.textContent||"") : "";
    };
    window.__buscarOpcion = function(phSub, opcSub){
      var dd = window.__dropdown(phSub);
      if(!dd) return "no se abrió el desplegable ("+phSub+")";
      var ops = dd.children;
      for(var j=0;j<ops.length;j++){
        if((ops[j].textContent||"").toLowerCase().indexOf(opcSub.toLowerCase())>=0){
          ops[j].dispatchEvent(new window.MouseEvent("mousedown",{bubbles:true}));
          return null;
        }
      }
      return "no apareció la opción «"+opcSub+"» en "+phSub;
    };
    window.__rowab = function(i, val){
      var row = window.__c.querySelector(".ped-rowab");
      if(!row) return "no está la fila cantidad/precio";
      var nums = row.querySelectorAll("input[type=number]");
      if(nums.length<2) return "faltan las casillas de la fila ("+nums.length+")";
      window.__escribir(nums[i], String(val));
      return null;
    };
    window.__botonPorTexto = function(sub){
      var bs = window.__c.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){
        if((bs[i].textContent||"").indexOf(sub)>=0){
          if(bs[i].disabled) return "disabled";
          bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
          return "ok";
        }
      }
      return "no-existe";
    };
    window.__estadoBoton = function(sub){
      var bs = window.__c.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){
        if((bs[i].textContent||"").indexOf(sub)>=0) return bs[i].disabled?"disabled":"ok";
      }
      return "no-existe";
    };
  `, ctx);
  return { ctx, w };
}
const correW = (m, expr) => vm.runInContext(expr, m.ctx);

async function webNuevoPedido(m) {
  correW(m, `window.__render()`);
  await esperar(320); correW(m, `window.__flush()`);
  correW(m, `window.__botonPorTexto("+ Nuevo pedido")`);
  await esperar(160); correW(m, `window.__flush()`);
}
async function webElegirProvProd(m) {
  correW(m, `window.__buscarEscribir("proveedor", "Piladora")`);
  await esperar(140); correW(m, `window.__flush()`);
  correW(m, `window.__buscarOpcion("proveedor", "Piladora Vela")`);
  await esperar(160); correW(m, `window.__flush()`);
  correW(m, `window.__buscarEscribir("catálogo", "Arroz Vela")`);
  await esperar(140); correW(m, `window.__flush()`);
  correW(m, `window.__buscarOpcion("catálogo", "Arroz Vela")`);
  await esperar(160); correW(m, `window.__flush()`);
}
async function webSetCantPrecio(m, c, p) {
  correW(m, `window.__rowab(0, ${JSON.stringify(String(c))})`);
  await esperar(100); correW(m, `window.__flush()`);
  correW(m, `window.__rowab(1, ${JSON.stringify(String(p))})`);
  await esperar(100); correW(m, `window.__flush()`);
}

async function paridadWeb(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  const m = montarWeb(js);
  await webNuevoPedido(m);

  /* Abre el desplegable de cliente y lee la opción: debe mostrar el mismo
     disponible que la app (cupo 3.000 − usado 1.500 de cartera = 1.500). */
  correW(m, `window.__buscarEscribir("cliente", "Vela")`);
  await esperar(150); correW(m, `window.__flush()`);
  const ddTxt = correW(m, `window.__dropdownTxt("cliente")`);
  comprobar("WEB: la opción del cliente muestra «Cupo disponible $1.500,00» (mismo usado de cartera que la app)",
    /Cupo disponible \$1\.500,00/.test(ddTxt || ""));

  /* Selecciona el cliente y arma prov/producto (tipo por defecto = Crédito). */
  correW(m, `window.__buscarOpcion("cliente", "Vela")`);
  await esperar(160); correW(m, `window.__flush()`);
  await webElegirProvProd(m);

  const hayFila = correW(m, `!!window.__c.querySelector(".ped-rowab")`);
  comprobar("WEB: se arma el pedido y aparece la fila de cantidad/precio", hayFila === true);

  /* Línea a crédito 200 × $10 = $2.000. Con usado 1.500 → 3.500 > 3.000 → excede.
     (Con usado=0 no excedería: este es el discriminador de paridad.) */
  await webSetCantPrecio(m, 200, 10);
  let est = correW(m, `window.__estadoBoton("Agregar al pedido")`);
  let txt = correW(m, `window.__txt()`);
  comprobar("WEB: crédito $2.000 con usado real 1.500 → EXCEDE (mismo umbral que la app) y «Agregar» sigue habilitado"
    + " (estado=" + est + ")",
    est === "ok" && /Excede el cupo de crédito/i.test(txt));

  /* Baja la línea a 100 × $10 = $1.000. Con usado 1.500 → 2.500 < 3.000 → NO excede. */
  await webSetCantPrecio(m, 100, 10);
  txt = correW(m, `window.__txt()`);
  comprobar("WEB: crédito $1.000 con usado real 1.500 → NO excede (2.500 < 3.000), mismo umbral que la app",
    !/Excede el cupo de crédito/i.test(txt));

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══
   Se verifica que cada trozo aparezca UNA sola vez antes de reemplazarlo.
   Cada mutante toca el ORIGEN del número (o la regla del contado). ══ */
const MUTANTES = [
  /* (a) leer el cupo/usado de FICHA_CLIENTE aun en vivo: el cliente de prueba
         NO existe en FICHA_CLIENTE, así que la ficha se cae a null → cupo 0 →
         desaparece el recuadro de cupo y se caen las pruebas del número real. */
  ["lee el cupo de FICHA_CLIENTE en vivo (ignora la ficha viva)",
    `const fichaCli = cli ? (vivoPed ? (FICHA_VIVA_PED[cli]||null) : FICHA_CLIENTE[cli]) : null;`,
    `const fichaCli = cli ? FICHA_CLIENTE[cli] : null;`],
  /* (b) tomar el usado de clientes.usado (que va en 0) en vez de la cartera:
         el usado se vuelve 0, así que $2.000 ya no excede (2.000 < 3.000) y se
         caen las pruebas del crédito sobre el cupo. */
  ["toma el usado de clientes.usado (0) en vez de la suma de cartera",
    `debe:Math.round((usadoPorCli[c.cli_id]||0)*100)/100`,
    `debe:Number(c.usado)||0`],
  /* (c) el CONTADO pasa a ocupar cupo: si el contado se cuenta como crédito, el
         recuadro de cupo aparece y el monto lo hace exceder → deja de cumplirse
         «el contado no ocupa cupo». Es el único punto observable con un cambio. */
  ["el CONTADO pasa a ocupar cupo (contar contado como crédito)",
    `const esCredito = tipo==="P1" || (tipo==="P3" && condP3==="credito");`,
    `const esCredito = true;`],
];

(async () => {
  console.log("═══ El cupo de crédito sale de clientes.cupo + cartera · " + nombreApp);
  console.log("    Comprobaciones app: " + ESPERADAS + " · paridad web: " + ESPERADAS_WEB + " · mutantes: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (r.ok + r.mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones de app y corrieron " +
      (r.ok + r.mal) + ". Alguna se perdió o se agregó sin declararla.");
  }

  /* ── Paridad con el Sistema Web (código bueno; no se muta) ── */
  console.log("  · paridad con el Sistema Web (mismo dato, mismo número):");
  const jsWeb = R.Babel.transform(jsxWeb, { presets:["react"] }).code;
  const rw = await paridadWeb(jsWeb, true);
  ok += rw.ok; mal += rw.mal;
  if (rw.ok + rw.mal !== ESPERADAS_WEB) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS_WEB + " comprobaciones de paridad web y corrieron " +
      (rw.ok + rw.mal) + ".");
  }

  console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
  if (MUTANTES.length !== MUTANTES_ESPERADOS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + MUTANTES_ESPERADOS + " mutantes y hay " + MUTANTES.length + ".");
  }
  for (const [nombre, dee, a] of MUTANTES) {
    const veces = jsx.split(dee).length - 1;
    if (veces !== 1) {
      mal++;
      console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
      continue;
    }
    const mutado = jsx.replace(dee, a);
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

  console.log("Resultado del cupo de crédito: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
