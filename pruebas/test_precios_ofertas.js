/* ═══════════════════════════════════════════════════════════════════════
   EL PRECIO VIVE EN LA OFERTA DE LA PILADORA · sistema-web

   Qué se rompía, reproducido con un fixture completamente sintético:
   la tabla `precios` quedó congelada el 24/07/2026 con 58 filas y ninguna
   nueva. `ofertas_piladora` tiene 153 filas vigentes y recibió datos el
   05/08. Ninguna app del celular lee ya `precios`. El único que todavía
   ESCRIBÍA ahí era el sistema web: alguien de oficina subía el arroz de $37
   a $39 en la pantalla de Precios, veía «guardado», y el vendedor seguía
   cotizando $37. Nadie avisaba. Y `ModalLotePrecios` hacía lo mismo en
   bloque, multiplicando el daño.

   LO QUE ESTA PRUEBA VIGILA, en orden de importancia:

   1) QUE NO QUEDE NINGÚN CAMINO QUE ESCRIBA EN `precios`. Se mide de dos
      formas para que no se escape: leyendo el fuente (ningún insert/update/
      upsert/delete sobre esa tabla) y en vivo (se corre la pantalla entera,
      se guarda de verdad contra un doble, y se revisa que ni una escritura
      haya ido a `precios`). El día que alguien lo reintroduzca, esto se cae.
      Lo que SÍ se conserva es la LECTURA del historial viejo, rotulada.

   2) QUE EL PRECIO NUEVO SE VEA ANTES DE GUARDAR. El bloque toca producción
      y no se deshace con un botón: si guarda a ciegas, no sirve.

   3) QUE EL MARGEN SE MANTENGA. Medido sobre las 153 ofertas vigentes:
      precio_contado − costo_contado == precio_credito − costo en 152 de 153;
      la utilidad en DÓLARES por quintal va de $2 a $10, pero en PORCENTAJE va
      de 6,33 % a 30 %. O sea: lo que la casa mantiene es el dólar por
      quintal, no el porcentaje. Por eso «mantener el margen» = el precio se
      mueve exactamente lo mismo que se movió el costo.

   4) QUE EL BLOQUE TOQUE SÓLO LA PILADORA ELEGIDA. Cada piladora cobra
      distinto y sube cuando quiere; mover a las cinco de un golpe sería peor
      que no tener el botón.

   5) LAS TRES PRESENTACIONES QUE ENGAÑAN: 1 qq · 0,25 qq · 0,1 qq. Un alza
      de $1 por quintal es $0,25 en la arroba y $0,10 en la funda de 10
      libras. Leerlo mal es cuatro y diez veces de diferencia.

   NO SE ESCRIBE EN LA BASE DE VERDAD: el `supa` de aquí es un doble que anota
   lo que se le manda y devuelve datos con la forma de producción.

   NACE ROJA a propósito: al final se rompe la regla en el fuente, una rotura
   a la vez, y se comprueba que la prueba SE CAE. Hay roturas TONTAS (sumarle
   1 a un precio) además de las semánticas: una rotura lista se puede
   neutralizar con los datos de prueba y hacer creer que la prueba mide
   cuando el malo es el mutante; la tonta lo delata.

   Uso: node test_precios_ofertas.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una que se borre sin querer no pase inadvertida. ── */
/* Se declararon 44 al escribirlas y corrieron 50: se contaron mal a mano seis
   del bloque del guardado (las de auditoría, versionado, crédito y el aviso
   final quedaron agrupadas como una). El aviso de abajo lo cazó en la primera
   pasada; queda escrito aquí para que nadie ajuste este número sin saber por qué. */
const ESPERADAS = 50;
const MUTANTES_ESPERADOS = 16;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 60));
/* HOY en Ecuador (America/Guayaquil), la MISMA cuenta que preHoy()=hoyECWeb() en la
   app. Antes se usaba toISOString() (UTC): entre las 00:00 y 05:00 UTC eso adelanta
   un día y la prueba se ponía roja de madrugada aunque la app estuviera bien. */
const HOY = new Date().toLocaleString("sv-SE", { timeZone:"America/Guayaquil" }).slice(0,10);

/* ══ La base de prueba, con la forma del contrato de producción ══
   Los números son completamente sintéticos: el costo de
   crédito es el de contado más $1,00 por quintal, y el precio de crédito es
   el de contado más $1,00 por quintal. La utilidad al contado y a crédito
   son la MISMA en dólares. */
