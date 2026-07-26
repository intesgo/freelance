/* ═══════════════════════════════════════════════════════════════════════
   CUÁNTO GANA CADA VENDEDOR · freelance-completo b377

   El paso "Acuerdo de comisión" existía en la línea de vida del pedido con
   NADA detrás: el sistema nunca supo cuánto gana nadie y por eso nunca
   generó una comisión. Aquí se comprueba, contra el bundle real, la
   pantalla que lo arregla:

     · lista al equipo con su tarifa por quintal, y avisa fuerte de quién
       NO tiene acuerdo —sus pedidos se facturan sin comisión—;
     · muestra las tarifas pactadas aparte con clientes puntuales;
     · manda a la base el vendedor, el valor y la fecha correctos;
     · una tarifa para un solo cliente viaja con ese cliente; la de siempre
       viaja SIN cliente, no con uno vacío;
     · no deja elegir una fecha pasada ni guardar a medias;
     · cero es un valor válido y se puede guardar;
     · si la base rechaza, muestra el motivo y no dice que guardó;
     · después de guardar, vuelve a leer: lo que ves queda al día.

   Uso: node test_comision_equipo.js [ruta.html]
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
const esperar = (ms) => new Promise((r) => setTimeout(r, ms || 200));
const hoy = new Date().toISOString().slice(0, 10);

const GENTE = [
  { usr_id: "SC1", nombre: "Carlos Andrade", rol: "subcomisionista", activo: true, es_demo: false },
  { usr_id: "SOC1", nombre: "Marta Vera", rol: "socio", activo: true, es_demo: false },
  { usr_id: "SC9", nombre: "Nuevo Sin Acuerdo", rol: "subcomisionista", activo: true, es_demo: false },
];
const ACUERDOS = [
  { acu_id: "A1", sub_id: "SC1", cli_id: null, usd_qq: 1.5, vigente_desde: "2026-07-01", vigente_hasta: null, nota: null },
  { acu_id: "A2", sub_id: "SC1", cli_id: "CLI-01", usd_qq: 0.8, vigente_desde: "2026-07-10", vigente_hasta: null, nota: "cliente grande" },
  /* Uno CERRADO y con fecha POSTERIOR al vigente: si la pantalla no filtra por
     `vigente_hasta`, este gana por ser el más nuevo y muestra 9,99. Antes esta
     fila tenía fecha anterior y la prueba pasaba igual con el filtro roto: era
     un falso consuelo, y se vio al romper el código a propósito. */
  { acu_id: "A3", sub_id: "SC1", cli_id: null, usd_qq: 9.99, vigente_desde: "2026-07-10", vigente_hasta: "2026-07-12", nota: null },
  { acu_id: "A4", sub_id: "SOC1", cli_id: null, usd_qq: 2, vigente_desde: "2026-07-05", vigente_hasta: null, nota: null },
];
const COMIS = [
  { sub_id: "SC1", monto: 48, estado: "Generada" },
  { sub_id: "SC1", monto: 60, estado: "Pagada" },
  { sub_id: "SOC1", monto: 100, estado: "Cliente pagó" },
];
const CLIENTES = [
  { cli_id: "CLI-01", nombre: "Comercial Nilo", sub_id: "SC1" },
  { cli_id: "CLI-02", nombre: "Abarrotes Don Pepe", sub_id: "SC1" },
  { cli_id: "CLI-03", nombre: "Distribuidora Ríos", sub_id: "SOC1" },
];

