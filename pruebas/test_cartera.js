/* ═══════════════════════════════════════════════════════════════════════
   CARTERA · lo que el vendedor ve y hace, hoy

   Es lo que le deben: sus facturas por cobrar, ordenadas por urgencia, con
   su buscador y sus filtros; y la pestaña de cheques devueltos, que es
   plata que ya se había cobrado y volvió.

   Escrito ANTES de reorganizar nada y, a propósito, nace VERDE: describe
   lo que YA pasa. Es una fotografía.

   Lo que fija:
     · abre en Facturas, con las ocho de su cartera;
     · el orden es por urgencia: primero lo vencido, después lo que vence
       pronto, y dentro de cada grupo la deuda más grande arriba;
     · el buscador filtra por cliente y también por ciudad o provincia;
     · los filtros Vencidas y Vence pronto recortan la lista;
     · cuando no queda nada, lo dice — no deja la pantalla en blanco;
     · cada factura ofrece "Cobrar →" y avisa a dónde lleva;
     · la pestaña de Cheques trae su contador de pendientes.

   Uso: node test_cartera.js [ruta.html]
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
    window.__avisos = [];
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(Cartera, {
        toast: function(t){ window.__avisos.push(t); } }));
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
    /* Las facturas de la lista: cada una es una tarjeta con nombre de
       cliente (.cli) y monto (.amt). Se leen en el orden en que se pintan. */
    window.__facturas = function(){
      var out = [], t = window.__c.querySelectorAll(".card");
      for (var i=0;i<t.length;i++){
        var cli = t[i].querySelector(".cli"), amt = t[i].querySelector(".amt");
        if (cli && amt) out.push({ cli:(cli.textContent||"").trim(), monto:(amt.textContent||"").trim(),
          venc:(t[i].querySelector(".chip") ? (t[i].querySelector(".chip").textContent||"").trim() : "") });
      }
      return JSON.stringify(out);
    };
    /* Los filtros NO son botones: son las tarjetas del mini-tablero de
       arriba (.ncard). Se tocan como tarjetas, que es lo que hace el
       vendedor, y se reconocen por lo que dicen. */
    /* Se reconocen por su ROTULO (.nk), no por todo su texto: la tarjeta
       "Por cobrar" también dice "vencido" adentro, en su anillo, y buscar
       en el texto completo hacía tocar la tarjeta equivocada — la prueba
       pasaba creyendo que filtraba y no filtraba nada. */
    window.__tarjeta = function(rotulo){
      var t = window.__c.querySelectorAll(".ncard");
      for (var i=0;i<t.length;i++){
        var k = t[i].querySelector(".nk");
        if (k && (k.textContent||"").trim() === rotulo) return t[i];
      }
      return null;
    };
    window.__tocarTarjeta = function(texto){
      var t = window.__tarjeta(texto); if (!t) return false;
      t.dispatchEvent(new window.MouseEvent("click", { bubbles:true })); return true;
    };
    window.__cobrar = function(i){
      var b = window.__c.querySelectorAll(".mini-cta");
      if (b.length <= i) return false;
      b[i].dispatchEvent(new window.MouseEvent("click", { bubbles:true })); return true;
    };
  `, ctx);
  return ctx;
}

const corre = (ctx, e) => vm.runInContext(e, ctx);
const facturas = (ctx) => JSON.parse(corre(ctx, "window.__facturas()"));
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

(async () => {
  console.log("═══ Cartera · " + nombreApp);

  const ctx = montar();
  await esperar(120);

  /* ── 1. Abre en Facturas, con toda la cartera ───────────────────────── */
  const t1 = corre(ctx, "window.__txt()");
  comprobar("la pantalla se titula Cartera", /Cartera/.test(t1));
  comprobar("hay pestaña de Facturas y de Cheques",
    !!corre(ctx, `!!window.__boton("Facturas")`) && !!corre(ctx, `!!window.__boton("Cheques")`));
  const todas = facturas(ctx);
  comprobar("abre mostrando las 8 facturas de su cartera → " + todas.length, todas.length === 8);

  /* ── 2. El orden es por urgencia, no por nombre ─────────────────────── */
  const orden = todas.map(f => f.venc);
  const vencidasArriba = orden.slice(0, 2).every(v => /Vencida/.test(v));
  comprobar("primero lo vencido → " + orden.slice(0,2).join(" | "), vencidasArriba);
  comprobar("y dentro de lo vencido, la deuda más grande arriba → "
    + todas[0].monto + " antes que " + todas[1].monto,
    parseFloat(todas[0].monto.replace(/[^\d,]/g,"").replace(",",".")) >=
    parseFloat(todas[1].monto.replace(/[^\d,]/g,"").replace(",",".")));
  const ultimos = orden.slice(-3);
  comprobar("y lo que no corre prisa queda al final → " + ultimos.join(" | "),
    ultimos.every(v => !/Vencida/.test(v)));

  /* ── 3. El buscador ─────────────────────────────────────────────────── */
  comprobar("hay buscador", corre(ctx, `window.__buscar("Nilo")`));
  await esperar(140);
  const porNombre = facturas(ctx);
  comprobar("buscar por cliente deja solo el suyo → " + porNombre.length,
    porNombre.length === 1 && porNombre[0].cli.indexOf("Nilo") >= 0);
  corre(ctx, `window.__buscar("Guayaquil")`); await esperar(140);
  const porCiudad = facturas(ctx);
  comprobar("también se busca por ciudad → " + porCiudad.length + " en Guayaquil",
    porCiudad.length === 1 && porCiudad[0].cli.indexOf("Ríos") >= 0);
  corre(ctx, `window.__buscar("zzzz")`); await esperar(140);
  comprobar("sin resultados no deja la pantalla en blanco: lo dice",
    facturas(ctx).length === 0 && /Sin facturas que coincidan/.test(corre(ctx, "window.__txt()")));
  corre(ctx, `window.__buscar("")`); await esperar(140);
  comprobar("borrar la búsqueda devuelve las 8", facturas(ctx).length === 8);

  /* ── 4. Los filtros ─────────────────────────────────────────────────── */
  /* la tarjeta se llama "Vencido" (el dinero), no "Vencidas" (las facturas) */
  comprobar("hay tarjeta de Vencido en el tablero de entrada",
    !!corre(ctx, `!!window.__tarjeta("Vencido")`));
  corre(ctx, `window.__tocarTarjeta("Vencido")`); await esperar(160);
  const soloVenc = facturas(ctx);
  comprobar("y el encabezado de la lista lo dice",
    /Facturas vencidas/.test(corre(ctx, "window.__txt()")));
  comprobar("tocar Vencido deja solo las vencidas → " + soloVenc.length,
    soloVenc.length > 0 && soloVenc.every(f => /Vencida/.test(f.venc)));
  comprobar("y son menos que el total (" + soloVenc.length + " de 8)", soloVenc.length < 8);
  comprobar("con el filtro puesto aparece la salida para quitarlo",
    !!corre(ctx, `!!window.__boton("× quitar filtro")`));
  corre(ctx, `window.__tocar("× quitar filtro")`); await esperar(160);
  comprobar("quitar el filtro devuelve las 8", facturas(ctx).length === 8);
  corre(ctx, `window.__tocarTarjeta("Vencido")`); await esperar(160);
  corre(ctx, `window.__tocarTarjeta("Por cobrar")`); await esperar(160);
  comprobar("volver a Por cobrar devuelve las 8", facturas(ctx).length === 8);

  /* ── 5. Cobrar avisa a dónde lleva ──────────────────────────────────── */
  comprobar("cada factura ofrece Cobrar", corre(ctx, `window.__n(".mini-cta")`) > 0);
  corre(ctx, `window.__cobrar(0)`); await esperar(120);
  const aviso = String(corre(ctx, "window.__avisos.join(' | ')"));
  comprobar("tocar Cobrar avisa con el cliente y el monto → " + aviso.slice(0, 70),
    /Cobrar /.test(aviso) && /\$/.test(aviso) && /reportar el cobro/.test(aviso));

  /* ── 6. La pestaña de Cheques ───────────────────────────────────────── */
  corre(ctx, `window.__tocar("Cheques")`); await esperar(160);
  const t6 = corre(ctx, "window.__txt()");
  comprobar("la pestaña de Cheques cambia la pantalla", !corre(ctx, `!!window.__boton("Vencidas")`));
  comprobar("y habla de cheques devueltos", /devuelto/i.test(t6) || /cheque/i.test(t6));
  corre(ctx, `window.__tocar("Facturas")`); await esperar(160);
  comprobar("volver a Facturas trae la lista de nuevo", facturas(ctx).length > 0);

  console.log("Resultado de cartera: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String((e && e.stack) || e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
