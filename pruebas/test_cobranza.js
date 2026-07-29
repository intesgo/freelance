/* ═══════════════════════════════════════════════════════════════════════
   COBRANZA · lo que el vendedor ve y hace, hoy

   Es el asistente de tres pasos: a quién y de qué proveedor se cobra, qué
   facturas se abonan y con cuánto, y con qué formas de pago se cubre. Con
   su tablero de saldo, que es donde se ve si el cobro cuadra o no.

   Escrito ANTES de reorganizar nada y, a propósito, nace VERDE: describe
   lo que YA pasa. Es una fotografía.

   Lo que fija:
     · el asistente arranca en el paso 1, sin poder avanzar;
     · elegir cliente y proveedor habilita "Siguiente";
     · abonar a una factura habilita el paso 3;
     · el tablero muestra Total, Abonado y SALDO, y el saldo baja cuando se
       agregan formas de pago;
     · con el saldo en cero dice "PAGO COMPLETO" y deja revisar el resumen;
     · quitar una forma de pago devuelve el saldo y bloquea de nuevo;
     · "Atrás" retrocede paso a paso.

   Uso: node test_cobranza.js [ruta.html]
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
  w.scrollTo = () => {}; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
  w.__abiertas = [];
  w.open = (url) => { w.__abiertas.push(String(url)); return null; };
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
      ReactDOM.createRoot(window.__c).render(React.createElement(Cobros, {
        toast: function(t){ window.__avisos.push(t); }, go: function(){} }));
    });
    window.__txt   = function(){ return (window.__c.textContent||"").replace(/\\s+/g," "); };
    window.__hay   = function(s){ return !!window.__c.querySelector(s); };
    window.__n     = function(s){ return window.__c.querySelectorAll(s).length; };
    window.__texto = function(s){ var n=window.__c.querySelector(s); return n?(n.textContent||"").replace(/\\s+/g," "):""; };
    window.__escribir = function(caja, texto){
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input", { bubbles:true }));
    };
    window.__buscador = function(n){
      var c = window.__c.querySelectorAll(".ss input");
      for (var i=0;i<c.length;i++)
        if ((c[i].getAttribute("placeholder")||"").toLowerCase().indexOf(n) >= 0) return c[i];
      return null;
    };
    window.__abrirLista = function(campo, texto){
      var caja = window.__buscador(campo); if (!caja) return false;
      window.__escribir(caja, texto); return true;
    };
    window.__tocarOpcion = function(i){
      var op = window.__c.querySelectorAll(".opt");
      if (op.length <= i) return false;
      op[i].dispatchEvent(new window.MouseEvent("mousedown", { bubbles:true })); return true;
    };
    /* botón por lo que DICE, no por dónde está */
    window.__boton = function(texto){
      var b = window.__c.querySelectorAll("button");
      for (var i=0;i<b.length;i++)
        if ((b[i].textContent||"").indexOf(texto) >= 0) return b[i];
      return null;
    };
    window.__tocar = function(texto){
      var b = window.__boton(texto); if (!b) return false;
      b.dispatchEvent(new window.MouseEvent("click", { bubbles:true })); return true;
    };
    window.__apagado = function(texto){
      var b = window.__boton(texto); return b ? !!b.disabled : null;
    };
    /* Paso 2: la factura primero se TOCA (se marca con ✓ y trae su saldo
       completo) y recién ahí aparece la casilla del monto. Escribir sin
       tocar no hace nada: la casilla no existe todavía. */
    window.__tocarFactura = function(i){
      var f = window.__c.querySelectorAll(".fsel .top");
      if (f.length <= i) return false;
      f[i].dispatchEvent(new window.MouseEvent("click", { bubbles:true })); return true;
    };
    window.__abonar = function(v){
      var c = window.__c.querySelector(".aplica input[type=number]");
      if (!c) return false;
      window.__escribir(c, String(v)); return true;
    };
  `, ctx);
  return ctx;
}

const corre = (ctx, e) => vm.runInContext(e, ctx);
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

(async () => {
  console.log("═══ Cobranza · " + nombreApp);

  const ctx = montar();
  await esperar(120);

  /* ── 1. Arranca en el paso 1, sin poder avanzar ─────────────────────── */
  const t1 = corre(ctx, "window.__txt()");
  comprobar("el asistente arranca en Datos del cobro", /Datos del cobro/.test(t1));
  comprobar("hay buscador de cliente", !!corre(ctx, `!!window.__buscador("cliente")`));
  comprobar('"Siguiente" existe y está apagado', corre(ctx, `window.__apagado("Siguiente")`) === true);
  comprobar('no hay "Atrás" en el primer paso', !corre(ctx, `!!window.__boton("Atrás")`));

  /* ── 2. Cliente y proveedor habilitan el paso ───────────────────────── */
  corre(ctx, `window.__abrirLista("cliente", "a")`); await esperar(90);
  const hayCli = corre(ctx, `window.__tocarOpcion(0)`); await esperar(140);
  comprobar("se puede elegir un cliente con cobros pendientes", !!hayCli);
  comprobar("con cliente pero sin proveedor sigue apagado",
    corre(ctx, `window.__apagado("Siguiente")`) === true);
  corre(ctx, `window.__abrirLista("proveedor", "a")`); await esperar(90);
  const hayProv = corre(ctx, `window.__tocarOpcion(0)`); await esperar(140);
  comprobar("se puede elegir su proveedor", !!hayProv);
  comprobar("con cliente y proveedor se habilita Siguiente",
    corre(ctx, `window.__apagado("Siguiente")`) === false);

  /* ── 3. Paso 2: abonar a una factura ────────────────────────────────── */
  corre(ctx, `window.__tocar("Siguiente")`); await esperar(140);
  comprobar("el paso 2 pide facturas y montos", /Facturas y montos/.test(corre(ctx, "window.__txt()")));
  comprobar("sin abonar nada no se puede avanzar",
    corre(ctx, `window.__apagado("Siguiente")`) === true);
  const hayFac = corre(ctx, `window.__tocarFactura(0)`); await esperar(140);
  comprobar("se puede marcar una factura", !!hayFac);
  comprobar("al marcarla trae su saldo completo, listo para cancelarla",
    corre(ctx, `window.__hay(".aplica input[type=number]")`));
  const hayMonto = corre(ctx, `window.__abonar(100)`); await esperar(140);
  comprobar("y se puede cambiar el monto a abonar", !!hayMonto);
  comprobar("con un abono se habilita Siguiente",
    corre(ctx, `window.__apagado("Siguiente")`) === false);

  /* ── 4. Paso 3: el tablero del saldo ────────────────────────────────── */
  corre(ctx, `window.__tocar("Siguiente")`); await esperar(160);
  const t3 = corre(ctx, "window.__txt()");
  /* OJO: los tres rótulos del asistente salen SIEMPRE en la barra de pasos,
     así que buscar "Formas de pago" en la pantalla da verde aunque no se
     haya avanzado. La señal de verdad es el tablero del saldo. */
  comprobar("el paso 3 muestra el tablero del saldo", corre(ctx, `window.__hay(".montobox")`));
  comprobar("el tablero muestra Total, Abonado y SALDO",
    /Total/.test(t3) && /Abonado/.test(t3) && /SALDO/.test(t3));
  const caja = corre(ctx, `window.__texto(".montobox")`);
  comprobar("el total es el abono escrito ($100,00) → " + caja.slice(0, 60),
    /\$100,00/.test(caja));
  comprobar("y arranca con 0% cubierto", /0% cubierto/.test(caja));
  comprobar("todavía no dice PAGO COMPLETO", !/PAGO COMPLETO/.test(t3));
  comprobar("no se puede revisar el resumen con el saldo sin cubrir",
    corre(ctx, `window.__apagado("Revisar resumen")`) === true);
  comprobar("ofrece las cuatro formas de pago",
    corre(ctx, `window.__texto(".addbar")`).indexOf("Efectivo") >= 0
    && corre(ctx, `window.__texto(".addbar")`).indexOf("Cheque") >= 0);

  /* ── 5. Cubrir el saldo con efectivo ────────────────────────────────── */
  comprobar("se abre la ventana de una forma de pago", corre(ctx, `window.__tocar("+ Efectivo")`));
  await esperar(160);
  comprobar("la ventana propone el monto que falta",
    corre(ctx, `window.__hay(".ov")`) || corre(ctx, `window.__hay("input")`));
  /* el botón del efectivo dice "Agregar efectivo", no "Guardar" */
  const guardo = corre(ctx, `window.__tocar("Agregar efectivo")`);
  await esperar(200);
  comprobar("se puede guardar la forma de pago", !!guardo);
  const t5 = corre(ctx, "window.__txt()");
  comprobar("la forma de pago aparece en la lista", corre(ctx, `window.__n(".pline")`) === 1);
  comprobar("el saldo quedó cubierto: dice PAGO COMPLETO", /PAGO COMPLETO/.test(t5));
  comprobar("y 100% cubierto", /100% cubierto/.test(corre(ctx, `window.__texto(".montobox")`)));
  comprobar("recién ahí se puede revisar el resumen",
    corre(ctx, `window.__apagado("Revisar resumen")`) === false);

  /* ── 6. Quitar la forma de pago devuelve el saldo ───────────────────── */
  comprobar("(preparación) hay una forma de pago que quitar",
    corre(ctx, `window.__n(".pline")`) === 1);
  corre(ctx, `window.__tocar("Quitar")`); await esperar(180);
  comprobar("Quitar saca la forma de pago", corre(ctx, `window.__n(".pline")`) === 0);
  comprobar("y vuelve a bloquear el resumen",
    corre(ctx, `window.__apagado("Revisar resumen")`) === true);
  comprobar("el tablero vuelve a 0% cubierto",
    /0% cubierto/.test(corre(ctx, `window.__texto(".montobox")`)));

  /* ── 7. Atrás retrocede paso a paso ─────────────────────────────────── */
  corre(ctx, `window.__tocar("Atrás")`); await esperar(140);
  comprobar('"Atrás" vuelve al paso 2', /Facturas y montos/.test(corre(ctx, "window.__txt()")));
  corre(ctx, `window.__tocar("Atrás")`); await esperar(140);
  comprobar("y otra vez al paso 1", /Datos del cobro/.test(corre(ctx, "window.__txt()")));
  comprobar("en el paso 1 ya no hay Atrás", !corre(ctx, `!!window.__boton("Atrás")`));

  console.log("Resultado de cobranza: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String((e && e.stack) || e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
