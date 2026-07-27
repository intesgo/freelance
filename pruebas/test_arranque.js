/* ═══════════════════════════════════════════════════════════════════════
   ARRANQUE Y CIERRES · freelance-completo b382

   Esta pantalla marca el día en que el sistema empieza a llevar la
   operación de verdad. Es un botón que se toca UNA vez en la vida del
   negocio y que además le pone un muro a todo lo anterior. Por eso lo que
   se comprueba aquí no es que se vea bonito, sino que **no deje meter la
   pata**:

     · sin sesión no se ensaya: lo dice con palabras;
     · un saldo sin cliente, en cero, o con fecha posterior al arranque, no entra;
     · lo que se manda a la base es EXACTAMENTE lo que se cargó, sin inventar;
     · si no se cargó ningún saldo, avisa que el sistema creerá que nadie debe nada;
     · si la base se niega, el motivo se muestra tal cual y NO se dice "listo";
     · ya arrancado, muestra hasta cuándo está cerrado y deja cerrar mes o año;
     · reabrir exige motivo escrito;
     · la apertura no se ofrece para reabrir.

   Uso: node test_arranque.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("freelance-completo");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets: ["react"] }).code;

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms || 220));

const hoy = new Date();
const HOY = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const CLIENTES = [
  { cli_id: "CLI-001", nombre: "Comercial Nilo", es_demo: false },
  { cli_id: "CLI-002", nombre: "Abarrotes Don Pepe", es_demo: false },
  { cli_id: "CLI-D01", nombre: "Cliente de práctica", es_demo: true },
];

const CIERRES_ABIERTO = [
  { cierre_id: "CR-202607", tipo: "mensual", periodo: "2026-07", hasta: "2026-07-15",
    total_cartera: 3200, total_comisiones: 450, notas: null, cerrado_en: "2026-07-16T10:00:00Z" },
  { cierre_id: "CR-APERTURA", tipo: "apertura", periodo: "apertura", hasta: "2026-06-30",
    total_cartera: 2300.5, total_comisiones: 0, notas: "Arranque de la operación. 2 saldo(s).",
    cerrado_en: "2026-07-01T10:00:00Z" },
];

const SOLO_APERTURA = [CIERRES_ABIERTO[1]];

function montar({ haySesion = true, cierres = [], fallaRpc = null } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  w.Notification = function () {}; w.Notification.permission = "denied"; w.Notification.requestPermission = async () => "denied";

  const rpc = [], avisos = [];
  const tabla = (nombre) => {
    let datos = [];
    if (nombre === "clientes") datos = haySesion ? CLIENTES : [];
    if (nombre === "cierres") datos = cierres;
    if (nombre === "config_sistema") {
      datos = cierres.some((c) => c.tipo === "apertura")
        ? [{ clave: "inicio_operacion", valor: "2026-07-01" }] : [];
    }
    const p = Promise.resolve({ data: datos, error: null, count: datos.length });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "gte", "lte", "or"].forEach((m) => { p[m] = () => tabla(nombre); });
    p.maybeSingle = () => Promise.resolve({ data: datos[0] || null, error: null }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error: null });
    p.update = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    p.delete = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1", email: "intesgo@gmail.com" } } } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (n) => tabla(n),
    rpc: async (nombre, args) => {
      rpc.push({ nombre, args });
      if (fallaRpc && fallaRpc.nombre === nombre) return { data: null, error: { message: fallaRpc.mensaje } };
      if (nombre === "abrir_operacion") return { data: "Operación abierta el 01/07/2026. 2 saldo(s) de apertura por $2300.50.", error: null };
      if (nombre === "cerrar_periodo") return { data: "Cerrado el 2026-07 hasta el 15/07/2026.", error: null };
      if (nombre === "reabrir_ultimo_cierre") return { data: "Reabierto el 2026-07.", error: null };
      return { data: null, error: null };
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
  };
  const ctx = dom.getInternalVMContext();
  ctx.__avisos = avisos;
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__cont).render(
        React.createElement(Arranque, { toast: function(m){ __avisos.push(String(m)); } }));
    });
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tocar = function(texto){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){
        if((bs[i].textContent||"").indexOf(texto) >= 0 && !bs[i].disabled){ bs[i].click(); return true; } }
      return false;
    };
    window.__apagado = function(texto){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").trim() === texto) return !!bs[i].disabled; }
      return null;
    };
    window.__hay = function(texto){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto) >= 0) return true; }
      return false;
    };
    window.__poner = function(etiqueta, valor){
      var fs = window.__cont.querySelectorAll(".field");
      for(var i=0;i<fs.length;i++){
        var l = fs[i].querySelector("label");
        if(l && (l.textContent||"").indexOf(etiqueta) >= 0){
          var el = fs[i].querySelector("input,textarea,select");
          if(!el) return false;
          var proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype
                    : el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype
                    : window.HTMLInputElement.prototype;
          var set = Object.getOwnPropertyDescriptor(proto, "value").set;
          set.call(el, valor);
          el.dispatchEvent(new window.Event("input", { bubbles: true }));
          el.dispatchEvent(new window.Event("change", { bubbles: true }));
          return true;
        }
      }
      return false;
    };
  `, ctx);
  return { ctx, rpc, avisos };
}
const txt = (m) => vm.runInContext("window.__txt()", m.ctx);
const tocar = (m, t) => vm.runInContext(`window.__tocar(${JSON.stringify(t)})`, m.ctx);
const hay = (m, t) => vm.runInContext(`window.__hay(${JSON.stringify(t)})`, m.ctx);
const poner = (m, e, v) => vm.runInContext(`window.__poner(${JSON.stringify(e)},${JSON.stringify(v)})`, m.ctx);

async function cargarSaldo(m, { cli, monto, doc, emision, vence }) {
  tocar(m, "Agregar un saldo"); await esperar(160);
  if (cli !== undefined) poner(m, "Cliente", cli);
  if (monto !== undefined) poner(m, "¿Cuánto te debe?", monto);
  if (doc !== undefined) poner(m, "Número de factura", doc);
  if (emision !== undefined) poner(m, "¿Cuándo se emitió?", emision);
  if (vence !== undefined) poner(m, "¿Cuándo vence?", vence);
  await esperar(160);
  tocar(m, "Guardar este saldo"); await esperar(200);
}
/* La hoja se cierra sola cuando el saldo entra: si sigue abierta, no entró. */
const hojaAbierta = (m) => /Un saldo de apertura/.test(txt(m));