const PRODUCTOS_BD = [
  { prod_id:"P-00012", nombre:"Producto Demo A", linea:"Arroz", estado:"activo" },
  { prod_id:"P-00195", nombre:"Producto Demo B", linea:"Arroz", estado:"activo" },
  { prod_id:"P-00300", nombre:"Producto Demo C", linea:"Maíz",  estado:"activo" },
  /* P-BAJA NO está: es un producto dado de baja que todavía tiene oferta viva */
];
const PROVEEDORES_BD = [
  { prov_cod:"AGU", nombre:"Proveedor Demo A" },
  { prov_cod:"ROS", nombre:"Proveedor Demo B" },
];
/* El orden importa: la vista previa respeta el orden en que llegan. */
const OFERTAS_BD = [
  /* Producto Demo A · Proveedor Demo A · las TRES presentaciones que engañan */
  { oferta_id:"P-00012-QQ-AGU",  prod_id:"P-00012", pres_cod:"QQ",  presentacion:"Quintal",         equiv_qq:1,
    prov_cod:"AGU", costo:19,   costo_contado:18,   precio_contado:22,   precio_credito:23,   margen_min:8, vigente_desde:"2026-07-01", vigente_hasta:null },
  { oferta_id:"P-00012-ARR-AGU", prod_id:"P-00012", pres_cod:"ARR", presentacion:"Arroba",          equiv_qq:0.25,
    prov_cod:"AGU", costo:4.75, costo_contado:4.50, precio_contado:5.50, precio_credito:5.75, margen_min:8, vigente_desde:"2026-07-01", vigente_hasta:null },
  { oferta_id:"P-00012-L10-AGU", prod_id:"P-00012", pres_cod:"L10", presentacion:"Funda 10 libras", equiv_qq:0.1,
    prov_cod:"AGU", costo:1.90, costo_contado:1.80, precio_contado:2.20, precio_credito:2.30, margen_min:8, vigente_desde:"2026-07-01", vigente_hasta:null },
  /* Producto Demo B · DOS proveedores con valores distintos por lo mismo */
  { oferta_id:"P-00195-QQ-AGU",  prod_id:"P-00195", pres_cod:"QQ",  presentacion:"Quintal",         equiv_qq:1,
    prov_cod:"AGU", costo:21,   costo_contado:20,   precio_contado:22.50, precio_credito:23.50, margen_min:8, vigente_desde:"2026-07-20", vigente_hasta:null },
  { oferta_id:"P-00195-QQ-ROS",  prod_id:"P-00195", pres_cod:"QQ",  presentacion:"Quintal",         equiv_qq:1,
    prov_cod:"ROS", costo:20,   costo_contado:19,   precio_contado:22.50, precio_credito:23.50, margen_min:8, vigente_desde:"2026-07-20", vigente_hasta:null },
  /* Otra línea de grano de la MISMA piladora: no se debe mover con el arroz */
  { oferta_id:"P-00300-QQ-AGU",  prod_id:"P-00300", pres_cod:"QQ",  presentacion:"Quintal",         equiv_qq:1,
    prov_cod:"AGU", costo:31,   costo_contado:30,   precio_contado:34,   precio_credito:35,   margen_min:8, vigente_desde:"2026-07-01", vigente_hasta:null },
  /* Oferta viva de un producto dado de baja: se deja fuera y se avisa */
  { oferta_id:"P-BAJA-QQ-AGU",   prod_id:"P-BAJA",  pres_cod:"QQ",  presentacion:"Quintal",         equiv_qq:1,
    prov_cod:"AGU", costo:99,   costo_contado:98,   precio_contado:120,  precio_credito:121,  margen_min:8, vigente_desde:"2026-01-01", vigente_hasta:null },
];
/* La cadena vieja de `precios`, congelada en julio. Sólo la lee el historial. */
const PRECIOS_BD = [
  { prod_id:"P-00012", producto:"Producto Demo A", base_contado:21, base_credito:22, costo_prov:18,
    origen:"Ajuste manual", motivo:"", vigente_desde:"2026-07-24", vigente_hasta:null },
];

