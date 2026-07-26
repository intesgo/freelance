/* ═══════════════════════════════════════════════════════════════════════
   AL APROBAR EL PEDIDO, CÓMO LE PAGAS A LA PILADORA · freelance-completo b375

   Son dos cosas distintas que se venían confundiendo: `condicion` es cómo te
   paga el CLIENTE; `pago_prov` es cómo le pagas TÚ a la piladora. La
   diferencia entre el costo de crédito y el de contado es plata de Richard,
   así que la pantalla tiene que preguntarlo en el único momento en que el
   pedido pasa por sus manos: al aprobarlo.

   Contra el bundle real se comprueba:
     · el botón aparece SOLO con datos de verdad y SOLO si espera aprobación;
     · en la demostración no aparece: no se promete lo que no escribe;
     · la hoja viene marcada con la costumbre de esa piladora, pero igual hay
       que confirmar; sin costumbre no se puede aprobar a ciegas;
     · el ahorro sale de la base, no de la pantalla;
     · si a un producto le falta el costo, lo DICE en vez de mostrar un
       ahorro incompleto como si fuera bueno;
     · manda a la base el pedido, la forma de pago y el "recordar" correctos;
     · si la base falla, avisa y no canta victoria;
     · ya decidido, el detalle dice cómo se le paga.

   Uso: node test_aprobar_pedido.js [ruta.html]
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
const esperar = (ms) => new Promise((r) => setTimeout(r, ms || 160));

/* La cuenta que devuelve la base: 80 qq, $2420 a crédito, $2340 de contado. */
const CUENTA_BUENA = { qq: 80, total_credito: 2420, total_contado: 2340, ahorro: 80, sin_costo: 0 };
const CUENTA_COJA = { qq: 15, total_credito: 350, total_contado: 340, ahorro: 10, sin_costo: 1 };
const CUENTA_SIN_DESCUENTO = { qq: 40, total_credito: 1400, total_contado: 1400, ahorro: 0, sin_costo: 0 };

/* Un pedido armado EXACTAMENTE como lo arma vivoPedidos: ni un campo de más. */
const ETAPAS = 10;
function pedido(extra) {
  return Object.assign({
    id: "PD-0013", cli: "Comercial Nilo", prov: "Piladora San Agustín",
    fecha: "2026-07-26", prod: "Arrox Extra Lira · Quintal y 1 más",
    cant: 80, precio: 42, cond: "Crédito", comision: 0,
    estado: "Esperando aprobación", etapa: 1, sync: "ok", comisionLiberada: false,
    factura: "", ciudad: "", demo: false,
    provCod: "AGU", pagoProv: "", pagoHabitual: "",
    linea: Array.from({ length: ETAPAS }, (_, i) => ({ t: "Paso " + i, f: i ? "—" : "hoy", st: i ? "wait" : "ok", d: "" })),
  }, extra || {});
}

