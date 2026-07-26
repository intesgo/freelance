/* ═══════════════════════════════════════════════════════════════════════
   LO QUE RICHARD LE FACTURA A CADA PILADORA · freelance-completo b376

   Es su ingreso principal, y hasta hoy el sistema no lo sabía calcular. La
   cuenta la hace la base; la pantalla solo la pide y la muestra. Por eso lo
   que se comprueba aquí es que la MUESTRE BIEN y que **no invente nada**:

     · pide la cuenta del mes que se está viendo, no del de hoy;
     · muestra los números que devolvió la base, sin recalcular por su cuenta;
     · si no hay datos reales cae a los de práctica y LO ROTULA;
     · si no hay ni eso, lo dice con palabras, no con una pantalla vacía;
     · los quintales de regalo se muestran y se aclara que NO se descuentan;
     · si falta un costo, avisa que la cifra está incompleta;
     · el respaldo se pide con la piladora correcta y sale pedido por pedido;
     · no deja avanzar al futuro.

   Uso: node test_comision_piladora.js [ruta.html]
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

const hoy = new Date();
const MES = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0");
const mesAtras = (n) => { const d = new Date(hoy.getFullYear(), hoy.getMonth() - n, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };

/* Lo que devuelve la base. Los nombres son los de la función real. */
const REAL = [{
  prov_cod: "AGU", piladora: "Piladora San Agustín", pedidos: 2, qq: 160,
  venta: 5840, costo: 4760, comision: 1080, gratis_qq: 5,
  del_vendedor: 130, te_queda: 950, sin_costo: 0, a_medio_cobrar: 1,
}, {
  prov_cod: "ROS", piladora: "Piladora Santa Rosa", pedidos: 1, qq: 40,
  venta: 1900, costo: 1520, comision: 380, gratis_qq: 0,
  del_vendedor: 0, te_queda: 380, sin_costo: 2, a_medio_cobrar: 0,
}];
const DETALLE = [{
  ped_id: "PD-0020", cliente: "Comercial Nilo", dia_cobro: MES + "-14", pago_prov: "contado",
  qq: 80, venta: 2920, costo: 2340, comision: 580, gratis_qq: 5, sin_costo: 0,
}, {
  ped_id: "PD-0021", cliente: "Abarrotes Don Pepe", dia_cobro: MES + "-22", pago_prov: "credito",
  qq: 70, venta: 2555, costo: 2117.50, comision: 437.50, gratis_qq: 0, sin_costo: 0,
  qq_pedido: 80, qq_devuelto: 10,
}];

