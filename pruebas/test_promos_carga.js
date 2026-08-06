/* ═══════════════════════════════════════════════════════════════════════
   CARGAR UNA PROMOCIÓN SIN SQL (PROMO-05) · sistema-web

   Qué destraba: hasta hoy una promoción SOLO se podía meter escribiendo SQL
   a mano. La tabla `promociones` estaba, sus escalones en `promocion_tramos`
   estaban, el cerrojo `gratis_que_concede` estaba y el catálogo de las apps
   ya las mostraba en P4 y P6. Faltaba la pantalla. Esta prueba mide esa
   pantalla: `PromocionesWeb` y su formulario `ModalPromocion`.

   EL PELIGRO DE ESTE CAMBIO ES CARGAR MAL Y REGALAR DE MÁS. «Compra 100,
   lleva 2» son 100 qq en quintales, 25 qq en arrobas (0,25) y 10 qq en
   fundas de 10 libras (0,1). Cuatro y diez veces de diferencia en grano
   regalado. Por eso media prueba vigila que el texto en criollo diga el
   número correcto para las TRES presentaciones: el usuario tiene que poder
   ver el error ANTES de guardar.

   LO QUE ESTA PRUEBA NO MIDE, A PROPÓSITO: cuánto concede una promoción. Esa
   cuenta vive en la base (`gratis_que_concede`) y la miden test_regalo_promo.js
   y test_regalo_sql.js. Aquí solo se mide que lo que se teclea llegue a la
   base tal cual, y que lo que se dice en pantalla sea lo mismo que se teclea.

   TAMPOCO SE ESCRIBE EN LA BASE DE VERDAD: el `supa` de aquí es un doble que
   anota lo que se le manda y devuelve datos con la forma de producción.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Hay roturas TONTAS
   (sumarle 1 a una cantidad) además de las semánticas: una rotura lista se
   puede neutralizar con los datos de prueba y hacer creer que la prueba mide
   cuando el malo es el mutante; la tonta lo delata.

   Uso: node test_promos_carga.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una que se borre sin querer no pase inadvertida. ──
   Se declararon 40 al escribirlas y corrieron 45: se contaron mal a mano cinco
   del bloque de la pantalla (las seis del guardado quedaron contadas como una).
   El aviso de abajo lo cazó en la primera pasada; queda escrito aquí para que
   nadie ajuste este número sin darse cuenta de por qué. */
const ESPERADAS = 45;
const MUTANTES_ESPERADOS = 16;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 60));

/* fecha LOCAL de Ecuador, la misma regla que usa la pantalla */
const dia = (n) => {
  const hoy = new Date(new Date().toLocaleDateString("sv-SE", { timeZone:"America/Guayaquil" }) + "T12:00:00Z");
  const d = new Date(hoy.getTime() + n * 86400000);
  return d.toISOString().slice(0,10);
};
const HOY = dia(0), AYER = dia(-1), MANANA = dia(1), ANTEAYER = dia(-2), EN30 = dia(30);

/* ══ La base de prueba, con la forma exacta de producción ══ */
const PRODUCTOS_BD = [
  { prod_id:"P-00197", nombre:"Arroz Crecedor", estado:"activo", proveedor:"Piladora San Agustín", proveedor_cod:"AGU" },
  { prod_id:"P-00012", nombre:"Arroz Conejo",   estado:"activo", proveedor:"Piladora San Agustín", proveedor_cod:"AGU" },
];
/* Las tres presentaciones que engañan: 1 qq · 0,25 qq · 0,1 qq. La de 10
   libras es la que hace diez veces de diferencia si se lee del texto en vez
   del `equiv_qq`. */