function datosDe(t) {
  if (t === "v_ofertas_vigentes") return OFERTAS_BD;
  if (t === "ofertas_piladora")   return OFERTAS_BD;
  if (t === "productos")          return PRODUCTOS_BD;
  if (t === "proveedores")        return PROVEEDORES_BD;
  if (t === "precios")            return PRECIOS_BD;
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
  const lecturas = [];     /* de qué tablas leyó */

  function consulta(tabla, filtros) {
    const resolver = () => {
      let filas = datosDe(tabla).slice();
      filtros.forEach(f => {
        if (f[0] === "eq")  filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq") filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "in")  filas = filas.filter(r => (f[2]||[]).indexOf(r[f[1]]) >= 0);
      });
      lecturas.push(tabla);
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
                    r.is = () => r;
                    return r; },
      delete:()=>({ eq:(c,v)=>{ escrituras.push({ op:"delete", tabla:tabla, donde:[c,v] });
                                return Promise.resolve({ error:null }); } }),
    };
    return enc;
  }
  w.supa = {
    auth: { getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"qa@example.invalid" } } } }),
            onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
            getUser: async () => ({ data:{ user:{ id:"u1" } } }), signOut: async () => ({}) },
    from: (t) => consulta(t, []),
    rpc: async (nombre) => nombre==="mi_org_activa" ? { data:"ORG-001", error:null } : { data:null, error:null },
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx);
  vm.runInContext(R.reactDomDev(), ctx);
  vm.runInContext(js, ctx);

  vm.runInContext(`
    window.__texto = function(){ return (window.__c && window.__c.textContent) || ""; };
    /* el elemento MÁS CHICO que contiene ese texto: así se toca el botón y no
       la caja que lo envuelve. Los eventos suben, no bajan. */
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
    window.__escribir = function(ph, texto){
      var cajas = window.__c.querySelectorAll("input"), caja = null;
      for (var i=0;i<cajas.length;i++)
        if ((cajas[i].getAttribute("placeholder")||"") === ph) { caja = cajas[i]; break; }
      if (!caja) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input", { bubbles:true }));
      return true;
    };
    /* las cajas de corregir el precio no tienen placeholder fijo: van por orden */
    window.__cuantosNumero = function(){ return window.__c.querySelectorAll("input[type=number]").length; };
    window.__escribirNumero = function(i, texto){
      var cajas = window.__c.querySelectorAll("input[type=number]");
      if (!cajas[i]) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(cajas[i], texto);
      cajas[i].dispatchEvent(new window.Event("input", { bubbles:true }));
      return true;
    };
    window.__cuantasCasillas = function(){ return window.__c.querySelectorAll("input[type=checkbox]").length; };
    window.__destildar = function(i){
      var cs = window.__c.querySelectorAll("input[type=checkbox]");
      if (!cs[i]) return false;
      cs[i].dispatchEvent(new window.MouseEvent("click", { bubbles:true }));
      return true;
    };
    window.__pintar = function(){
      window.__c = document.createElement("div");
      document.body.appendChild(window.__c);
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__c).render(React.createElement(PreciosWeb, {
          usuario: { usuario:"qa", nombre:"Usuario QA", cargo:"freelance",
                     rol:"Freelance", empresaId:"ORG-001", secciones:[] } }));
      });
    };
  `, ctx);
  return { ctx, w, escrituras, lecturas };
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* ── ¿Queda algún camino que ESCRIBA en `precios`? ──
   Se mira el fuente: por cada `from("precios")` se revisan los 400 caracteres
   siguientes buscando un verbo de escritura. Leer está permitido (el
   historial viejo); escribir, no. */