function montar({ cuenta = CUENTA_BUENA, fallaAprobar = false } = {}) {
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
    p.insert = () => Promise.resolve({ error: null }); p.upsert = () => Promise.resolve({ error: null });
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
      if (nombre === "ahorro_contado") return { data: [cuenta], error: null };
      if (nombre === "aprobar_pedido") {
        if (fallaAprobar) return { data: null, error: { message: "Ese pedido ya no está esperando aprobación (está en facturado)." } };
        return { data: [{ ped_id: args.p_ped, estado: "enviado_proveedor", pago_prov: args.p_pago,
                          aviso: "Enviado a Piladora San Agustín · le pagas " + (args.p_pago === "contado" ? "de contado" : "a crédito") }], error: null };
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
    window.__avisos = []; window.__recargas = 0;
    window.__montar = function(p, vivo){
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__cont).render(React.createElement(DetallePedido, {
          p: p, modo: "factura", vivo: vivo,
          volver: function(){},
          toast: function(m){ window.__avisos.push(m); },
          onAprobado: function(){ window.__recargas++; },
        }));
      });
    };
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tocar = function(texto){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto) >= 0){ bs[i].click(); return true; } }
      return false;
    };
    window.__apagado = function(texto){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto) >= 0) return !!bs[i].disabled; }
      return null;
    };
    window.__marcar = function(){
      var c = window.__cont.querySelector('input[type="checkbox"]');
      if(!c) return false;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"checked").set.call(c, true);
      c.dispatchEvent(new window.Event("click",{bubbles:true}));
      return true;
    };
    window.__hayCasilla = function(){ return !!window.__cont.querySelector('input[type="checkbox"]'); };
  `, ctx);
  return { ctx, rpc };
}

const txt = (m) => vm.runInContext("window.__txt()", m.ctx);
const tocar = (m, t) => vm.runInContext(`window.__tocar(${JSON.stringify(t)})`, m.ctx);
const apagado = (m, t) => vm.runInContext(`window.__apagado(${JSON.stringify(t)})`, m.ctx);
const avisos = (m) => vm.runInContext("window.__avisos", m.ctx);
const recargas = (m) => vm.runInContext("window.__recargas", m.ctx);
const abrir = async (m, p, vivo) => {
  vm.runInContext(`window.__montar(${JSON.stringify(p)}, ${vivo ? "true" : "false"})`, m.ctx);
  await esperar(220);
};

(async () => {
  console.log("═══ Cómo le pagas a la piladora al aprobar · " + nombreApp);

  /* ── 1 · cuándo aparece y cuándo no ── */
  const m1 = montar();
  await abrir(m1, pedido(), true);
  comprobar("con datos de verdad, el pedido pide que lo apruebes", /Este pedido te está esperando/.test(txt(m1)));
  comprobar("y el botón dice a dónde va", /Aprobar y enviar a la piladora/.test(txt(m1)));

  const m2 = montar();
  await abrir(m2, pedido(), false);
  comprobar("en la demostración NO aparece: no promete lo que no escribe",
    !/Aprobar y enviar a la piladora/.test(txt(m2)));

  const m3 = montar();
  await abrir(m3, pedido({ demo: true }), true);
  comprobar("un pedido de práctica tampoco se aprueba", !/Aprobar y enviar a la piladora/.test(txt(m3)));

  const m4 = montar();
  await abrir(m4, pedido({ estado: "Facturado", pagoProv: "contado" }), true);
  comprobar("un pedido que ya salió no vuelve a pedir aprobación",
    !/Aprobar y enviar a la piladora/.test(txt(m4)));
  comprobar("pero sí dice cómo se le paga a la piladora", /le pagas de contado/.test(txt(m4)));

  /* ── 2 · la hoja ── */
  const m5 = montar();
  await abrir(m5, pedido(), true);
  tocar(m5, "Aprobar y enviar a la piladora");
  await esperar(260);
  let t = txt(m5);
  comprobar("la hoja pregunta por la piladora, con nombre", /¿Cómo le pagas a Piladora San Agustín\?/.test(t));
  comprobar("ofrece las dos formas", /De contado/.test(t) && /A crédito/.test(t));
  comprobar("recuerda que lo del cliente es otra cosa", /el cliente te paga a crédito/.test(t));
  comprobar("saca la cuenta con los números de la base, no inventados",
    /\$2\.420,00/.test(t) && /\$2\.340,00/.test(t) && /\$80,00/.test(t) && /80 qq/.test(t));
  comprobar("sin elegir nada todavía no se puede aprobar", apagado(m5, "Confirmar y enviar") === true);
  comprobar("mientras no elijas, no pregunta si es lo habitual",
    vm.runInContext("window.__hayCasilla()", m5.ctx) === false);

  /* ── 3 · elegir, recordar y mandar ── */
  tocar(m5, "De contado");
  await esperar(160);
  comprobar("al elegir, ya se puede aprobar", apagado(m5, "Confirmar y enviar") === false);
  comprobar("y recién ahí ofrece dejarlo como costumbre",
    /Es lo habitual con Piladora San Agustín/.test(txt(m5)));

  vm.runInContext("window.__marcar()", m5.ctx);
  await esperar(160);
  tocar(m5, "Confirmar y enviar");
  await esperar(300);
  const llamada = m5.rpc.filter((r) => r.nombre === "aprobar_pedido")[0] || {};
  comprobar("manda a la base el pedido, la forma de pago y el recordar",
    llamada.args && llamada.args.p_ped === "PD-0013" && llamada.args.p_pago === "contado" && llamada.args.p_recordar === true);
  comprobar("avisa con las palabras que devuelve la base",
    avisos(m5).some((a) => /Enviado a Piladora San Agustín · le pagas de contado/.test(String(a))));
  comprobar("y manda a recargar la lista: lo que ves queda al día", recargas(m5) === 1);

  /* ── 4 · sin marcar la casilla, no se guarda costumbre ── */
  const m6 = montar();
  await abrir(m6, pedido(), true);
  tocar(m6, "Aprobar y enviar a la piladora"); await esperar(260);
  tocar(m6, "A crédito"); await esperar(160);
  tocar(m6, "Confirmar y enviar"); await esperar(300);
  const l6 = m6.rpc.filter((r) => r.nombre === "aprobar_pedido")[0] || {};
  comprobar("si no marcas nada, no se guarda ninguna costumbre",
    l6.args && l6.args.p_recordar === false && l6.args.p_pago === "credito");

  /* ── 5 · la costumbre viene marcada, pero no decide sola ── */
  const m7 = montar();
  await abrir(m7, pedido({ pagoHabitual: "contado" }), true);
  tocar(m7, "Aprobar y enviar a la piladora"); await esperar(260);
  comprobar("con costumbre guardada, la hoja ya viene marcada y deja aprobar",
    apagado(m7, "Confirmar y enviar") === false);
  comprobar("pero igual hay que confirmar: no se aprueba solo",
    m7.rpc.filter((r) => r.nombre === "aprobar_pedido").length === 0);

  /* ── 6 · costos que faltan: se dice, no se disimula ── */
  const m8 = montar({ cuenta: CUENTA_COJA });
  await abrir(m8, pedido(), true);
  tocar(m8, "Aprobar y enviar a la piladora"); await esperar(260);
  t = txt(m8);
  comprobar("si a un producto le falta el costo, lo dice",
    /le falta el costo de la piladora/.test(t) && /1 producto/.test(t));
  comprobar("y no presume un ahorro con la cuenta coja", !/te ahorras/.test(t));

  /* ── 7 · piladora sin descuento por contado ── */
  const m9 = montar({ cuenta: CUENTA_SIN_DESCUENTO });
  await abrir(m9, pedido(), true);
  tocar(m9, "Aprobar y enviar a la piladora"); await esperar(260);
  comprobar("si la piladora no da descuento, lo dice sin rodeos",
    /no hace descuento por contado/.test(txt(m9)));

  /* ── 8 · si la base dice que no ── */
  const m10 = montar({ fallaAprobar: true });
  await abrir(m10, pedido(), true);
  tocar(m10, "Aprobar y enviar a la piladora"); await esperar(260);
  tocar(m10, "De contado"); await esperar(160);
  tocar(m10, "Confirmar y enviar"); await esperar(300);
  comprobar("si la base rechaza, muestra el motivo de verdad",
    avisos(m10).some((a) => /ya no está esperando aprobación/.test(String(a))));
  comprobar("y NO dice que se aprobó ni recarga nada", recargas(m10) === 0);

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