const PRESENTACIONES_BD = [
  { prod_id:"P-00197", presentacion_cod:"QQ",  presentacion:"Quintal",         equiv_qq:1 },
  { prod_id:"P-00197", presentacion_cod:"ARR", presentacion:"Arroba",          equiv_qq:0.25 },
  { prod_id:"P-00197", presentacion_cod:"L10", presentacion:"Funda 10 libras", equiv_qq:0.1 },
  { prod_id:"P-00012", presentacion_cod:"QQ",  presentacion:"Quintal",         equiv_qq:1 },
];
const PROVEEDORES_BD = [
  { prov_cod:"AGU", nombre:"Piladora San Agustín", activo:true },
  { prov_cod:"COR", nombre:"Piladora Cordero",     activo:true },
];
/* Lo que ya está cargado en la base cuando la operadora abre la pantalla */
const PROMOS_BD = [
  { promo_id:"PM-260701-aaaaaa", org_id:"ORG-001", nombre:"Combo de julio", modalidad:"compra_lleva",
    origen:"freelance", prov_cod:"AGU", prod_id:"P-00012", pres_cod:"QQ", detalle:"Por cada 50 Quintal, 2 gratis",
    base:null, estado:"activa", vigente_desde:AYER, vigente_hasta:EN30, es_demo:false, creado:AYER },
  /* Dada de baja a mano, PERO con las fechas todavía encima de hoy: así el
     aviso de solape tiene que decidir por el ESTADO y no por la fecha. Si
     estuviera además vencida, quitar el filtro de estado no rompería nada y
     la prueba estaría fingiendo que lo vigila. */
  { promo_id:"PM-260601-bbbbbb", org_id:"ORG-001", nombre:"Promo apagada a mano", modalidad:"compra_lleva",
    origen:"freelance", prov_cod:"AGU", prod_id:"P-00197", pres_cod:"QQ", detalle:"Por cada 80 Quintal, 3 gratis",
    base:null, estado:"inactiva", vigente_desde:ANTEAYER, vigente_hasta:EN30, es_demo:false, creado:ANTEAYER },
];
const TRAMOS_BD = [
  { tramo_id:"PT-1", promo_id:"PM-260701-aaaaaa", modalidad:"compra_lleva", desde_cant:50, gratis_cant:2, es_demo:false },
  { tramo_id:"PT-2", promo_id:"PM-260601-bbbbbb", modalidad:"compra_lleva", desde_cant:80, gratis_cant:3, es_demo:false },
];

function datosDe(t) {
  if (t === "promociones")      return PROMOS_BD;
  if (t === "promocion_tramos") return TRAMOS_BD;
  if (t === "productos")        return PRODUCTOS_BD;
  if (t === "presentaciones")   return PRESENTACIONES_BD;
  if (t === "proveedores")      return PROVEEDORES_BD;
  return [];
}

