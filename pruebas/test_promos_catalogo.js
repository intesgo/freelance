/* ═══════════════════════════════════════════════════════════════════════
   LAS PROMOCIONES LLEGAN AL CATÁLOGO (PROMO-04)
   · Comisionista · socio-comercial · freelance-completo

   Qué se rompía: `construirCatalogoPedido` dejaba `promosFreelance:[]` y
   `promosProveedor:[]` en TODAS las líneas. El vendedor tocaba P4 o P6 y el
   chip salía gris con «Este producto no tiene promociones del freelance
   vigentes.», aunque la promoción estuviera cargada en la base. Toda la
   cadena del regalo estaba puesta —la tabla `promociones`, sus escalones en
   `promocion_tramos`, el cerrojo `gratis_que_concede`— y el vendedor no la
   podía usar porque el catálogo no se la mostraba.

   EL PELIGRO DE ESTE CAMBIO ES REGALAR DE MÁS, y por eso media prueba lo
   vigila. Una promoción cuelga de PRODUCTO + PRESENTACIÓN + PILADORA:
   «compra 100 lleva 2» no dice lo mismo en quintales que en arrobas (son 4×)
   ni en una funda de 10 libras (0,1 qq: son 10×). Y un estado equivocado es
   igual de caro: `pendiente` es una promoción que nadie aprobó todavía y
   `rechazada` una que se negó; ninguna de las dos se le puede ofrecer a un
   vendedor que está frente al cliente.

   LOS NÚMEROS QUE SE MUESTRAN NO SON LOS QUE DECIDEN. `minimo` y `gratis`
   salen del escalón de arranque de `promocion_tramos` solo para escribir «por
   cada 50 llevas 2». Cuánto se puede regalar de verdad lo sigue diciendo la
   base por RPC a `gratis_que_concede`, que es lo que mide test_regalo_promo.js
   y test_regalo_sql.js. Aquí NO se vuelve a calcular nada de eso.

   Como en producción `promociones` tiene CERO filas, todo esto corre contra
   dobles con la forma real de la base: promo del freelance y del proveedor,
   una vencida, una inactiva, una pendiente, una rechazada, una de otro
   producto, una de demostración y presentaciones de 1 · 0,25 · 0,1 qq.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Hay roturas TONTAS
   (sumarle 1 a un número del escalón) además de las semánticas: si una rotura
   lista se neutraliza con los datos de prueba, la tonta lo delata.

   UN MUTANTE QUE NO TUMBA NADA, Y SE DICE: quitar el filtro de modalidad de la
   CABECERA no rompe ninguna comprobación, y no es que la prueba no mida: es que
   con datos que respetan el CHECK de la base ese filtro es inalcanzable. Una
   promoción `descuento_volumen` no puede tener `gratis_cant` (lo prohíbe
   `promocion_tramos_parametros_check`), así que nunca llega a tener escalón de
   arranque y la corta el filtro de más abajo. Es un cinturón sobre un tirante:
   se deja escrito, pero no se finge que una prueba lo vigila.

   Uso: node test_promos_catalogo.js [ruta.html]
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
/* Declaradas 38 al escribirlas y corrieron 41: se contaron mal a mano tres
   comprobaciones (la que empieza hoy, el producto sin promociones y la de llegar
   hasta el quintal). El aviso de arriba lo cazó en la primera pasada; queda
   escrito aquí para que nadie ajuste este número sin darse cuenta de por qué.
   Luego subió a 42 al partir en dos la comprobación del renglón de P4. */