function montar({ hayReal = true, hayPractica = true } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  w.Notification = function () {}; w.Notification.permission = "denied"; w.Notification.requestPermission = async () => "denied";

  const rpc = [];
  const q = () => {
    const p = Promise.resolve({ data: [], error: null, count: 0 });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "gte", "lte", "or"].forEach((m) => { p[m] = () => q(); });
    p.maybeSingle = () => Promise.resolve({ data: null, error: null }); p.single = p.maybeSingle;
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
    from: () => q(),
    rpc: async (nombre, args) => {
      rpc.push({ nombre, args });
      if (nombre === "comision_piladora") {
        /* Solo el mes en curso tiene movimiento; los anteriores están vacíos. */
        const delMes = String(args.p_mes || "").slice(0, 7) === MES;
        if (!delMes) return { data: [], error: null };
        if (!args.p_demo) return { data: hayReal ? REAL : [], error: null };
        return { data: hayPractica ? [REAL[0]] : [], error: null };
      }
      if (nombre === "comision_piladora_detalle") return { data: DETALLE, error: null };
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
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__cont).render(
        React.createElement(ComisionPiladora, { toast: function(){} }));
    });
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tocar = function(texto){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto) >= 0 && !bs[i].disabled){ bs[i].click(); return true; } }
      return false;
    };
    window.__apagado = function(texto){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").trim() === texto) return !!bs[i].disabled; }
      return null;
    };
  `, ctx);
  return { ctx, rpc };
}
const txt = (m) => vm.runInContext("window.__txt()", m.ctx);
const tocar = (m, t) => vm.runInContext(`window.__tocar(${JSON.stringify(t)})`, m.ctx);

(async () => {
  console.log("═══ Lo que le facturas a cada piladora · " + nombreApp);

  /* ── 1 · con datos de verdad ── */
  const m = montar();
  await esperar(320);
  let t = txt(m);

  const pedido1 = m.rpc.filter((r) => r.nombre === "comision_piladora")[0] || {};
  comprobar("le pide la cuenta a la base, del mes que se está viendo",
    pedido1.args && pedido1.args.p_mes === MES + "-01" && pedido1.args.p_demo === false);
  comprobar("con datos reales NO vuelve a pedir los de práctica",
    m.rpc.filter((r) => r.nombre === "comision_piladora").length === 1);
  comprobar("y no se rotula como práctica", !/Datos de práctica/.test(t));

  comprobar("muestra el total del mes, sumando las dos piladoras", /\$1\.460,00/.test(t));
  comprobar("y cuánto le queda después de pagarle al equipo", /\$1\.330,00/.test(t));
  comprobar("nombra cada piladora con su comisión",
    /Piladora San Agustín/.test(t) && /\$1\.080,00/.test(t) &&
    /Piladora Santa Rosa/.test(t) && /\$380,00/.test(t));
  comprobar("muestra el respaldo de la cifra: pedidos, quintales, venta y costo",
    /2 pedidos/.test(t) && /160 qq/.test(t) && /\$5\.840,00/.test(t) && /\$4\.760,00/.test(t));

  comprobar("dice los quintales de regalo Y que no están descontados",
    /5 qq de regalo/.test(t) && /No están descontados/.test(t));
  comprobar("avisa que una cifra está incompleta si falta un costo",
    /le falta el costo de esta piladora/.test(t) && /2 líneas/.test(t));
  comprobar("no esconde los pedidos cobrados a medias", /cobrado a medias/.test(t));
  comprobar("advierte que los costos de contado de hoy son provisionales",
    /provisionales/.test(t));

  /* ── 2 · el respaldo ── */
  tocar(m, "Ver el respaldo");
  await esperar(320);
  t = txt(m);
  const det = m.rpc.filter((r) => r.nombre === "comision_piladora_detalle")[0] || {};
  comprobar("pide el respaldo de la piladora que se tocó, y del mismo mes",
    det.args && det.args.p_prov === "AGU" && det.args.p_mes === MES + "-01" && det.args.p_demo === false);
  comprobar("el respaldo sale pedido por pedido, con su cliente",
    /PD-0020/.test(t) && /Comercial Nilo/.test(t) && /PD-0021/.test(t) && /Abarrotes Don Pepe/.test(t));
  comprobar("dice cómo se le pagó a la piladora en cada pedido",
    /le pagaste de contado/.test(t) && /le pagaste a crédito/.test(t));
  comprobar("y cuándo terminó de pagar el cliente", /cobrado el 14\/|cobrado el 22\//.test(t));
  comprobar("si hubo devolución, la muestra y dice que ya está descontada",
    /10 qq devueltos con nota de crédito/.test(t) && /ya están descontados/.test(t));
  comprobar("y no la inventa donde no la hubo",
    (t.match(/qq devueltos con nota de crédito/g) || []).length === 1);
  tocar(m, "Ocultar el respaldo");
  await esperar(200);
  comprobar("el respaldo se puede volver a cerrar", !/Abarrotes Don Pepe/.test(txt(m)));

  /* ── 3 · sin datos reales: cae a la práctica y lo dice ── */
  const m2 = montar({ hayReal: false });
  await esperar(340);
  t = txt(m2);
  comprobar("sin datos reales pide los de práctica",
    m2.rpc.filter((r) => r.nombre === "comision_piladora" && r.args.p_demo === true).length === 1);
  comprobar("y AVISA que lo que se ve es práctica, no plata de verdad",
    /Datos de práctica/.test(t) && /demostración sembrada/.test(t));

  /* ── 4 · sin nada de nada ── */
  const m3 = montar({ hayReal: false, hayPractica: false });
  await esperar(340);
  t = txt(m3);
  comprobar("sin nada, lo explica con palabras en vez de dejar la pantalla vacía",
    /no hay ningún pedido con el cliente ya pagado/.test(t));
  comprobar("y no inventa un total de cero dólares", !/\$0,00/.test(t));

  /* ── 5 · el mes ── */
  const m4 = montar();
  await esperar(320);
  comprobar("no deja avanzar al mes que todavía no llega",
    vm.runInContext('window.__apagado("›")', m4.ctx) === true);
  tocar(m4, "‹");
  await esperar(340);
  const ultimo = m4.rpc.filter((r) => r.nombre === "comision_piladora").pop() || {};
  comprobar("al ir al mes anterior, le pide a la base ESE mes",
    ultimo.args && ultimo.args.p_mes === mesAtras(1) + "-01");
  comprobar("y si ese mes no tuvo cobros, lo dice",
    /no hay ningún pedido con el cliente ya pagado/.test(txt(m4)));

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
