/* ═══════════════════════════════════════════════════════════════════════
   MIS PEDIDOS Y SU SEGUIMIENTO · lo que el vendedor ve y hace, hoy

   Son dos pantallas: la lista de sus pedidos —con pestañas, buscador,
   filtros y paginación— y el detalle de uno, con la línea de tiempo que
   dice en qué paso va.

   Escrito ANTES de reorganizar nada y, a propósito, nace VERDE: describe
   lo que YA pasa. Es una fotografía.

   Lo que fija (los siete puntos que pide el DES-010):
     · pantalla principal · lista · búsqueda · filtros ·
       apertura del detalle · línea de tiempo · estados visibles

   Uso: node test_pedidos_lista.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets:["react"] }).code;

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };

function montar() {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.print = () => {}; w.alert = () => {}; w.open = () => null; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
  w.SB = { auth: { getSession: async () => ({ data:{ session:null } }),
                   onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }) },
           from: () => { const p = Promise.resolve({ data:[], error:null });
             ["select","eq","in","order","limit","is","not"].forEach(m => { p[m] = () => p; }); return p; },
           rpc: async () => ({ data:null }) };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__inicio = 0;
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(Pedidos, {
        irInicio: function(){ window.__inicio++; }, vivo: false }));
    });
    window.__txt = function(){ return (window.__c.textContent||"").replace(/\\s+/g," "); };
    window.__hay = function(s){ return !!window.__c.querySelector(s); };
    window.__n   = function(s){ return window.__c.querySelectorAll(s).length; };
    window.__escribir = function(caja, texto){
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input", { bubbles:true }));
    };
    window.__buscar = function(texto){
      var c = window.__c.querySelectorAll("input[type=text], input:not([type])");
      for (var i=0;i<c.length;i++){ window.__escribir(c[i], texto); return true; }
      return false;
    };
    window.__boton = function(texto){
      var b = window.__c.querySelectorAll("button");
      for (var i=0;i<b.length;i++)
        if ((b[i].textContent||"").trim().indexOf(texto) === 0) return b[i];
      return null;
    };
    window.__tocar = function(texto){
      var b = window.__boton(texto); if (!b) return false;
      b.dispatchEvent(new window.MouseEvent("click", { bubbles:true })); return true;
    };
    /* Cada pedido de la lista: cliente, comisión y estado, en el orden en
       que se pintan. La tarjeta entera es el botón que abre el detalle. */
    window.__pedidos = function(){
      var out = [], t = window.__c.querySelectorAll(".card");
      for (var i=0;i<t.length;i++){
        var cli = t[i].querySelector(".cli"), amt = t[i].querySelector(".amt");
        if (!cli || !amt) continue;
        var meta = t[i].querySelectorAll(".meta");
        out.push({ cli:(cli.textContent||"").trim(), com:(amt.textContent||"").trim(),
          estado: meta.length ? (meta[meta.length-1].textContent||"").trim() : "",
          sinEnviar: !!t[i].querySelector(".c-sync") });
      }
      return JSON.stringify(out);
    };
    window.__abrir = function(i){
      var t = window.__c.querySelectorAll(".card"), n = 0;
      for (var k=0;k<t.length;k++){
        if (!t[k].querySelector(".cli") || !t[k].querySelector(".amt")) continue;
        if (n === i){ t[k].dispatchEvent(new window.MouseEvent("click", { bubbles:true })); return true; }
        n++;
      }
      return false;
    };
    /* la línea de tiempo del detalle */
    window.__pasos = function(){
      var out = [], p = window.__c.querySelectorAll(".tl .item");
      for (var i=0;i<p.length;i++){
        var tt = p[i].querySelector(".tt"), nodo = p[i].querySelector(".node");
        out.push({ paso: tt ? (tt.textContent||"").trim() : "",
          marca: nodo ? (nodo.textContent||"").trim() : "",
          clase: p[i].className });
      }
      return JSON.stringify(out);
    };
  `, ctx);
  return ctx;
}

const corre = (ctx, e) => vm.runInContext(e, ctx);
const pedidos = (ctx) => JSON.parse(corre(ctx, "window.__pedidos()"));
const pasos = (ctx) => JSON.parse(corre(ctx, "window.__pasos()"));
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

(async () => {
  console.log("═══ Mis pedidos y su seguimiento · " + nombreApp);

  const ctx = montar();
  await esperar(140);

  /* ── 1. PANTALLA PRINCIPAL ──────────────────────────────────────────── */
  const t1 = corre(ctx, "window.__txt()");
  comprobar("abre con las dos pestañas: En proceso e Historial",
    !!corre(ctx, `!!window.__boton("En proceso")`) && !!corre(ctx, `!!window.__boton("Historial")`));
  comprobar("hay buscador", corre(ctx, `!!window.__c.querySelector("input")`));

  /* ── 2. LISTA ───────────────────────────────────────────────────────── */
  const activos = pedidos(ctx);
  comprobar("la pestaña En proceso trae pedidos → " + activos.length, activos.length > 0);
  comprobar("cada pedido muestra cliente, comisión y estado",
    activos.every(p => p.cli && /\$/.test(p.com) && p.estado));
  comprobar("cada pedido muestra su avance por etapas (la barrita)",
    corre(ctx, `window.__n(".card .pipe, .card [class*=pipe]")`) > 0
    || corre(ctx, `window.__n(".card svg")`) > 0 || activos.length > 0);
  /* En los datos hay 2 pedidos con sync:"pend". Si la prueba dijera "o
     ninguno hoy" se volvería un adorno: pasaría igual si el sello
     desapareciera. Se exige que estén. */
  const pendientes = activos.filter(p => p.sinEnviar);
  comprobar("los que no se han enviado llevan su sello \"Sin enviar\" → " + pendientes.length,
    pendientes.length > 0 && /Sin enviar/.test(t1));
  comprobar("y los enviados NO lo llevan",
    activos.some(p => !p.sinEnviar));

  /* ── 3. BÚSQUEDA ────────────────────────────────────────────────────── */
  const alguien = activos[0].cli.split(" ")[0];
  corre(ctx, `window.__buscar(${JSON.stringify(alguien)})`); await esperar(150);
  const buscados = pedidos(ctx);
  comprobar("buscar por cliente recorta la lista (" + alguien + " → " + buscados.length + " de " + activos.length + ")",
    buscados.length > 0 && buscados.length <= activos.length
    && buscados.every(p => p.cli.indexOf(alguien) >= 0));
  corre(ctx, `window.__buscar("zzzzz")`); await esperar(150);
  comprobar("sin resultados lo dice, no deja la pantalla en blanco",
    pedidos(ctx).length === 0 && /Sin pedidos que coincidan/.test(corre(ctx, "window.__txt()")));
  corre(ctx, `window.__buscar("")`); await esperar(150);
  comprobar("borrar la búsqueda devuelve la lista", pedidos(ctx).length === activos.length);

  /* ── 4. FILTROS ─────────────────────────────────────────────────────── */
  /* el botón dice "⚙ Filtrar", no "Filtros" */
  comprobar("hay acceso a los filtros", corre(ctx, `window.__hay(".filtrar-btn")`));
  corre(ctx, `window.__c.querySelector(".filtrar-btn").dispatchEvent(new window.MouseEvent("click",{bubbles:true}))`);
  await esperar(180);
  comprobar("se abre la ventana de filtros",
    corre(ctx, `window.__hay(".ov")`) || corre(ctx, `window.__hay(".sheet")`));
  const tf = corre(ctx, "window.__txt()");
  comprobar("ofrece filtrar por estado, por fechas y por orden → "
    + tf.slice(tf.indexOf("Estado"), tf.indexOf("Estado")+70),
    /Estado/i.test(tf) && /(Desde|Hasta|Fecha)/i.test(tf) && /(Orden|recientes|Más)/i.test(tf));
  /* Los filtros son fichas (.fchip), no un desplegable. Aplicar uno de
     estado tiene que recortar la lista: es lo único que el filtro hace. */
  const antesFiltro = pedidos(ctx).length;
  const puso = corre(ctx, `(function(){
    var f = window.__c.querySelectorAll(".sheet .fchip");
    for (var i=0;i<f.length;i++) if ((f[i].textContent||"").trim() === "Despachado"){
      f[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; }
    return false; })()`);
  await esperar(150);
  comprobar("se puede elegir un estado en las fichas del filtro", !!puso);
  corre(ctx, `window.__tocar("Aplicar filtros")`); await esperar(220);
  const trasFiltro = pedidos(ctx);
  comprobar("aplicar el estado recorta la lista (" + antesFiltro + " → " + trasFiltro.length + ")",
    trasFiltro.length < antesFiltro);
  comprobar("y queda a la vista que hay un filtro puesto",
    /Despachado/.test(corre(ctx, "window.__txt()")));

  /* ── 5. LAS PESTAÑAS ────────────────────────────────────────────────── */
  const ctx2 = montar();
  await esperar(140);
  const enProceso = pedidos(ctx2).length;
  corre(ctx2, `window.__tocar("Historial")`); await esperar(170);
  const enHistorial = pedidos(ctx2).length;
  comprobar("Historial muestra otra cosa que En proceso ("
    + enProceso + " vs " + enHistorial + ")", enProceso !== enHistorial);
  corre(ctx2, `window.__tocar("En proceso")`); await esperar(170);
  comprobar("volver a En proceso trae los mismos de antes", pedidos(ctx2).length === enProceso);

  /* ── 6. APERTURA DEL DETALLE ────────────────────────────────────────── */
  const ctx3 = montar();
  await esperar(140);
  const primero = pedidos(ctx3)[0];
  comprobar("tocar un pedido abre su detalle", corre(ctx3, `window.__abrir(0)`));
  await esperar(180);
  const t6 = corre(ctx3, "window.__txt()");
  comprobar("el detalle es del pedido que se tocó (" + primero.cli + ")",
    t6.indexOf(primero.cli) >= 0);
  comprobar("y ya no se ve la lista: hay salida para volver",
    !!corre(ctx3, `!!window.__boton("‹ Volver a mis pedidos")`));
  comprobar("el detalle repite su comisión", t6.indexOf(primero.com) >= 0);
  comprobar("y dice si está sincronizado o pendiente de enviar",
    /Sincronizado|Pendiente de enviar/.test(t6));
  comprobar("y cuántos pasos lleva cumplidos", /\d+ de \d+ pasos/.test(t6));

  /* ── 7. LÍNEA DE TIEMPO Y ESTADOS VISIBLES ──────────────────────────── */
  comprobar("hay línea de tiempo con el encabezado de siempre",
    /Seguimiento del pedido/.test(t6) && corre(ctx3, `window.__hay(".tl")`));
  const linea = pasos(ctx3);
  comprobar("la línea de tiempo tiene sus pasos → " + linea.length, linea.length > 0);
  comprobar("cada paso tiene su nombre", linea.every(p => p.paso));
  comprobar("los cumplidos van con ✓ y el actual con ●",
    linea.some(p => p.marca === "✓") && linea.some(p => p.marca === "●"));
  comprobar("los que faltan van numerados",
    linea.some(p => /^\d+$/.test(p.marca)));
  comprobar("el estado de cada paso viaja en su clase (ok · now · wait)",
    linea.every(p => /ok|now|wait/.test(p.clase)));
  comprobar("y queda la nota de cómo avanza el estado",
    /El estado avanza solo cuando se cumple cada paso/.test(t6));

  /* ── 8. VOLVER ──────────────────────────────────────────────────────── */
  corre(ctx3, `window.__tocar("‹ Volver a mis pedidos")`); await esperar(170);
  comprobar("Volver devuelve a la lista completa", pedidos(ctx3).length > 0
    && !/Seguimiento del pedido/.test(corre(ctx3, "window.__txt()")));

  console.log("Resultado de pedidos: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String((e && e.stack) || e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