/* ══ El doble de Supabase: ANOTA lo que se le manda y no escribe nada ══ */
function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.XLSX = null;

  const escrituras = [];   /* todo lo que la pantalla intentó mandar a la base */

  function consulta(tabla, filtros) {
    const resolver = () => {
      let filas = datosDe(tabla).slice();
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
      insert:(x)=>{ escrituras.push({ op:"insert", tabla:tabla, filas: Array.isArray(x)?x:[x] });
                    return Promise.resolve({ error:null }); },
      upsert:(x)=>{ escrituras.push({ op:"upsert", tabla:tabla, filas: Array.isArray(x)?x:[x] });
                    return Promise.resolve({ error:null }); },
      update:(x)=>{ const r = Promise.resolve({ error:null });
                    r.eq = (c,v) => { escrituras.push({ op:"update", tabla:tabla, filas:[x], donde:[c,v] });
                                      return Promise.resolve({ error:null }); };
                    return r; },
      delete:()=>({ eq:(c,v)=>{ escrituras.push({ op:"delete", tabla:tabla, donde:[c,v] });
                                return Promise.resolve({ error:null }); } }),
    };
    return enc;
  }
  w.supa = {
    auth: { getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } }),
            onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
            getUser: async () => ({ data:{ user:{ id:"u1" } } }), signOut: async () => ({}) },
    from: (t) => consulta(t, []),
    rpc: async () => ({ data:null }),
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx);
  vm.runInContext(R.reactDomDev(), ctx);
  vm.runInContext(js, ctx);

  /* Un reloj de mentira, para poder pararse a las 22:30 de Guayaquil (que en
     Greenwich ya es el día siguiente) y ver de qué lado cae cada fecha. */
  vm.runInContext(`
    window.__conReloj = function(iso, fn){
      var Real = Date;
      function F(a){ return arguments.length ? new Real(a) : new Real(iso); }
      F.prototype = Real.prototype;
      F.now = function(){ return Real.parse(iso); };
      F.parse = Real.parse; F.UTC = Real.UTC;
      Date = F;
      try { return fn(); } finally { Date = Real; }
    };
    window.__texto = function(){ return (window.__c && window.__c.textContent) || ""; };
    /* el elemento MÁS CHICO que contiene ese texto: así se toca el botón y no
       la caja que lo envuelve. Con "<=" gana el más PROFUNDO cuando varios
       tienen el mismo texto (una opción de lista es <div><div><p>…): tocar el
       de afuera no sirve, porque los eventos suben, no bajan. */
    window.__porTexto = function(sel, txt){
      var todos = window.__c.querySelectorAll(sel), mejor = null;
      for (var i=0;i<todos.length;i++){
        var t = (todos[i].textContent||"");
        if (t.indexOf(txt) >= 0 && (!mejor || t.length <= (mejor.textContent||"").length)) mejor = todos[i];
      }
      return mejor;
    };
    window.__tocar = function(sel, txt){
      var e = window.__porTexto(sel, txt);
      if (!e) return false;
      e.dispatchEvent(new window.MouseEvent("click", { bubbles:true }));
      return true;
    };
    window.__mousedown = function(sel, txt){
      var e = window.__porTexto(sel, txt);
      if (!e) return false;
      e.dispatchEvent(new window.MouseEvent("mousedown", { bubbles:true }));
      return true;
    };
    window.__caja = function(ph){
      var cajas = window.__c.querySelectorAll("input");
      for (var i=0;i<cajas.length;i++)
        if ((cajas[i].getAttribute("placeholder")||"") === ph) return cajas[i];
      return null;
    };
    window.__escribir = function(ph, texto){
      var caja = window.__caja(ph);
      if (!caja) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input", { bubbles:true }));
      return true;
    };
    /* las fechas no tienen placeholder: se buscan por tipo y orden */
    window.__fecha = function(i, texto){
      var cajas = window.__c.querySelectorAll("input[type=date]");
      if (!cajas[i]) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(cajas[i], texto);
      cajas[i].dispatchEvent(new window.Event("input", { bubbles:true }));
      return true;
    };
    window.__elegirEnLista = function(i, valor){
      var sels = window.__c.querySelectorAll("select");
      if (!sels[i]) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,"value").set;
      set.call(sels[i], valor);
      sels[i].dispatchEvent(new window.Event("change", { bubbles:true }));
      return true;
    };
    window.__pintar = function(){
      window.__c = document.createElement("div");
      document.body.appendChild(window.__c);
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__c).render(React.createElement(PromocionesWeb, {
          usuario: { usuario:"richard", nombre:"Richard Ramírez", cargo:"freelance",
                     rol:"Freelance", empresaId:"EMP-001", secciones:[] } }));
      });
    };
  `, ctx);
  return { ctx, w, escrituras };
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* ══ La batería. Corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };
  const m = montar(js);
  const J = JSON.stringify;
  const llamar = (fn, ...args) => corre(m, `${fn}(${args.map(J).join(",")})`);

  /* ── A) EL TEXTO EN CRIOLLO · las tres presentaciones que engañan ── */
  const tramo = { modalidad:"compra_lleva", desde_cant:100, gratis_cant:2 };
  const cQQ  = llamar("promoCriollo", "compra_lleva", tramo, "Quintal", 1);
  const cARR = llamar("promoCriollo", "compra_lleva", tramo, "Arroba", 0.25);
  const cLB  = llamar("promoCriollo", "compra_lleva", tramo, "Funda 10 libras", 0.1);

  comprobar("QUINTAL (1 qq) · lo dice como se lo dirías al cliente: «Por cada 100 Quintal, 2 gratis»",
    cQQ.linea === "Por cada 100 Quintal, 2 gratis");
  comprobar("QUINTAL · y a cuánto grano equivale: 100,00 qq comprados y 2,00 qq de regalo",
    cQQ.qq === "Son 100,00 qq comprados y 2,00 qq de regalo.");
  comprobar("ARROBA (0,25 qq) · el trato se dice en arrobas: «Por cada 100 Arroba, 2 gratis»",
    cARR.linea === "Por cada 100 Arroba, 2 gratis");
  comprobar("ARROBA · pero el grano es CUATRO veces menos: 25,00 qq comprados y 0,50 qq de regalo",
    cARR.qq === "Son 25,00 qq comprados y 0,50 qq de regalo.");
  comprobar("FUNDA DE 10 LIBRAS (0,1 qq) · «Por cada 100 Funda 10 libras, 2 gratis»",
    cLB.linea === "Por cada 100 Funda 10 libras, 2 gratis");
  comprobar("FUNDA · y el grano es DIEZ veces menos: 10,00 qq comprados y 0,20 qq de regalo",
    cLB.qq === "Son 10,00 qq comprados y 0,20 qq de regalo.");
  comprobar("un escalón a medio llenar (sin las gratis) no promete nada",
    llamar("promoCriollo", "compra_lleva", { modalidad:"compra_lleva", desde_cant:100 }, "Quintal", 1).linea === "");
  comprobar("el descuento por volumen se dice distinto: «Desde 100 Quintal, cada uno a $39,00»",
    llamar("promoCriollo", "descuento_volumen", { modalidad:"descuento_volumen", desde_cant:100, precio_unit:39 }, "Quintal", 1)
      .linea === "Desde 100 Quintal, cada uno a $39,00");

  /* ── B) LOS AVISOS · lo que se ve ANTES de guardar ── */
  const base = { promoId:null, nombre:"Combo de agosto", prodId:"P-00197", presCod:"QQ",
    presNombre:"Quintal", equivQQ:1, provCod:"AGU", origen:"freelance", modalidad:"compra_lleva",
    desde:HOY, hasta:EN30, escalones:[{ desde:"100", gratis:"2" }] };
  const avisos = (cambios, otras) => llamar("promoAvisos", Object.assign({}, base, cambios||{}), otras || []);
  const tiene = (lista, trozo) => lista.some(x => x.indexOf(trozo) >= 0);

  const alReves = avisos({ desde:EN30, hasta:HOY });
  comprobar("VIGENCIA AL REVÉS · avisa, y dice las dos fechas para que se vea el disparate",
    tiene(alReves, "Las fechas están al revés") &&
    alReves.some(x => x.indexOf("termina el ") >= 0 && x.indexOf("empieza el ") >= 0));
  comprobar("con las fechas al derecho no inventa ese aviso",
    !tiene(avisos({}), "Las fechas están al revés"));
  comprobar("SIN ESCALONES · avisa que falta la regla (y la base tampoco la dejaría activar)",
    tiene(avisos({ escalones:[{ desde:"", gratis:"" }] }), "Falta la regla"));
  comprobar("un escalón a medio llenar cuenta como si no hubiera ninguno",
    tiene(avisos({ escalones:[{ desde:"100", gratis:"" }] }), "Falta la regla"));
  comprobar("SIN PRESENTACIÓN · avisa, y explica por qué importa (quintal ≠ arroba)",
    tiene(avisos({ presCod:"" }), "Elige la presentación"));
  comprobar("sin nombre · avisa",
    tiene(avisos({ nombre:"  " }), "Ponle un nombre"));
  comprobar("dice que la paga la piladora pero no elige cuál · avisa",
    tiene(avisos({ origen:"proveedor", provCod:"" }), "elige cuál"));
  comprobar("SE PISA CON OTRA EN PIE · avisa con el nombre de la que estorba y sus fechas",
    tiene(avisos({ prodId:"P-00012" }, PROMOS_BD), "«Combo de julio»") &&
    tiene(avisos({ prodId:"P-00012" }, PROMOS_BD), "Dale de baja primero"));
  comprobar("una promoción ya dada de baja NO estorba: se puede cargar la nueva encima",
    !tiene(avisos({}, PROMOS_BD), "Ya hay otra promoción en pie"));
  comprobar("la misma fecha en OTRA presentación tampoco estorba (son dos tratos distintos)",
    !tiene(avisos({ prodId:"P-00012", presCod:"ARR" }, PROMOS_BD), "Ya hay otra promoción en pie"));
  comprobar("un formulario completo y limpio no tiene ni un aviso",
    avisos({}).length === 0);

  /* ── C) LO QUE VIAJA A LA BASE ── */
  const filas = llamar("promoFilas", Object.assign({}, base, {
    escalones:[{ desde:"200", gratis:"6" }, { desde:"100", gratis:"2" }] }), "PM-260806-abc123");
  comprobar("la cabecera NACE PENDIENTE: activar sin escalones lo prohíbe el guardia de la base",
    filas.cabecera.estado === "pendiente");
  comprobar("lleva el producto y la presentación elegidos, no los adivina",
    filas.cabecera.prod_id === "P-00197" && filas.cabecera.pres_cod === "QQ");
  comprobar("lleva quién la paga y con qué piladora",
    filas.cabecera.origen === "freelance" && filas.cabecera.prov_cod === "AGU");
  comprobar("los escalones salen ORDENADOS de menor a mayor y con los números tecleados",
    filas.tramos.length === 2 &&
    filas.tramos[0].desde_cant === 100 && filas.tramos[0].gratis_cant === 2 &&
    filas.tramos[1].desde_cant === 200 && filas.tramos[1].gratis_cant === 6);
  comprobar("cada modalidad llena SOLO su columna, como manda el CHECK de la base",
    filas.tramos[0].precio_unit === null && filas.tramos[0].desc_monto === null && filas.tramos[0].desc_pct === null);
  comprobar("el resumen de la cabecera sale del escalón de ARRANQUE, no del más alto",
    filas.cabecera.detalle === "Por cada 100 Quintal, 2 gratis");
  comprobar("«Todas las presentaciones» viaja como NULL, que es lo que la base entiende por «en quintales»",
    llamar("promoFilas", Object.assign({}, base, { presCod:"*" }), "PM-X").cabecera.pres_cod === null);
  comprobar("sin fecha de fin viaja NULL, y nada se marca como demostración",
    llamar("promoFilas", Object.assign({}, base, { hasta:"" }), "PM-X").cabecera.vigente_hasta === null &&
    filas.cabecera.es_demo === false && filas.cabecera.org_id === "ORG-001");

  /* ── D) LA HORA DE ECUADOR, NO LA DE GREENWICH ──
     A las 22:30 del 9 de agosto en Guayaquil, en Greenwich ya es el 10. Una
     promoción guardada con toISOString() empezaría a regir cinco horas antes
     de lo que dice el papel. */
  const reloj = corre(m, `window.__conReloj("2026-08-10T03:30:00Z", function(){
    return [ promoHoyEC(), new Date().toISOString().slice(0,10) ]; })`);
  comprobar("a las 22:30 del 9 de agosto en Guayaquil, la pantalla dice 9 de agosto",
    reloj[0] === "2026-08-09");
  comprobar("(y en ese mismo instante toISOString() ya diría 10 de agosto: ese es el error que se evita)",
    reloj[1] === "2026-08-10");

  /* ── E) LA PANTALLA, MANEJADA COMO LA MANEJA LA OFICINA ── */
  corre(m, `window.__pintar()`);
  await esperar(120);
  corre(m, `ReactDOM.flushSync(function(){})`);
  const txtLista = corre(m, `window.__texto()`);
  comprobar("la lista muestra lo que ya está cargado en la base, con su regla en criollo",
    txtLista.indexOf("Combo de julio") >= 0 && txtLista.indexOf("Por cada 50 Quintal, 2 gratis") >= 0);
  comprobar("y su estado y su vigencia, para saber si está regalando o no",
    txtLista.indexOf("Activa") >= 0 && txtLista.indexOf("Dada de baja") >= 0);

  const abrio = corre(m, `window.__tocar("button", "+ Nueva promoción")`);
  await esperar(30);
  const txtForm = corre(m, `window.__texto()`);
  comprobar("«+ Nueva promoción» abre el formulario, con sus pasos numerados",
    abrio === true && txtForm.indexOf("Nombre de la promoción") >= 0 && txtForm.indexOf("Los escalones") >= 0);

  /* Llenarlo como lo llenaría una operadora: nombre, producto, presentación,
     y los dos números del trato. */
  corre(m, `window.__escribir("Ej: Combo de agosto · Arroz Crecedor", "Combo de agosto")`);
  corre(m, `window.__escribir("Escribe el nombre del producto…", "Crecedor")`);
  await esperar(30);
  const eligio = corre(m, `window.__mousedown("div", "Arroz Crecedor")`);
  await esperar(30);
  corre(m, `window.__elegirEnLista(0, "QQ")`);
  await esperar(30);
  corre(m, `window.__escribir("100", "100")`);
  corre(m, `window.__escribir("2", "2")`);
  await esperar(30);
  const txtLleno = corre(m, `window.__texto()`);
  comprobar("mientras se teclea, la pantalla ya dice en criollo lo que va a pasar",
    eligio === true && txtLleno.indexOf("Por cada 100 Quintal, 2 gratis") >= 0);
  comprobar("y a cuántos quintales equivale, que es lo que de verdad se regala",
    txtLleno.indexOf("Son 100,00 qq comprados y 2,00 qq de regalo.") >= 0);

  /* La misma promoción en ARROBAS: el texto tiene que cambiar solo */
  corre(m, `window.__elegirEnLista(0, "ARR")`);
  await esperar(30);
  const txtArr = corre(m, `window.__texto()`);
  comprobar("al cambiar a arrobas el criollo se corrige solo: mismo trato, cuatro veces menos grano",
    txtArr.indexOf("Por cada 100 Arroba, 2 gratis") >= 0 &&
    txtArr.indexOf("Son 25,00 qq comprados y 0,50 qq de regalo.") >= 0);
  corre(m, `window.__elegirEnLista(0, "QQ")`);
  await esperar(30);

  /* ── Con la vigencia AL REVÉS no se manda nada a la base ── */
  corre(m, `window.__fecha(1, ${J(AYER)})`);
  await esperar(30);
  m.escrituras.length = 0;
  corre(m, `window.__tocar("button", "Guardar y activar")`);
  await esperar(60);
  const txtMal = corre(m, `window.__texto()`);
  comprobar("con la vigencia al revés NO se manda nada a la base y el aviso se ve en pantalla",
    m.escrituras.length === 0 && txtMal.indexOf("Las fechas están al revés") >= 0);

  /* ── Sin escalones tampoco ── */
  corre(m, `window.__fecha(1, "")`);
  corre(m, `window.__escribir("2", "")`);
  await esperar(30);
  m.escrituras.length = 0;
  corre(m, `window.__tocar("button", "Guardar y activar")`);
  await esperar(60);
  const txtSin = corre(m, `window.__texto()`);
  comprobar("sin escalones tampoco se manda nada, y dice qué falta",
    m.escrituras.length === 0 && txtSin.indexOf("Falta la regla") >= 0);

  /* ── Y ahora bien: se guarda y se activa ── */
  corre(m, `window.__escribir("2", "2")`);
  await esperar(30);
  m.escrituras.length = 0;
  corre(m, `window.__tocar("button", "Guardar y activar")`);
  await esperar(120);
  const ins = m.escrituras.filter(e => e.op === "insert" && e.tabla === "promociones");
  const insT = m.escrituras.filter(e => e.op === "insert" && e.tabla === "promocion_tramos");
  const upd = m.escrituras.filter(e => e.op === "update" && e.tabla === "promociones");
  const cab = ins.length ? ins[0].filas[0] : {};
  const trm = insT.length ? insT[0].filas[0] : {};
  comprobar("la cabecera llega a `promociones` con el producto, la presentación y la piladora elegidos",
    ins.length === 1 && cab.prod_id === "P-00197" && cab.pres_cod === "QQ" && cab.prov_cod === "AGU" &&
    cab.nombre === "Combo de agosto" && cab.origen === "freelance" && cab.modalidad === "compra_lleva");
  comprobar("el escalón llega a `promocion_tramos` con los números tecleados: por cada 100, 2 gratis",
    insT.length === 1 && insT[0].filas.length === 1 &&
    trm.desde_cant === 100 && trm.gratis_cant === 2 && trm.modalidad === "compra_lleva");
  comprobar("y ese escalón no lleva basura en las columnas de las otras modalidades",
    trm.precio_unit === null && trm.desc_monto === null && trm.desc_pct === null);
  comprobar("PRIMERO la cabecera pendiente, DESPUÉS los escalones y AL FINAL el activar: así el guardia de la base no la tumba",
    cab.estado === "pendiente" && upd.length === 1 && upd[0].filas[0].estado === "activa" &&
    m.escrituras.indexOf(ins[0]) < m.escrituras.indexOf(insT[0]) &&
    m.escrituras.indexOf(insT[0]) < m.escrituras.indexOf(upd[0]));
  comprobar("la fecha de inicio es la de HOY en Ecuador, no la de Greenwich",
    cab.vigente_desde === HOY);
  comprobar("nada de lo guardado se marca como demostración",
    cab.es_demo === false && trm.es_demo === false);

  /* ── «Guardar sin activar» deja la promoción quieta ── */
  const m2 = montar(js);
  corre(m2, `window.__pintar()`);
  await esperar(120);
  corre(m2, `window.__tocar("button", "+ Nueva promoción")`);
  await esperar(30);
  corre(m2, `window.__escribir("Ej: Combo de agosto · Arroz Crecedor", "Combo tranquilo")`);
  corre(m2, `window.__escribir("Escribe el nombre del producto…", "Crecedor")`);
  await esperar(30);
  corre(m2, `window.__mousedown("div", "Arroz Crecedor")`);
  await esperar(30);
  corre(m2, `window.__elegirEnLista(0, "QQ")`);
  await esperar(30);
  corre(m2, `window.__escribir("100", "100")`);
  corre(m2, `window.__escribir("2", "2")`);
  await esperar(30);
  m2.escrituras.length = 0;
  corre(m2, `window.__tocar("button", "Guardar sin activar")`);
  await esperar(120);
  const ins2 = m2.escrituras.filter(e => e.op === "insert" && e.tabla === "promociones");
  const upd2 = m2.escrituras.filter(e => e.op === "update" && e.tabla === "promociones");
  comprobar("«Guardar sin activar» la deja PENDIENTE y no la pone a regalar",
    ins2.length === 1 && ins2[0].filas[0].estado === "pendiente" && upd2.length === 0);
  const txtFin = corre(m2, `window.__texto()`);
  comprobar("y avisa en pantalla que quedó pendiente de aprobar",
    txtFin.indexOf("quedó pendiente de aprobar") >= 0);

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  /* TONTAS y directas: si estas no tumban la prueba, la prueba no mide nada */
  ["TONTA · le suma 1 a las gratis en el texto que lee el usuario",
   `linea: "Por cada " + promoCant(d) + " " + pres + ", " + promoCant(g) + " gratis",`,
   `linea: "Por cada " + promoCant(d) + " " + pres + ", " + promoCant(g+1) + " gratis",`],
  ["TONTA · le suma 1 a la cantidad que hay que comprar",
   `const compra = "Son " + promoNum(d*eq) + " qq comprados";`,
   `const compra = "Son " + promoNum(d*eq+1) + " qq comprados";`],
  ["TONTA · le suma 1 al escalón que se guarda en la base",
   `const t = { modalidad:modalidad, desde_cant:num(f.desde),`,
   `const t = { modalidad:modalidad, desde_cant:num(f.desde)+1,`],
  ["TONTA · le suma 1 a los quintales de regalo",
   `qq: compra + " y " + promoNum(g*eq) + " qq de regalo." };`,
   `qq: compra + " y " + promoNum(g*eq+1) + " qq de regalo." };`],
  /* semánticas */
  ["se olvida de la presentación: todo vale un quintal (regala 4× y 10× de más)",
   `const eq = Number(equivQQ) > 0 ? Number(equivQQ) : 1;`,
   `const eq = 1;`],
  ["deja de avisar la vigencia al revés",
   `  if (form.desde && form.hasta && String(form.hasta) < String(form.desde))\n    a.push("Las fechas están al revés`,
   `  if (false)\n    a.push("Las fechas están al revés`],
  ["compara las fechas al revés: avisa cuando está bien y calla cuando está mal",
   `if (form.desde && form.hasta && String(form.hasta) < String(form.desde))`,
   `if (form.desde && form.hasta && String(form.hasta) > String(form.desde))`],
  ["deja pasar una promoción sin ni un escalón",
   `  if (tramos.length === 0)`, `  if (false)`],
  ["un escalón a medio llenar cuenta como bueno",
   `if (t.modalidad === "compra_lleva")      return Number(t.gratis_cant) > 0;`,
   `if (t.modalidad === "compra_lleva")      return true;`],
  ["la cabecera nace ACTIVA y se pelea con el guardia de la base",
   `    base: null, estado:"pendiente",`, `    base: null, estado:"activa",`],
  ["el aviso de que se pisan dos promociones no mira el estado: una vencida estorba igual",
   `    if (PROMO_EN_PIE.indexOf(o.estado) < 0) return;`, ``],
  ["el aviso de que se pisan dos promociones no mira la presentación",
   `    if ((o.pres_cod || null) !== pc) return;`, ``],
  ["deja de avisar que falta elegir la presentación",
   `  if (!form.presCod)`, `  if (false)`],
  ["las fechas salen de Greenwich y no de Ecuador (la promo rige 5 horas antes)",
   `  return new Date().toLocaleDateString("sv-SE", { timeZone:"America/Guayaquil" });`,
   `  return new Date().toISOString().slice(0,10);`],
  ["«todas las presentaciones» se guarda como «*» en vez de NULL",
   `  return (!f || !f.presCod || f.presCod === "*") ? null : f.presCod;`,
   `  return (!f || !f.presCod) ? null : f.presCod;`],
  ["los escalones se guardan al revés y el resumen sale del escalón más alto",
   `    .filter(promoTramoValido).sort((a,b) => a.desde_cant - b.desde_cant);`,
   `    .filter(promoTramoValido).sort((a,b) => b.desde_cant - a.desde_cant);`],
];

(async () => {
  console.log("═══ Cargar una promoción sin SQL · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
      (ok + mal - 1) + ". Alguna se perdió o se agregó sin declararla.");
  }

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

  console.log("Resultado de la carga de promociones: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