(async () => {
  console.log("═══ Arranque y cierres · " + nombreApp);

  /* ── 1 · sin sesión: no se ensaya ────────────────────────────────── */
  const m0 = montar({ haySesion: false });
  await esperar(320);
  comprobar("sin sesión lo explica con palabras en vez de dejar la pantalla vacía",
    /necesita sesión/.test(txt(m0)) && /no se ensaya/.test(txt(m0)));
  comprobar("y no ofrece marcar nada", !hay(m0, "Marcar el arranque"));

  /* ── 2 · todavía sin arrancar ────────────────────────────────────── */
  const m = montar({ cierres: [] });
  await esperar(320);
  let t = txt(m);
  comprobar("dice que todavía no se ha marcado el arranque", /Todavía no has marcado el arranque/.test(t));
  comprobar("avisa que lo anterior queda cerrado y que es una sola vez",
    /queda cerrado/.test(t) && /una sola vez/.test(t));
  comprobar("explica por qué importan los saldos de apertura",
    /los informes van a mentir/.test(t));
  comprobar("no deja poner una fecha futura",
    vm.runInContext(`(function(){var i=window.__cont.querySelector('input[type=date]');return i&&i.getAttribute("max");})()`, m.ctx) === HOY);

  /* ── 3 · el saldo mal puesto no entra ────────────────────────────── */
  await cargarSaldo(m, { monto: "500" });                       // sin cliente
  comprobar("un saldo sin cliente no entra, y dice qué falta",
    m.avisos.some((a) => /de qué cliente/.test(a)) && hojaAbierta(m));

  await cargarSaldo(m, { cli: "CLI-001", monto: "0" });         // en cero
  comprobar("un saldo en cero no entra",
    m.avisos.some((a) => /mayor que cero/.test(a)) && hojaAbierta(m));

  await cargarSaldo(m, { cli: "CLI-001", monto: "500", emision: HOY }); // fecha posterior
  comprobar("un saldo con fecha del arranque o después no entra",
    m.avisos.some((a) => /es de ANTES/.test(a)) && hojaAbierta(m));

  tocar(m, "Cancelar"); await esperar(200);
  comprobar("después de tres rechazos no quedó ningún saldo a medio cargar",
    !/saldo\(s\) de apertura/.test(txt(m)) && !hojaAbierta(m));

  /* ── 4 · dos saldos buenos ───────────────────────────────────────── */
  await cargarSaldo(m, { cli: "CLI-001", monto: "1500", doc: "F-1001", emision: "2026-06-10", vence: "2026-07-10" });
  await cargarSaldo(m, { cli: "CLI-002", monto: "800.50", emision: "2026-06-20" });
  t = txt(m);
  comprobar("la hoja se cierra sola cuando el saldo entra", !hojaAbierta(m));
  comprobar("los saldos se listan con el nombre del cliente, no con su código",
    /Comercial Nilo/.test(t) && /Abarrotes Don Pepe/.test(t) && !/CLI-001/.test(t));
  comprobar("el que no tiene número de factura se rotula SALDO ANTERIOR", /SALDO ANTERIOR/.test(t));
  comprobar("suma el total de lo que le deben", /2 saldo\(s\) de apertura/.test(t) && /\$2\.300,50/.test(t));

  /* ── 5 · lo que se manda es lo que se cargó ──────────────────────── */
  tocar(m, "Marcar el arranque"); await esperar(200);
  comprobar("antes de marcar, pregunta y resume lo que va a pasar",
    /¿Marcamos el arranque\?/.test(txt(m)) && /no hay botón para deshacerlo/.test(txt(m)));
  tocar(m, "Sí, marcar el arranque"); await esperar(320);
  const ab = m.rpc.filter((r) => r.nombre === "abrir_operacion")[0] || {};
  comprobar("le manda a la base la fecha elegida", ab.args && ab.args.p_inicio === HOY);
  comprobar("y los saldos EXACTAMENTE como se cargaron, sin inventar",
    ab.args && Array.isArray(ab.args.p_saldos) && ab.args.p_saldos.length === 2 &&
    ab.args.p_saldos[0].cli_id === "CLI-001" && ab.args.p_saldos[0].monto === 1500 &&
    ab.args.p_saldos[0].doc === "F-1001" && ab.args.p_saldos[0].emision === "2026-06-10" &&
    ab.args.p_saldos[1].cli_id === "CLI-002" && ab.args.p_saldos[1].monto === 800.5 &&
    ab.args.p_saldos[1].doc === undefined);
  comprobar("y repite al usuario lo que respondió la base",
    m.avisos.some((a) => /Operación abierta el 01\/07\/2026/.test(a)));

  /* ── 6 · sin saldos, avisa lo que eso significa ──────────────────── */
  const m2 = montar({ cierres: [] });
  await esperar(320);
  tocar(m2, "Marcar el arranque"); await esperar(200);
  comprobar("si no se cargó ningún saldo, advierte que creerá que nadie debe nada",
    /nadie te\s+debe nada/.test(txt(m2).replace(/\s+/g, " ")));

  /* ── 7 · si la base se niega, se dice y NO se canta victoria ─────── */
  const m3 = montar({ cierres: [], fallaRpc: { nombre: "abrir_operacion", mensaje: "La operación ya se abrió antes. Esto se hace una sola vez." } });
  await esperar(320);
  tocar(m3, "Marcar el arranque"); await esperar(200);
  tocar(m3, "Sí, marcar el arranque"); await esperar(320);
  comprobar("si la base se niega, muestra su motivo tal cual",
    m3.avisos.some((a) => /una sola vez/.test(a)));
  comprobar("y no dice que quedó marcado", !m3.avisos.some((a) => /Operación abierta/.test(a)));

  /* ── 8 · ya arrancado ────────────────────────────────────────────── */
  const m4 = montar({ cierres: CIERRES_ABIERTO });
  await esperar(340);
  t = txt(m4);
  comprobar("muestra el día en que arrancó", /Arrancaste el 2026-07-01/.test(t));
  comprobar("y hasta cuándo está cerrado", /Cerrado hasta el/.test(t) && /2026-07-15/.test(t));
  comprobar("aclara que una factura vieja SÍ se puede cobrar hoy",
    /Cobrar hoy una factura vieja sí se puede/.test(t));
  comprobar("ya no ofrece marcar el arranque otra vez", !hay(m4, "Marcar el arranque"));
  comprobar("lista lo ya cerrado, con el arranque incluido",
    /Arranque/.test(t) && /Mes 2026-07/.test(t) && /\$3\.200,00/.test(t));

  /* ── 9 · cerrar un período ───────────────────────────────────────── */
  comprobar("no deja cerrar sin decir hasta qué día",
    vm.runInContext('window.__apagado("Cerrar el período")', m4.ctx) === true);
  poner(m4, "¿Hasta qué día se cierra?", "2026-07-31");
  await esperar(200);
  tocar(m4, "El año"); await esperar(160);
  tocar(m4, "Cerrar el período"); await esperar(320);
  const ce = m4.rpc.filter((r) => r.nombre === "cerrar_periodo")[0] || {};
  comprobar("manda el tipo y el día que se eligieron",
    ce.args && ce.args.p_tipo === "anual" && ce.args.p_hasta === "2026-07-31");
  comprobar("advierte que con notas de crédito sin resolver no va a dejar cerrar",
    /no va a dejar\s+cerrar/.test(txt(m4).replace(/\s+/g, " ")));

  /* ── 10 · reabrir ────────────────────────────────────────────────── */
  const m5 = montar({ cierres: CIERRES_ABIERTO });
  await esperar(340);
  comprobar("ofrece reabrir el último cierre, nombrándolo", hay(m5, "Reabrir el último (2026-07)"));
  tocar(m5, "Reabrir el último"); await esperar(200);
  comprobar("reabrir sin motivo está apagado",
    vm.runInContext('window.__apagado("Sí, reabrir")', m5.ctx) === true);
  poner(m5, "¿Por qué lo reabres?", "me equivoqué de fecha");
  await esperar(200);
  tocar(m5, "Sí, reabrir"); await esperar(320);
  const re = m5.rpc.filter((r) => r.nombre === "reabrir_ultimo_cierre")[0] || {};
  comprobar("el motivo viaja a la base tal cual se escribió",
    re.args && re.args.p_motivo === "me equivoqué de fecha");

  /* ── 11 · la apertura no se ofrece para reabrir ──────────────────── */
  const m6 = montar({ cierres: SOLO_APERTURA });
  await esperar(340);
  comprobar("si lo único cerrado es el arranque, no ofrece reabrirlo",
    !hay(m6, "Reabrir el último"));

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