function escribeEnPrecios(fuente) {
  /* comillas dobles o simples, con o sin espacios: el que lo reintroduzca no
     se escapa por escribirlo distinto */
  const RE = /from\s*\(\s*["']precios["']\s*\)/g;
  let m;
  while ((m = RE.exec(fuente)) !== null) {
    const cola = fuente.slice(m.index + m[0].length, m.index + m[0].length + 400);
    if (/\.(insert|update|upsert|delete)\s*\(/.test(cola)) return true;
  }
  return false;
}

/* ══ La batería. Corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, fuente, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };
  const m = montar(js);
  const J = JSON.stringify;
  const txt = () => corre(m, "window.__texto()");
  const money = (n) => corre(m, "preMoney(" + n + ")");

  /* ══ A) EL CERROJO · que no quede ningún camino que escriba en `precios` ══ */
  comprobar("CERROJO · ningún insert/update/upsert/delete sobre `precios` en todo el fuente",
    !escribeEnPrecios(fuente));
  comprobar("CERROJO · `preCambiarPrecio` (la puerta de escritura vieja) ya no existe",
    fuente.indexOf("function preCambiarPrecio") < 0 && fuente.indexOf("preCambiarPrecio(") < 0);
  comprobar("CERROJO · `ModalLotePrecios` (la subida en bloque a `precios`) ya no existe",
    fuente.indexOf("function ModalLotePrecios") < 0 && fuente.indexOf("<ModalLotePrecios") < 0);
  comprobar("CERROJO · `ModalAjustePrecio` ya no existe (estaba muerto pero sostenía una escritura)",
    fuente.indexOf("function ModalAjustePrecio") < 0);
  comprobar("el historial viejo SÍ se conservó: sigue LEYENDO `precios`",
    fuente.indexOf('from("precios")') >= 0);
  comprobar("y se rotula como historia vieja, para que nadie crea que es el precio de hoy",
    /Historial anterior de precios/.test(fuente) && /Esto es historia vieja/.test(fuente));

  /* ══ B) LA PANTALLA HONESTA · muestra las ofertas vigentes ══ */
  corre(m, "window.__pintar()");
  await esperar(320);
  const t0 = txt();

  comprobar("al abrir la pantalla NO se escribe una sola cosa en la base",
    m.escrituras.length === 0);
  comprobar("la pantalla lee `v_ofertas_vigentes` y NO lee `precios`",
    m.lecturas.indexOf("v_ofertas_vigentes") >= 0 && m.lecturas.indexOf("precios") < 0);
  comprobar("en pantalla: se ve el producto por su nombre",
    /Producto Demo A/.test(t0) && /Producto Demo B/.test(t0));
  comprobar("en pantalla: se ve la presentación con su equivalencia en quintales",
    /Funda 10 libras/.test(t0) && /\(0\.1 qq\)/.test(t0) && /Arroba/.test(t0) && /\(0\.25 qq\)/.test(t0));
  comprobar("en pantalla: se ve la PILADORA por su nombre, no el código pelado",
    /Proveedor Demo A/.test(t0) && /Proveedor Demo B/.test(t0));
  comprobar("en pantalla: se ve el precio de CONTADO de la oferta",
    t0.indexOf("contado " + money(22)) >= 0);
  comprobar("en pantalla: se ve el precio de CRÉDITO de la oferta",
    t0.indexOf("crédito " + money(23)) >= 0);
  comprobar("en pantalla: se ve desde cuándo rige cada oferta",
    /Rige desde/.test(t0) && /2026-07-20/.test(t0));
  comprobar("en pantalla: avisa cuando dos piladoras cobran DISTINTO por lo mismo",
    /costos distintos/.test(t0) && /dos piladoras te cobran distinto/.test(t0));
  comprobar("en pantalla: dice en criollo que el precio vive en la oferta de cada piladora",
    /El precio ya no se escribe aquí: vive en la oferta de cada piladora/.test(t0));

  /* ══ C) LA CUENTA · mantener el margen es mantener el DÓLAR por quintal ══
     Los tres renglones son los de Producto Demo A: quintal, arroba y funda. */
  const oQQ  = { costo:19,   costoContado:18,   contado:22,   credito:23,   equivQq:1 };
  const oARR = { costo:4.75, costoContado:4.50, contado:5.50, credito:5.75, equivQq:0.25 };
  const oL10 = { costo:1.90, costoContado:1.80, contado:2.20, credito:2.30, equivQq:0.1 };
  const sube = (o, opts) => corre(m, `preSubirCosto(${J(o)},${J(opts)})`);

  const qq5 = sube(oQQ, { pct:"5" });
  comprobar("QUINTAL +5 % · el costo de contado sube de 18,00 a 18,90",
    qq5.costoContadoNuevo === 18.90);
  comprobar("QUINTAL +5 % · el precio de venta sube LO MISMO que el costo: 22,00 → 22,90",
    qq5.contadoNuevo === 22.90);
  comprobar("QUINTAL +5 % · la ganancia por quintal NO cambia: sigue siendo $4,00",
    Math.round((qq5.contadoNuevo - qq5.costoContadoNuevo)*100)/100 === 4);
  comprobar("QUINTAL +5 % · el crédito sube lo mismo: 23,00 → 23,90",
    qq5.creditoNuevo === 23.90);
  comprobar("QUINTAL +5 % · el recargo por crédito del costo se conserva en $1,00 por quintal",
    Math.round((qq5.costoNuevo - qq5.costoContadoNuevo)*100)/100 === 1);

  const arr5 = sube(oARR, { pct:"5" });
  comprobar("ARROBA (0,25 qq) +5 % · sube $0,23 y no los $0,90 del quintal",
    arr5.delta === 0.23 && qq5.delta === 0.90);
  comprobar("ARROBA +5 % · la ganancia por arroba NO cambia: sigue siendo $1,00",
    Math.round((arr5.contadoNuevo - arr5.costoContadoNuevo)*100)/100 === 1);

  const l105 = sube(oL10, { pct:"5" });
  comprobar("FUNDA DE 10 LIBRAS (0,1 qq) +5 % · sube $0,09, la décima parte del quintal",
    l105.delta === 0.09);
  comprobar("FUNDA +5 % · la ganancia por funda NO cambia: sigue siendo $0,40",
    Math.round((l105.contadoNuevo - l105.costoContadoNuevo)*100)/100 === 0.40);

  comprobar("+$1 POR QUINTAL · el quintal sube $1,00",
    sube(oQQ, { porQq:"1" }).delta === 1);
  comprobar("+$1 POR QUINTAL · la arroba sube $0,25, NO $1,00",
    sube(oARR, { porQq:"1" }).delta === 0.25);
  comprobar("+$1 POR QUINTAL · la funda de 10 libras sube $0,10, NO $1,00",
    sube(oL10, { porQq:"1" }).delta === 0.10);

  const baja = sube(oQQ, { pct:"-5" });
  comprobar("BAJAR el costo también funciona: −5 % baja el precio y la ganancia queda igual",
    baja.delta === -0.90 && baja.contadoNuevo === 21.10 &&
    Math.round((baja.contadoNuevo - baja.costoContadoNuevo)*100)/100 === 4);

  /* ══ D) EL BLOQUE EN VIVO · una piladora, vista previa, y recién guardar ══ */
  corre(m, `window.__tocar("button","Subir el costo de una piladora")`);
  await esperar(220);
  const t1 = txt();
  comprobar("PASO 1 · ofrece las piladoras con cuántas ofertas tiene cada una",
    /Proveedor Demo A/.test(t1) && /5 oferta/.test(t1) && /1 oferta/.test(t1));
  comprobar("PASO 1 · la oferta de un producto dado de baja se deja fuera Y SE DICE",
    /1 oferta\(s\) se dejan fuera/.test(t1));

  corre(m, `window.__tocar("button","Proveedor Demo A")`);
  await esperar(200);
  const t2 = txt();
  comprobar("PASO 2 · elegida la piladora, se pide la línea de grano",
    /Línea de grano/.test(t2) && /Arroz \(4\)/.test(t2) && /Maíz \(1\)/.test(t2));

  corre(m, `window.__tocar("button","Arroz (4)")`);
  await esperar(120);
  corre(m, `window.__escribir("5","5")`);
  await esperar(120);
  corre(m, `window.__tocar("button","Ver el precio nuevo")`);
  await esperar(220);
  const t3 = txt();

  comprobar("PASO 3 · después de ver el precio nuevo TODAVÍA no se guardó nada",
    m.escrituras.length === 0);
  comprobar("PASO 3 · el precio nuevo SE VE antes de guardar (22,00 → 22,90)",
    t3.indexOf(money(22) + " → " + money(22.9)) >= 0);
  comprobar("PASO 3 · se ve la ganancia de antes y la de después, para aprobarla",
    t3.indexOf("Ganas " + money(4) + " → " + money(4)) >= 0 && /por unidad/.test(t3));
  comprobar("PASO 3 · la piladora que NO se eligió no aparece en la vista previa",
    t3.indexOf(money(19) + " → ") < 0);
  comprobar("PASO 3 · la línea que no se eligió (Maíz) tampoco aparece",
    t3.indexOf(money(30) + " → ") < 0 && corre(m, "window.__cuantasCasillas()") === 4);

  /* Corregir a mano la arroba (segunda casilla) y dejar fuera la funda (tercera) */
  corre(m, `window.__escribirNumero(1,"5.80")`);
  await esperar(140);
  corre(m, `window.__destildar(2)`);
  await esperar(160);
  comprobar("PASO 3 · corregir un precio a mano y destildar un renglón NO guarda nada todavía",
    m.escrituras.length === 0);

  corre(m, `window.__tocar("button","Sí, guardar")`);
  await esperar(600);

  const enOfertas = m.escrituras.filter(e => e.tabla === "ofertas_piladora");
  const inserts = enOfertas.filter(e => e.op === "insert").map(e => e.filas[0]);
  const cierres = enOfertas.filter(e => e.op === "update");
  const porId = (id) => inserts.filter(f => f.prod_id + "-" + f.pres_cod + "-" + f.prov_cod === id)[0];

  comprobar("CERROJO EN VIVO · con la subida ya guardada, NI UNA escritura fue a `precios`",
    m.escrituras.filter(e => e.tabla === "precios").length === 0);
  comprobar("GUARDA · sólo se tocaron ofertas del proveedor elegido (ninguna del proveedor B)",
    cierres.every(c => c.donde[1].indexOf("-ROS") < 0) &&
    inserts.every(f => f.prov_cod === "AGU"));
  comprobar("GUARDA · la otra línea de grano del MISMO proveedor no se movió (Producto Demo C)",
    !porId("P-00300-QQ-AGU") && cierres.every(c => c.donde[1] !== "P-00300-QQ-AGU"));
  comprobar("GUARDA · el renglón destildado NO se guardó (la funda de 10 libras)",
    !porId("P-00012-L10-AGU") && cierres.every(c => c.donde[1] !== "P-00012-L10-AGU"));
  comprobar("GUARDA · se guardaron los 3 renglones que quedaron tildados, ni uno más",
    inserts.length === 3 && cierres.length === 3);
  comprobar("GUARDA · el precio corregido A MANO es el que se guarda ($5,80, no los $5,73 calculados)",
    !!porId("P-00012-ARR-AGU") && porId("P-00012-ARR-AGU").precio_contado === 5.80);
  comprobar("GUARDA · el crédito sigue al contado corregido: 5,80 + 0,25 = 6,05",
    !!porId("P-00012-ARR-AGU") && porId("P-00012-ARR-AGU").precio_credito === 6.05);
  comprobar("GUARDA · el renglón automático lleva el costo nuevo y el precio nuevo (18,90 y 22,90)",
    !!porId("P-00012-QQ-AGU") && porId("P-00012-QQ-AGU").costo_contado === 18.90 &&
    porId("P-00012-QQ-AGU").costo === 19.90 && porId("P-00012-QQ-AGU").precio_contado === 22.90 &&
    porId("P-00012-QQ-AGU").precio_credito === 23.90);
  comprobar("GUARDA · versionado: la oferta de ayer se cierra HOY y la nueva nace HOY",
    cierres.every(c => c.filas[0].vigente_hasta === HOY) &&
    inserts.every(f => f.vigente_desde === HOY && f.activo === true));
  comprobar("GUARDA · la fila nueva conserva producto, presentación, equivalencia y piladora",
    !!porId("P-00012-ARR-AGU") && porId("P-00012-ARR-AGU").equiv_qq === 0.25 &&
    porId("P-00012-ARR-AGU").presentacion === "Arroba" &&
    porId("P-00012-ARR-AGU").pres_cod === "ARR");
  comprobar("GUARDA · queda auditado quién movió qué y cuándo",
    m.escrituras.filter(e => e.tabla === "auditoria").length === 3);
  comprobar("GUARDA · y se dice cuántas quedaron guardadas, no se deja en blanco",
    /3 de 3 oferta\(s\) actualizadas/.test(txt()));

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══
   Hay dos TONTAS (sumarle 1 a un precio) además de las semánticas. */
const MUTANTES = [
  /* ── las tontas y directas ── */
  ["TONTA · le suma 1 al precio nuevo que se muestra",
   `    contadoNuevo:      preR2((Number(o.contado)||0) + delta),`,
   `    contadoNuevo:      preR2((Number(o.contado)||0) + delta) + 1,`],
  ["TONTA · le suma 1 al precio que se guarda",
   `          precio_contado: c.contadoFinal, precio_credito: c.creditoFinal,`,
   `          precio_contado: c.contadoFinal + 1, precio_credito: c.creditoFinal,`],

  /* ── la que más importa: que alguien reintroduzca la escritura a `precios` ── */
  /* PRECIO_UNA_SOLA_PUERTA · las tres pantallas escriben por versionarOfertaWeb; los mutantes de
     versionado apuntan ahora a la puerta única (antes cada uno vivía en su copia). */
  ["vuelve a escribir en la tabla muerta `precios`",
   `  const c2=await window.supa.from("ofertas_piladora").insert(fila);`,
   `  const c2=await window.supa.from("precios").insert(fila);`],
  ["y la pantalla vuelve a LEER de `precios` en vez de las ofertas",
   `  let q = window.supa.from("v_ofertas_vigentes")`,
   `  let q = window.supa.from("precios")`],

  /* ── el margen ── */
  ["el costo sube pero el precio de venta se queda quieto (el margen se come el alza)",
   `    contadoNuevo:      preR2((Number(o.contado)||0) + delta),`,
   `    contadoNuevo:      preR2(Number(o.contado)||0),`],
  ["el crédito deja de seguir al contado",
   `    const creditoFinal = preR2(contadoFinal + brechaPrecio);`,
   `    const creditoFinal = preR2(o.credito);`],
  ["el recargo por crédito del costo se pierde al subir",
   `    costoNuevo:        preR2(costoContado + delta + recargoCred),`,
   `    costoNuevo:        preR2(costoContado + delta),`],

  /* ── las presentaciones que engañan ── */
  ["se olvida de la presentación: $1 por quintal se le carga igual a la arroba y a la funda",
   `    : preR2((Number(porQq)||0) * (Number(o.equivQq)||0));`,
   `    : preR2(Number(porQq)||0);`],

  /* ── una piladora a la vez ── */
  ["el bloque le sube el costo a TODAS las piladoras de un golpe",
   `  const deLaPiladora = vivas.filter(o => o.provCod === prov);`,
   `  const deLaPiladora = vivas;`],
  ["el bloque ignora la línea de grano y mueve el maíz junto con el arroz",
   `  const elegidas = deLaPiladora.filter(o => !linea || (lineaDe[o.prodId] || "Sin línea") === linea);`,
   `  const elegidas = deLaPiladora;`],

  /* ── mostrar antes de guardar ── */
  ["guarda a ciegas: «Ver el precio nuevo» aplica sin mostrar nada",
   `              <button onClick={()=>{ setEdit({}); setFuera({}); setPaso(3); }}`,
   `              <button onClick={()=>{ setEdit({}); setFuera({}); aplicar(); }}`],
  ["ignora el precio corregido a mano y guarda el calculado",
   `    const contadoFinal = aMano ? preR2(parseFloat(tecleado)||0) : r.contadoNuevo;`,
   `    const contadoFinal = r.contadoNuevo;`],
  ["el renglón destildado se guarda igual",
   `  const activas   = calc.filter(c => !fuera[c.ofertaId]);`,
   `  const activas   = calc;`],

  /* ── el versionado y los avisos ── */
  ["no cierra la oferta vieja: quedan dos ofertas vigentes peleándose",
   `  const c1=await window.supa.from("ofertas_piladora").update({vigente_hasta:hoy}).eq("oferta_id",o.ofertaId);`,
   `  const c1={error:null};`],
  ["la oferta nueva nace con fecha vieja y el vendedor no la ve",
   `    margen_min: o.margenMin!=null?o.margenMin:preMargenObjetivo(), activo:true, vigente_desde:hoy, es_demo:false,`,
   `    margen_min: o.margenMin!=null?o.margenMin:preMargenObjetivo(), activo:true, vigente_desde:"2020-01-01", es_demo:false,`],
  ["deja de avisar que dos piladoras cobran distinto por lo mismo",
   `    }, {})).forEach(cs => { if (new Set(cs).size > 1) n++; });`,
   `    }, {})).forEach(cs => { if (false) n++; });`],
];

(async () => {
  console.log("═══ El precio vive en la oferta de la piladora · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, jsx, true);
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
    try { res = await bateria(R.Babel.transform(mutado, { presets:["react"] }).code, mutado, false); }
    catch (e) { res = { mal:1, fallos:["reventó: " + e.message] }; }
    if (res.mal > 0) {
      ok++;
      console.log(`  ✓ «${nombre}» → la prueba se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
    } else {
      mal++;
      console.log(`  ✗ «${nombre}» → la prueba PASA IGUAL: no está midiendo nada`);
    }
  }

  console.log("Resultado del precio en la oferta: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