function montar({ hayGente = true, fallaGuardar = false } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  w.Notification = function () {}; w.Notification.permission = "denied"; w.Notification.requestPermission = async () => "denied";

  const rpc = []; const leidas = [];
  const q = (t) => {
    const datos = t === "usuarios" ? (hayGente ? GENTE : [])
      : t === "acuerdos_comision" ? ACUERDOS
      : t === "comisiones" ? COMIS
      : t === "clientes" ? CLIENTES : [];
    leidas.push(t);
    const p = Promise.resolve({ data: datos, error: null, count: 0 });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "gte", "lte", "or"].forEach((m) => { p[m] = () => q(t); });
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
    from: (t) => q(t),
    rpc: async (nombre, args) => {
      rpc.push({ nombre, args });
      if (nombre === "fijar_tarifa") {
        if (fallaGuardar) return { data: null, error: { message: "Una comisión no puede empezar a regir en una fecha pasada." } };
        return { data: [{ acu_id: "A9", desde: args.p_desde, usd_qq: args.p_usd,
                          aviso: "Carlos Andrade · " + args.p_usd + " por quintal · Rige desde hoy" }], error: null };
      }
      return { data: null, error: null };
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    window.__avisos = [];
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__cont).render(React.createElement(ComisionesEquipo, {
        toast: function(m){ window.__avisos.push(m); } }));
    });
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tocar = function(texto, n){
      var bs = window.__cont.querySelectorAll("button"), vistos = 0;
      for(var i=0;i<bs.length;i++){
        if((bs[i].textContent||"").indexOf(texto) >= 0 && !bs[i].disabled){
          if(vistos === (n||0)){ bs[i].click(); return true; } vistos++;
        }
      }
      return false;
    };
    window.__apagado = function(texto){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto) >= 0) return !!bs[i].disabled; }
      return null;
    };
    window.__escribir = function(etiqueta, valor){
      var ls = window.__cont.querySelectorAll("label");
      for(var i=0;i<ls.length;i++){
        if((ls[i].textContent||"").indexOf(etiqueta) >= 0){
          var el = ls[i].parentElement.querySelector("input") || ls[i].parentElement.querySelector("select");
          if(!el) continue;
          var proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto,"value").set.call(el, valor);
          el.dispatchEvent(new window.Event("input",{bubbles:true}));
          el.dispatchEvent(new window.Event("change",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
    window.__minFecha = function(){
      var e = window.__cont.querySelector('input[type="date"]');
      return e ? e.getAttribute("min") : null;
    };
    window.__opciones = function(){
      var s = window.__cont.querySelector("select");
      if(!s) return null;
      return Array.prototype.map.call(s.querySelectorAll("option"), function(o){ return o.textContent; });
    };
  `, ctx);
  return { ctx, rpc, leidas };
}
const txt = (m) => vm.runInContext("window.__txt()", m.ctx);
const tocar = (m, t, n) => vm.runInContext(`window.__tocar(${JSON.stringify(t)}, ${n || 0})`, m.ctx);
const escribir = (m, e, v) => vm.runInContext(`window.__escribir(${JSON.stringify(e)}, ${JSON.stringify(v)})`, m.ctx);
const apagado = (m, t) => vm.runInContext(`window.__apagado(${JSON.stringify(t)})`, m.ctx);
const avisos = (m) => vm.runInContext("window.__avisos", m.ctx);

(async () => {
  console.log("═══ Cuánto gana cada vendedor · " + nombreApp);

  const m = montar();
  await esperar(340);
  let t = txt(m);

  comprobar("lista al equipo con su tarifa por quintal",
    /Carlos Andrade/.test(t) && /\$1,50/.test(t) && /Marta Vera/.test(t) && /\$2,00/.test(t));
  comprobar("un acuerdo ya cerrado no se muestra como vigente, aunque sea el más nuevo",
    !/\$9,99/.test(t) && /\$1,50/.test(t));
  comprobar("dice quién es socio y quién subcomisionista",
    /Socio comercial/.test(t) && /Subcomisionista/.test(t));
  comprobar("avisa fuerte de quién NO tiene acuerdo",
    /1 sin acuerdo/.test(t) && /Sin acuerdo/.test(t));
  comprobar("y explica la consecuencia: sus pedidos se facturan sin comisión",
    /se facturan sin generar comisión/.test(t));
  comprobar("muestra lo pactado aparte con un cliente",
    /Pactado aparte con 1 cliente/.test(t) && /Comercial Nilo/.test(t) && /\$0,80/.test(t));
  comprobar("muestra lo que lleva ganado y lo que falta pagarle",
    /\$108,00/.test(t) && /\$48,00 sin pagarle/.test(t));
  comprobar("advierte que los quintales de regalo no se comisionan",
    /no se comisionan/.test(t));

  /* ── la hoja ── */
  tocar(m, "Cambiar su comisión");
  await esperar(240);
  t = txt(m);
  comprobar("la hoja pregunta por esa persona, con nombre", /¿Cuánto gana Carlos Andrade\?/.test(t));
  comprobar("aclara que cero es válido", /Cero es válido/.test(t));
  comprobar("deja elegir entre todos sus clientes o uno solo",
    /Todos sus clientes/.test(t) && /Solo un cliente/.test(t));

  escribir(m, "Dólares por quintal", "1.75");
  await esperar(160);
  tocar(m, "Guardar la comisión");
  await esperar(300);
  let l = m.rpc.filter((r) => r.nombre === "fijar_tarifa")[0] || {};
  comprobar("manda el vendedor, el valor y la fecha de hoy",
    l.args && l.args.p_sub === "SC1" && Number(l.args.p_usd) === 1.75 && l.args.p_desde === hoy);
  comprobar("la tarifa de siempre viaja SIN cliente, no con uno vacío",
    l.args && l.args.p_cli === null);
  comprobar("avisa con las palabras que devuelve la base",
    avisos(m).some((a) => /por quintal/.test(String(a))));
  comprobar("y vuelve a leer el equipo: lo que ves queda al día",
    m.leidas.filter((x) => x === "acuerdos_comision").length >= 2);

  /* ── una tarifa para un solo cliente ── */
  const m2 = montar();
  await esperar(340);
  tocar(m2, "Cambiar su comisión"); await esperar(240);
  tocar(m2, "Solo un cliente"); await esperar(200);
  const opc = vm.runInContext("window.__opciones()", m2.ctx) || [];
  comprobar("ofrece solo los clientes DE ESE vendedor",
    opc.some((o) => /Comercial Nilo/.test(o)) && opc.some((o) => /Abarrotes Don Pepe/.test(o)) &&
    !opc.some((o) => /Distribuidora Ríos/.test(o)));
  comprobar("sin elegir cliente todavía no deja guardar", apagado(m2, "Guardar la comisión") === true);
  escribir(m2, "Dólares por quintal", "0.90");
  escribir(m2, "¿Con qué cliente?", "CLI-02");
  await esperar(200);
  tocar(m2, "Guardar la comisión");
  await esperar(300);
  l = m2.rpc.filter((r) => r.nombre === "fijar_tarifa")[0] || {};
  comprobar("la tarifa pactada viaja con su cliente",
    l.args && l.args.p_cli === "CLI-02" && Number(l.args.p_usd) === 0.9);

  /* ── cero es válido ── */
  const m3 = montar();
  await esperar(340);
  tocar(m3, "Cambiar su comisión"); await esperar(240);
  escribir(m3, "Dólares por quintal", "0");
  await esperar(200);
  comprobar("cero se puede guardar: hay clientes que se atienden sin comisión",
    apagado(m3, "Guardar la comisión") === false);

  /* ── la fecha ── */
  const m4 = montar();
  await esperar(340);
  tocar(m4, "Cambiar su comisión"); await esperar(240);
  tocar(m4, "Desde una fecha"); await esperar(200);
  comprobar("al elegir fecha, el calendario no deja días pasados",
    vm.runInContext("window.__minFecha()", m4.ctx) === hoy);
  comprobar("y explica por qué", /no se puede poner una fecha pasada/i.test(txt(m4)));
  escribir(m4, "Dólares por quintal", "2.00");
  await esperar(160);
  comprobar("sin poner la fecha, no deja guardar", apagado(m4, "Guardar la comisión") === true);

  /* ── si la base dice que no ── */
  const m5 = montar({ fallaGuardar: true });
  await esperar(340);
  tocar(m5, "Cambiar su comisión"); await esperar(240);
  escribir(m5, "Dólares por quintal", "3");
  await esperar(160);
  tocar(m5, "Guardar la comisión");
  await esperar(300);
  comprobar("si la base rechaza, muestra el motivo de verdad",
    avisos(m5).some((a) => /fecha pasada/.test(String(a))));
  comprobar("y NO dice que guardó", !avisos(m5).some((a) => /Rige desde hoy/.test(String(a))));

  /* ── sin equipo ── */
  const m6 = montar({ hayGente: false });
  await esperar(340);
  comprobar("sin vendedores, lo dice con palabras",
    /Todavía no tienes vendedores/.test(txt(m6)));

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