const ESPERADAS = 42;
const MUTANTES_ESPERADOS = 14;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));
/* fecha LOCAL, la del teléfono: la misma regla que usa la app */
const dia = (n) => { const d = new Date(Date.now() + n * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
const HOY = dia(0), AYER = dia(-1), MANANA = dia(1), ANTEAYER = dia(-2), PASADO = dia(2);

/* ══ La base de prueba, con la forma de producción ══ */
const PRODUCTOS_BD = [
  { prod_id:"P-00001", nombre:"Arroz Gustadina", marca:"Arroz Gustadina", linea:"Arroz",
    proveedor:"Piladora San Agustín", proveedor_cod:"AGU", foto:null, estado:"activo" },
  { prod_id:"P-00002", nombre:"Arroz Conejo", marca:"Arroz Conejo", linea:"Arroz",
    proveedor:"Piladora San Agustín", proveedor_cod:"AGU", foto:null, estado:"activo" },
  /* el que no tiene NI UNA promoción: con él se miden los grises */
  { prod_id:"P-00003", nombre:"Arroz Económico", marca:"Arroz Económico", linea:"Arroz",
    proveedor:"Piladora San Agustín", proveedor_cod:"AGU", foto:null, estado:"activo" },
];

/* Tres presentaciones de verdad: 1 qq · 0,25 qq · 0,1 qq. La de 10 libras es la
   que engañó antes a un conversor que leía el texto en vez del `equiv_qq`. */
const OFERTAS_BD = [
  { prod_id:"P-00001", pres_cod:"QQ",   presentacion:"Quintal",         equiv_qq:1,    prov_cod:"AGU", costo:38.00, costo_contado:37.50, precio_contado:42.75, precio_credito:43.25, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"ARR",  presentacion:"Arroba 25 lb",    equiv_qq:0.25, prov_cod:"AGU", costo:9.80,  costo_contado:9.50,  precio_contado:11.00, precio_credito:11.25, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"LB10", presentacion:"Funda 10 libras", equiv_qq:0.1,  prov_cod:"AGU", costo:3.90,  costo_contado:3.80,  precio_contado:4.40,  precio_credito:4.50,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* la MISMA presentación en otra piladora: sirve para ver que las promociones
     no se cruzan de piladora */
  { prod_id:"P-00001", pres_cod:"QQ",   presentacion:"Quintal",         equiv_qq:1,    prov_cod:"COR", costo:39.00, costo_contado:38.50, precio_contado:43.00, precio_credito:43.50, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00002", pres_cod:"QQ",   presentacion:"Quintal",         equiv_qq:1,    prov_cod:"AGU", costo:41.00, costo_contado:40.50, precio_contado:45.00, precio_credito:45.50, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00003", pres_cod:"QQ",   presentacion:"Quintal",         equiv_qq:1,    prov_cod:"AGU", costo:30.00, costo_contado:29.50, precio_contado:33.00, precio_credito:33.50, activo:true, vigente_desde:AYER, vigente_hasta:null },
];

const PROVEEDORES_BD = [
  { prov_cod:"AGU", nombre:"Piladora San Agustín", es_demo:false },
  { prov_cod:"COR", nombre:"Piladora Cordero",     es_demo:false },
];

/* ══ Las promociones, con la forma exacta de la tabla `promociones` ══ */
const PROMOS_BD = [
  /* viva y del freelance: es la que tiene que aparecer en P4 */
  { promo_id:"PM-F1", nombre:"Combo agosto vivo", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:41.50, estado:"activa",
    vigente_desde:AYER, vigente_hasta:MANANA, es_demo:false },
  /* viva y del proveedor, APROBADA y con dos escalones: manda el de arranque */
  { promo_id:"PM-P1", nombre:"Impulso de piladora viva", detalle:null, modalidad:"compra_lleva", origen:"proveedor",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:42.50, estado:"aprobada",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* vencida ayer */
  { promo_id:"PM-VENC", nombre:"Feria ya vencida", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:40.00, estado:"activa",
    vigente_desde:ANTEAYER, vigente_hasta:AYER, es_demo:false },
  /* apagada a mano */
  { promo_id:"PM-INAC", nombre:"Promo apagada", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:39.00, estado:"inactiva",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* la que el proveedor propuso y NADIE ha aprobado */
  { promo_id:"PM-PEND", nombre:"Propuesta sin aprobar", detalle:null, modalidad:"compra_lleva", origen:"proveedor",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:38.00, estado:"pendiente",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* la que se negó */
  { promo_id:"PM-RECH", nombre:"Propuesta negada", detalle:null, modalidad:"compra_lleva", origen:"proveedor",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:37.00, estado:"rechazada",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* empieza mañana */
  { promo_id:"PM-MANANA", nombre:"Arranque de mañana", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:41.00, estado:"activa",
    vigente_desde:MANANA, vigente_hasta:PASADO, es_demo:false },
  /* de demostración: no puede colarse en el catálogo real */
  { promo_id:"PM-DEMO", nombre:"Promo de demostración", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:30.00, estado:"activa",
    vigente_desde:AYER, vigente_hasta:null, es_demo:true },
  /* otra modalidad: no regala mercadería, así que P4/P6 no la saben mostrar */
  { promo_id:"PM-VOL", nombre:"Descuento por volumen", detalle:null, modalidad:"descuento_volumen", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:41.00, estado:"activa",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* cabecera viva SIN escalones: no se ofrece lo que no se puede cumplir */
  { promo_id:"PM-SINTRAMO", nombre:"Promo a medio cargar", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"QQ", base:41.00, estado:"activa",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* de la ARROBA: 4× de diferencia si se ofreciera en el quintal */
  { promo_id:"PM-ARR", nombre:"Promo de la arroba", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"ARR", base:10.50, estado:"activa",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* de la funda de 10 LIBRAS (0,1 qq): 10× de diferencia */
  { promo_id:"PM-LB", nombre:"Promo de la funda", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00001", pres_cod:"LB10", base:4.20, estado:"activa",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* SIN presentación y SIN piladora: sus números están en QUINTALES y vale para
     todas las piladoras, igual que lo lee `gratis_que_concede` */
  /* sin base propia a propósito: la línea tiene que prestarle SU precio */
  { promo_id:"PM-QQNULL", nombre:"Volumen sin presentación", detalle:null, modalidad:"compra_lleva", origen:"proveedor",
    prov_cod:null, prod_id:"P-00001", pres_cod:null, base:null, estado:"activa",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* solo de Piladora Cordero */
  { promo_id:"PM-COR", nombre:"Promo de Cordero", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"COR", prod_id:"P-00001", pres_cod:"QQ", base:42.00, estado:"activa",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* de OTRO producto: no puede aparecer en Gustadina */
  { promo_id:"PM-OTRO", nombre:"Promo del conejo", detalle:"compra 80 lleva 4", modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00002", pres_cod:"QQ", base:44.50, estado:"activa",
    vigente_desde:AYER, vigente_hasta:null, es_demo:false },
  /* muere HOY: el último día SÍ cuenta, igual que en la base */
  { promo_id:"PM-HASTAHOY", nombre:"Último día", detalle:null, modalidad:"compra_lleva", origen:"proveedor",
    prov_cod:"AGU", prod_id:"P-00002", pres_cod:"QQ", base:44.00, estado:"activa",
    vigente_desde:ANTEAYER, vigente_hasta:HOY, es_demo:false },
  /* empieza HOY: sirve para medir el corte de la fecha por el otro lado */
  { promo_id:"PM-DESDEHOY", nombre:"Estreno de hoy", detalle:null, modalidad:"compra_lleva", origen:"freelance",
    prov_cod:"AGU", prod_id:"P-00003", pres_cod:"QQ", base:32.00, estado:"activa",
    vigente_desde:HOY, vigente_hasta:null, es_demo:false },
];

/* `es_demo` viaja en cada escalón porque la consulta de la app lo filtra: sin él,
   la app no vería NI UN escalón y las promociones se caerían del catálogo sin que
   nada avisara. La primera pasada de esta prueba se cayó justo por eso. */
const TRAMOS_BD = [
  { promo_id:"PM-F1",       modalidad:"compra_lleva", desde_cant:60,   gratis_cant:3, es_demo:false },
  /* dos escalones: el de arranque es el de 100, no el de 200 */
  { promo_id:"PM-P1",       modalidad:"compra_lleva", desde_cant:200,  gratis_cant:12, es_demo:false },
  { promo_id:"PM-P1",       modalidad:"compra_lleva", desde_cant:100,  gratis_cant:5, es_demo:false },
  { promo_id:"PM-VENC",     modalidad:"compra_lleva", desde_cant:60,   gratis_cant:3, es_demo:false },
  { promo_id:"PM-INAC",     modalidad:"compra_lleva", desde_cant:60,   gratis_cant:3, es_demo:false },
  { promo_id:"PM-PEND",     modalidad:"compra_lleva", desde_cant:70,   gratis_cant:4, es_demo:false },
  { promo_id:"PM-RECH",     modalidad:"compra_lleva", desde_cant:70,   gratis_cant:4, es_demo:false },
  { promo_id:"PM-MANANA",   modalidad:"compra_lleva", desde_cant:50,   gratis_cant:3, es_demo:false },
  { promo_id:"PM-DEMO",     modalidad:"compra_lleva", desde_cant:10,   gratis_cant:9, es_demo:false },
  { promo_id:"PM-VOL",      modalidad:"descuento_volumen", desde_cant:100, gratis_cant:null, precio_unit:39.00, es_demo:false },
  /* PM-SINTRAMO no tiene ni una fila aquí, a propósito */
  { promo_id:"PM-ARR",      modalidad:"compra_lleva", desde_cant:200,  gratis_cant:8, es_demo:false },
  { promo_id:"PM-LB",       modalidad:"compra_lleva", desde_cant:1000, gratis_cant:40, es_demo:false },
  { promo_id:"PM-QQNULL",   modalidad:"compra_lleva", desde_cant:100,  gratis_cant:3, es_demo:false },
  { promo_id:"PM-COR",      modalidad:"compra_lleva", desde_cant:40,   gratis_cant:1, es_demo:false },
  { promo_id:"PM-OTRO",     modalidad:"compra_lleva", desde_cant:80,   gratis_cant:4, es_demo:false },
  { promo_id:"PM-HASTAHOY", modalidad:"compra_lleva", desde_cant:30,   gratis_cant:1, es_demo:false },
  { promo_id:"PM-DESDEHOY", modalidad:"compra_lleva", desde_cant:20,   gratis_cant:1, es_demo:false },
];

const CLIENTES_BD = [
  { cli_id:"CLI-A", nombre:"ROCELUMA CIA LTDA", razon_social:"ROCELUMA CIA LTDA",
    es_demo:false, activo:true, bloqueado:false },
];
const UBIC_BD = [
  { ubic_id:"U-1", cli_id:"CLI-A", nombre:"Matriz", principal:true, tipo_entrega:"domicilio",
    ciudad:"Cuenca", direccion:"Mariscal Lamar 2-59", activo:true },
];

function datosDe(t) {
  if (t === "productos")          return PRODUCTOS_BD;
  if (t === "ofertas_piladora")   return OFERTAS_BD;
  if (t === "proveedores")        return PROVEEDORES_BD;
  if (t === "promociones")        return PROMOS_BD;
  if (t === "promocion_tramos")   return TRAMOS_BD;
  if (t === "clientes")           return CLIENTES_BD;
  if (t === "ubicaciones_cliente")return UBIC_BD;
  if (t === "precios")            return [];
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
  /* La consulta de mentira RESPETA los filtros: si aquí se ignorara `.eq()`,
     la prueba estaría midiendo otra cosa. */
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
      insert:()=>Promise.resolve({ error:null }),
      upsert:()=>Promise.resolve({ error:null }),
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
    /* El tope del regalo lo dice la BASE. Aquí no se imita esa cuenta: eso lo
       miden test_regalo_promo.js y test_regalo_sql.js. */
    rpc: async () => ({ data:null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(op.js, ctx);
  return { ctx, pedidas, w };
}

/* ── La pantalla, manejada como la maneja el vendedor ── */
function pintar(m) {
  vm.runInContext(`
    window.__toasts = [];
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(Pedido, {
        toast:function(t){ window.__toasts.push(String(t)); }, prodInicial:null, onConsumir:function(){}, go:function(){},
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
    /* el chip del tipo de precio lleva su código (P4, P6) en .tchip-cod */
    window.__chip = function(cod){
      var ch = window.__c.querySelectorAll(".tchip");
      for (var i=0;i<ch.length;i++){
        var c = ch[i].querySelector(".tchip-cod");
        if (c && (c.textContent||"").trim() === cod) return ch[i];
      }
      return null;
    };
    window.__chipGris = function(cod){ var e = window.__chip(cod); return e ? /nodisp/.test(e.className||"") : null; };
    window.__tocarChip = function(cod){
      var e = window.__chip(cod); if(!e) return false;
      e.dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
      return true;
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

  /* ── A) El catálogo, mirado por dentro ── */
  const armar = (promoTbl) => {
    try {
      return corre(m, `construirCatalogoPedido(
        ${JSON.stringify(PROVEEDORES_BD)}, ${JSON.stringify(OFERTAS_BD)}, ${JSON.stringify(PRODUCTOS_BD)}, [],
        ${promoTbl === undefined ? "undefined" : JSON.stringify(promoTbl)})`);
    } catch (e) { return null; }
  };
  const cat = armar({ promos:PROMOS_BD, tramos:TRAMOS_BD });
  const pres = (cat && cat.pres) ? Array.from(cat.pres) : [];
  const linea = (prodId, cod, prov) => pres.find(p =>
    p.prodId === prodId && p.presCod === cod && (!prov || p.provId === prov)) || null;
  /* nombres de las promos de una línea, como texto, para leerlo de un vistazo */
  const nomF = (l) => (l && l.promosFreelance ? Array.from(l.promosFreelance) : []).map(p => p.nombre);
  const nomP = (l) => (l && l.promosProveedor ? Array.from(l.promosProveedor) : []).map(p => p.nombre);
  const dameF = (l, nombre) => (l && l.promosFreelance ? Array.from(l.promosFreelance) : []).find(p => p.nombre === nombre) || null;
  const dameP = (l, nombre) => (l && l.promosProveedor ? Array.from(l.promosProveedor) : []).find(p => p.nombre === nombre) || null;

  const gQQ  = linea("P-00001", "QQ",   "AGU");
  const gARR = linea("P-00001", "ARR",  "AGU");
  const gLB  = linea("P-00001", "LB10", "AGU");
  const gCOR = linea("P-00001", "QQ",   "COR");
  const conejo = linea("P-00002", "QQ", "AGU");
  const eco  = linea("P-00003", "QQ",   "AGU");
  const todasF = pres.flatMap(nomF), todasP = pres.flatMap(nomP);

  const pmF1 = dameF(gQQ, "Combo agosto vivo");
  const pmP1 = dameP(gQQ, "Impulso de piladora viva");

  comprobar("el quintal de Gustadina YA trae la promoción del freelance «Combo agosto vivo» (P4 deja de salir gris)",
    !!pmF1);
  comprobar("y la del proveedor «Impulso Gustadina» (P6 deja de salir gris)",
    !!pmP1);
  comprobar("cada una en su lado: la del freelance no se cuela en las del proveedor ni al revés",
    nomP(gQQ).indexOf("Combo agosto vivo") < 0 && nomF(gQQ).indexOf("Impulso de piladora viva") < 0);
  comprobar("el texto sale del escalón de arranque: «compra 60 lleva 3»",
    !!pmF1 && pmF1.detalle === "compra 60 lleva 3");
  comprobar("los números son los de `promocion_tramos`: mínimo 60 y 3 gratis",
    !!pmF1 && pmF1.minimo === 60 && pmF1.gratis === 3);
  comprobar("promoción escalonada: se enseña el escalón de ARRANQUE (100 → 5), no el de 200 → 12",
    !!pmP1 && pmP1.minimo === 100 && pmP1.gratis === 5);
  comprobar("la promoción lleva SU base ($41,50), no la de la oferta ($42,75)",
    !!pmF1 && pmF1.base === 41.5);
  comprobar("promoción SIN base propia: manda el precio de la oferta de ESA línea ($42,75 en San Agustín, $43,00 en Cordero), nunca 0",
    (dameP(gQQ,  "Volumen sin presentación")||{}).base === 42.75 &&
    (dameP(gCOR, "Volumen sin presentación")||{}).base === 43);
  comprobar("`paga` dice quién financia el regalo: el freelance en P4, el proveedor en P6",
    !!pmF1 && pmF1.paga === "freelance" && !!pmP1 && pmP1.paga === "proveedor");

  comprobar("la promoción VENCIDA ayer no se ofrece",
    todasF.indexOf("Feria ya vencida") < 0);
  comprobar("la promoción INACTIVA no se ofrece",
    todasF.indexOf("Promo apagada") < 0);
  comprobar("la PENDIENTE no se le ofrece a un vendedor: todavía no la aprobó nadie",
    todasP.indexOf("Propuesta sin aprobar") < 0);
  comprobar("la RECHAZADA tampoco",
    todasP.indexOf("Propuesta negada") < 0);
  comprobar("la que empieza MAÑANA todavía no se ofrece",
    todasF.indexOf("Arranque de mañana") < 0);
  comprobar("la que muere HOY sí se ofrece: el último día cuenta, igual que en la base",
    nomP(conejo).indexOf("Último día") >= 0);
  comprobar("la que empieza HOY ya se ofrece",
    nomF(eco).indexOf("Estreno de hoy") >= 0);
  comprobar("la de DEMOSTRACIÓN no se cuela en el catálogo real",
    todasF.indexOf("Promo de demostración") < 0);
  comprobar("la de otra modalidad (descuento por volumen) no llega a P4: no regala mercadería",
    todasF.indexOf("Descuento por volumen") < 0);
  comprobar("la cabecera SIN escalones no se ofrece: no se promete lo que no se puede cumplir",
    todasF.indexOf("Promo a medio cargar") < 0);

  comprobar("la promoción de OTRO producto no aparece en Gustadina",
    nomF(gQQ).indexOf("Promo del conejo") < 0);
  comprobar("y sí aparece en el suyo, Arroz Conejo",
    nomF(conejo).indexOf("Promo del conejo") >= 0);
  comprobar("la promoción de la ARROBA se ofrece SOLO en la arroba (en el quintal serían 4× de regalo)",
    nomF(gARR).indexOf("Promo de la arroba") >= 0 &&
    nomF(gQQ).indexOf("Promo de la arroba") < 0 &&
    nomF(gLB).indexOf("Promo de la arroba") < 0);
  comprobar("la promoción de la funda de 10 libras (0,1 qq) se ofrece SOLO en esa funda (10× de diferencia)",
    nomF(gLB).indexOf("Promo de la funda") >= 0 &&
    nomF(gQQ).indexOf("Promo de la funda") < 0 &&
    nomF(gARR).indexOf("Promo de la funda") < 0);
  comprobar("la promoción SIN presentación tiene sus números en QUINTALES: solo cae en la línea de 1 qq",
    nomP(gQQ).indexOf("Volumen sin presentación") >= 0 &&
    nomP(gARR).indexOf("Volumen sin presentación") < 0 &&
    nomP(gLB).indexOf("Volumen sin presentación") < 0);
  comprobar("la promoción SIN piladora vale para las DOS piladoras",
    nomP(gQQ).indexOf("Volumen sin presentación") >= 0 && nomP(gCOR).indexOf("Volumen sin presentación") >= 0);
  comprobar("la promoción de Piladora Cordero NO se ofrece en la línea de San Agustín",
    nomF(gCOR).indexOf("Promo de Cordero") >= 0 && nomF(gQQ).indexOf("Promo de Cordero") < 0);
  comprobar("Arroz Económico solo tiene la suya: ninguna promoción de Gustadina se le pega",
    nomF(eco).length === 1 && nomP(eco).length === 0);

  const sinTabla = armar(undefined);
  const presSin = (sinTabla && sinTabla.pres) ? Array.from(sinTabla.pres) : [];
  comprobar("sin tabla de promociones el catálogo se sigue armando y todas las líneas salen sin promociones",
    presSin.length === pres.length && presSin.length > 0 &&
    presSin.every(p => (p.promosFreelance||[]).length === 0 && (p.promosProveedor||[]).length === 0));
  comprobar("las fechas viajan como desde/hasta, que es lo que mira el segundo filtro de la pantalla",
    !!pmF1 && pmF1.desde === AYER && pmF1.hasta === MANANA);

  /* La vigencia se mide contra la fecha que se le pasa, no contra una de adentro:
     así el catálogo puede usar la del TELÉFONO y no la de Greenwich. */
  let cortaFin = null, cortaIni = null;
  try {
    cortaFin = corre(m, `promosDelCatalogo({promos:${JSON.stringify(PROMOS_BD)}, tramos:${JSON.stringify(TRAMOS_BD)}},
      ${JSON.stringify(MANANA)})("P-00002","QQ","AGU",1,45)`);
    cortaIni = corre(m, `promosDelCatalogo({promos:${JSON.stringify(PROMOS_BD)}, tramos:${JSON.stringify(TRAMOS_BD)}},
      ${JSON.stringify(AYER)})("P-00003","QQ","AGU",1,33)`);
  } catch (e) { cortaFin = null; cortaIni = null; }
  comprobar("con la fecha de MAÑANA, la promoción que muere hoy ya no se ofrece",
    !!cortaFin && Array.from(cortaFin.proveedor).every(p => p.nombre !== "Último día"));
  comprobar("con la fecha de AYER, la que empieza hoy todavía no se ofrece",
    !!cortaIni && Array.from(cortaIni.freelance).length === 0);

  /* El segundo colador de la pantalla no puede tirar lo que el catálogo aprobó */
  let pasanF = null;
  try { pasanF = corre(m, `promosVigentes(${JSON.stringify(gQQ ? Array.from(gQQ.promosFreelance) : [])}).length`); }
  catch (e) { pasanF = -1; }
  comprobar("el segundo filtro de la pantalla (promosVigentes) deja pasar lo que el catálogo aprobó",
    pasanF === (gQQ ? Array.from(gQQ.promosFreelance).length : -1) && pasanF > 0);

  /* ── B) La pantalla, como la ve el vendedor ── */
  pintar(m);
  await esperar(400);
  comprobar("la carga del pedido consulta `promociones`",
    m.pedidas.indexOf("promociones") >= 0);
  comprobar("la carga del pedido consulta `promocion_tramos`",
    m.pedidas.indexOf("promocion_tramos") >= 0);

  let e = await elegir(m, "cliente", "ROCELUMA CIA LTDA");
  const eProv = e ? "no se llegó a la piladora" : await elegir(m, "proveedor", "San Agustín", "San Agustín");
  corre(m, `window.__escribir(window.__buscador("producto"), "gustadina")`);
  await esperar(120);
  const tomo = corre(m, `window.__tocarOpcion(["Arroz Gustadina","Quintal"])`);
  await esperar(150);
  comprobar("con la base viva se llega hasta el quintal de Arroz Gustadina" + (e || eProv ? " → " + (e || eProv) : ""),
    !e && !eProv && !!tomo);
  comprobar("el chip P4 ya NO sale gris: hay promoción del freelance vigente",
    corre(m, `window.__chipGris("P4")`) === false);
  comprobar("el chip P6 tampoco sale gris: hay promociones del proveedor vigentes",
    corre(m, `window.__chipGris("P6")`) === false);
  corre(m, `window.__tocarChip("P4")`);
  await esperar(150);
  const txtP4 = corre(m, `window.__txt()`);
  comprobar("elegido P4, la pantalla muestra la promoción «Combo agosto vivo»",
    /Combo agosto vivo/.test(txtP4));
  /* El renglón se lee igual en las tres apps hasta aquí; el Comisionista y el
     socio le añaden «: tu comisión no baja», que es cosa de cada pantalla. */
  comprobar("y le dice al vendedor «Por cada 60 Quintal, 3 gratis. Las paga el freelance»",
    /Por cada 60 Quintal, 3 gratis\. Las paga el freelance/.test(txtP4));
  comprobar("el detalle de la promoción se lee tal cual en pantalla: «compra 60 lleva 3»",
    /compra 60 lleva 3/.test(txtP4));

  /* Un producto SIN promoción del proveedor: el gris y el aviso de siempre se
     quedan como estaban. Arroz Económico solo tiene una del freelance. */
  const m2 = montar({ js });
  pintar(m2);
  await esperar(400);
  await elegir(m2, "cliente", "ROCELUMA CIA LTDA");
  await elegir(m2, "proveedor", "San Agustín", "San Agustín");
  corre(m2, `window.__escribir(window.__buscador("producto"), "económico")`);
  await esperar(120);
  corre(m2, `window.__tocarOpcion(["Arroz Económico","Quintal"])`);
  await esperar(150);
  corre(m2, `window.__toasts = []; window.__tocarChip("P6")`);
  await esperar(120);
  const avisos = Array.from(corre(m2, `window.__toasts`) || []);
  comprobar("producto sin promoción del proveedor: el chip P6 sigue saliendo gris",
    corre(m2, `window.__chipGris("P6")`) === true);
  comprobar("y el aviso es exactamente «Este producto no tiene promociones del proveedor vigentes.»",
    avisos.indexOf("Este producto no tiene promociones del proveedor vigentes.") >= 0);

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  /* TONTAS y directas: si estas no tumban la prueba, la prueba no mide nada */
  ["TONTA · le suma 1 a las gratis del escalón",
   `const d=Number(t.desde_cant)||0, g=Number(t.gratis_cant)||0;`,
   `const d=Number(t.desde_cant)||0, g=(Number(t.gratis_cant)||0)+1;`],
  ["TONTA · le suma 1 al mínimo del escalón",
   `if(!ya || d<ya.minimo) arranque[t.promo_id]={ minimo:d, gratis:g };`,
   `if(!ya || d<ya.minimo) arranque[t.promo_id]={ minimo:d+1, gratis:g };`],
  /* semánticas */
  ["deja pasar cualquier estado: `pendiente` y `rechazada` llegan al vendedor",
   `if(PROMO_ESTADOS_VIVOS.indexOf(p.estado)<0) return;`, ``],
  ["se le olvida la fecha en que la promoción deja de regir",
   `if(h && h <  hoyISO) return;`, ``],
  ["se le olvida la fecha en que la promoción empieza a regir",
   `if(d && d >  hoyISO) return;`, ``],
  ["mata la promoción un día antes: el último día deja de contar",
   `if(h && h <  hoyISO) return;`, `if(h && h <= hoyISO) return;`],
  ["la vigencia se mide contra una fecha fija en vez de la de hoy",
   `const promosDe = promosDelCatalogo(promoTbl, hoyISO);`,
   `const promosDe = promosDelCatalogo(promoTbl, "2026-01-01");`],
  ["no mira la presentación: la promo de la arroba se ofrece en el quintal",
   `if(x.presCod ? (x.presCod !== presCod) : Number(equiv)!==1) return;`, ``],
  ["no mira la piladora: la promo de Cordero se ofrece en San Agustín",
   `if(x.provCod && provCod && x.provCod !== provCod) return;`, ``],
  ["no mira el producto: cualquier promoción cae en cualquier producto",
   `if(x.prodId !== prodId) return;`, ``],
  ["deja pasar las promociones de DEMOSTRACIÓN",
   `if(p.es_demo===true) return;`, ``],
  ["promoción sin base propia: la deja en 0 y la comisión se come el precio entero",
   `if(pm.base==null) pm.base = baseContado;`, `if(pm.base==null) pm.base = 0;`],
  ["la cabecera sin escalones igual se ofrece, con números inventados",
   `const t = arranque[p.promo_id];`, `const t = arranque[p.promo_id] || { minimo:1, gratis:1 };`],
  ["reparte al revés: las del proveedor a P4 y las del freelance a P6",
   `(x.origen==="proveedor" ? v : f).push(pm);`, `(x.origen==="proveedor" ? f : v).push(pm);`],
];

(async () => {
  console.log("═══ Las promociones llegan al catálogo · " + nombreApp);
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

  console.log("Resultado de las promociones del catálogo: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
