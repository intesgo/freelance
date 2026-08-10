/* ═══════════════════════════════════════════════════════════════════════
   LA NOTA DE CRÉDITO Y A QUIÉN LE DUELE · proveedor b63 · fc b380

   Regla funcional (26 jul): después de la factura, una devolución se
   corrige con una nota de crédito POR PRODUCTO. Y lo que decide si toca las
   comisiones **no es el motivo: es de quién nació**. Si la pidió el
   vendedor, el socio o el freelance, baja la comisión de los involucrados.
   Si la hace la piladora por su cuenta, ella la absorbe y nadie del equipo
   pierde. La deuda del cliente baja siempre.

   Contra los dos bundles reales:
     · la piladora solo ve el botón en pedidos YA facturados;
     · la hoja pregunta de quién nació ANTES que el monto, y dice en cada
       caso qué va a pasar con las comisiones;
     · no guarda sin origen, sin quintales, sin valor ni sin motivo;
     · manda a la base la línea, los quintales, el valor y el origen;
     · el freelance ve las pendientes, quién las pidió y qué le cuesta;
     · rechazar exige motivo;
     · una que asumió la piladora se muestra diciendo que NO bajó comisiones.

   Uso: node test_nota_credito.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms || 200));
const compilar = (ruta) => {
  const html = fs.readFileSync(ruta, "utf-8");
  const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
  return R.Babel.transform(jsx, { presets: ["react"] }).code;
};
function ventana(dom) {
  const w = dom.window;
  w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  w.Notification = function () {}; w.Notification.permission = "denied"; w.Notification.requestPermission = async () => "denied";
  return w;
}

/* ═══ LA PILADORA ═══════════════════════════════════════════════════════ */
const FACTURADO = {
  id: "PED-DEMO-01", cliente: "Cliente Demo Norte", detalle: "Producto Demo A · 100 qq · crédito",
  monto: 4800, fecha: "26 jul", estado: "facturado", factura: "FAC-DEMO-01", demo: true,
  lineas: [{ itemId: "PED-DEMO-01-I1", nombre: "Producto Demo A", pedido: 100, precio: 48, despachado: 100 }],
};
const SIN_FACTURAR = Object.assign({}, FACTURADO, {
  id: "PED-DEMO-02", estado: "pendiente", factura: null,
  lineas: [{ itemId: "PED-DEMO-02-I1", nombre: "Producto Demo B", pedido: 50, precio: 20, despachado: null }],
});

function montarProv({ falla = false } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = ventana(dom);
  const rpc = [];
  const q = () => {
    const p = Promise.resolve({ data: [], error: null, count: 0 });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "gte", "lte", "or"].forEach((m) => { p[m] = () => q(); });
    p.maybeSingle = () => Promise.resolve({ data: null, error: null }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error: null });
    p.update = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1", email: "proveedor@example.invalid" } } } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from: () => q(),
    rpc: async (nombre, args) => {
      rpc.push({ nombre, args });
      if (nombre === "mi_org_activa") return { data:"ORG-001", error:null };
      if (nombre === "registrar_nc") {
        if (falla) return { data: null, error: { message: "De Producto Demo A salieron 100 qq y ya se devolvieron 95." } };
        const afecta = args.p_origen !== "proveedor";
        return { data: [{ nc_id: "NC-1", estado: afecta && args.p_origen !== "freelance" ? "pendiente" : "aprobada",
          afecta_comision: afecta,
          aviso: afecta ? "Registrada. Espera el visto bueno del freelance porque la pidió el vendedor."
                        : "Registrada y aplicada. Baja la cartera del cliente; las comisiones NO se tocan porque la asumes tú." }], error: null };
      }
      return { data: null, error: null };
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx);
  vm.runInContext(compilar(R.app("proveedor-freelance")), ctx);
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    window.__montar = function(conDatos){
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__cont).render(React.createElement(Decisiones, {
          ctx: { accion: function(){} },
          datos: conDatos ? { facturar: [${JSON.stringify(FACTURADO)}, ${JSON.stringify(SIN_FACTURAR)}], solics: [] } : null,
        }));
      });
    };
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tocar = function(t, n){
      var bs = window.__cont.querySelectorAll("button"), v = 0;
      for(var i=0;i<bs.length;i++){
        if((bs[i].textContent||"").indexOf(t) >= 0 && !bs[i].disabled){
          if(v === (n||0)){ bs[i].click(); return true; } v++;
        }
      }
      return false;
    };
    window.__cuantos = function(t){
      var bs = window.__cont.querySelectorAll("button"), n = 0;
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(t) >= 0) n++; }
      return n;
    };
    window.__campo = function(etiqueta, valor){
      var ls = window.__cont.querySelectorAll("label");
      for(var i=0;i<ls.length;i++){
        if((ls[i].textContent||"").indexOf(etiqueta) >= 0){
          var el = ls[i].querySelector("input") || ls[i].querySelector("textarea");
          if(!el) continue;
          var proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto,"value").set.call(el, valor);
          el.dispatchEvent(new window.Event("input",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
    window.__area = function(valor){
      var el = window.__cont.querySelector("textarea");
      if(!el) return false;
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value").set.call(el, valor);
      el.dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
  `, ctx);
  return { ctx, rpc };
}
const txtP = (m) => vm.runInContext("window.__txt()", m.ctx);

/* ═══ EL FREELANCE ══════════════════════════════════════════════════════ */
const NCS = [
  { nc_id: "NC-DEMO-01", ped_id: "PED-DEMO-01", item_id: "I1", numero: "FAC-NC-DEMO-01", qq: 10, valor: 480,
    motivo: "Producto con humedad alta", origen: "vendedor", estado: "pendiente",
    afecta_comision: true, motivo_resp: null, creado: "2026-07-26T10:00:00Z", es_demo: false },
  { nc_id: "NC-DEMO-02", ped_id: "PED-DEMO-01", item_id: "I1", numero: "FAC-NC-DEMO-02", qq: 20, valor: 960,
    motivo: "Nos equivocamos al pesar", origen: "proveedor", estado: "aprobada",
    afecta_comision: false, motivo_resp: null, creado: "2026-07-25T10:00:00Z", es_demo: false },
  { nc_id: "NC-DEMO-03", ped_id: "PED-DEMO-01", item_id: "I1", numero: null, qq: 5, valor: 240,
    motivo: "El cliente no lo quiso", origen: "socio", estado: "rechazada",
    afecta_comision: true, motivo_resp: "El cliente ya lo había recibido conforme",
    creado: "2026-07-24T10:00:00Z", es_demo: false },
];

function montarFc({ hayNC = true } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = ventana(dom);
  const rpc = [];
  const q = (t) => {
    const datos = t === "notas_credito" ? (hayNC ? NCS : [])
      : t === "pedidos" ? [{ ped_id: "PED-DEMO-01", cli_id: "CLI-DEMO-01", prov_cod: "PROV-DEMO", factura: "FAC-DEMO-01" }]
      : t === "clientes" ? [{ cli_id: "CLI-DEMO-01", nombre: "Cliente Demo Norte" }]
      : t === "pedido_items" ? [{ item_id: "I1", descripcion: "Producto Demo A" }] : [];
    const p = Promise.resolve({ data: datos, error: null, count: 0 });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "gte", "lte", "or"].forEach((m) => { p[m] = () => q(t); });
    p.maybeSingle = () => Promise.resolve({ data: datos[0] || null, error: null }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error: null });
    p.update = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1", email: "qa@example.invalid" } } } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from: (t) => q(t),
    rpc: async (nombre, args) => {
      rpc.push({ nombre, args });
      if (nombre === "mi_org_activa") return { data:"ORG-001", error:null };
      if (nombre === "resolver_nc") {
        return { data: [{ nc_id: args.p_nc, estado: args.p_aprobar ? "aprobada" : "rechazada",
          aviso: args.p_aprobar ? "Aprobada: baja la cartera del cliente y se reajustan las comisiones."
                                : "Rechazada. La piladora ve el motivo tal como lo escribiste." }], error: null };
      }
      return { data: null, error: null };
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx);
  vm.runInContext(compilar(R.app("freelance-completo")), ctx);
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    window.__avisos = [];
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__cont).render(React.createElement(NotasCredito, {
        toast: function(m){ window.__avisos.push(m); } }));
    });
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tocar = function(t){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(t) >= 0 && !bs[i].disabled){ bs[i].click(); return true; } }
      return false;
    };
    window.__apagado = function(t){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").trim() === t) return !!bs[i].disabled; }
      return null;
    };
    window.__area = function(valor){
      var el = window.__cont.querySelector("textarea");
      if(!el) return false;
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value").set.call(el, valor);
      el.dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
  `, ctx);
  return { ctx, rpc };
}

(async () => {
  console.log("═══ La nota de crédito y a quién le duele");

  /* ── la piladora ── */
  const m = montarProv();
  vm.runInContext("window.__montar(true)", m.ctx);
  await esperar(280);
  let t = txtP(m);
  comprobar("solo los pedidos YA facturados ofrecen nota de crédito y ajuste interno",
    vm.runInContext('window.__cuantos("🧾 NC del SRI")', m.ctx) === 1 &&
    vm.runInContext('window.__cuantos("⚙ Ajuste interno")', m.ctx) === 1);
  comprobar("y separa con claridad la corrección fiscal de la interna",
    /Correcciones posteriores: separa lo fiscal de lo interno/.test(t));

  vm.runInContext('window.__tocar("🧾 NC del SRI")', m.ctx);
  await esperar(240);
  t = txtP(m);
  comprobar("la hoja pregunta primero de quién nació", /¿De quién nació\?/.test(t));
  comprobar("ofrece los cuatro orígenes con su consecuencia",
    /La pidió el vendedor/.test(t) && /La pidió el socio comercial/.test(t) &&
    /La pidió el freelance/.test(t) && /La hago yo, por mi cuenta/.test(t));
  comprobar("y dice cuál NO baja comisiones", /La asumo yo: NO baja ninguna comisión/.test(t));
  comprobar("mientras no se elija, avisa que de eso depende todo",
    /Según de quién nazca/.test(t));

  vm.runInContext('window.__tocar("La hago yo, por mi cuenta")', m.ctx);
  await esperar(200);
  comprobar("al marcar que la asume la piladora, lo explica sin rodeos",
    /la pérdida la asumes tú: ninguna comisión se toca/.test(txtP(m)));
  vm.runInContext('window.__tocar("La pidió el vendedor")', m.ctx);
  await esperar(200);
  comprobar("y al marcar que la pidió el vendedor, también",
    /cuando el freelance la apruebe, se reajustan las comisiones/.test(txtP(m)));

  /* no guarda a medias */
  vm.runInContext('window.__tocar("Registrar la nota de crédito")', m.ctx);
  await esperar(240);
  comprobar("sin quintales no guarda nada",
    m.rpc.filter((r) => r.nombre === "registrar_nc").length === 0 &&
    /¿Cuántos quintales devolvieron\?/.test(txtP(m)));

  vm.runInContext('window.__campo("Quintales devueltos", "10")', m.ctx);
  vm.runInContext('window.__campo("Valor de la NC", "480")', m.ctx);
  await esperar(200);
  vm.runInContext('window.__tocar("Registrar la nota de crédito")', m.ctx);
  await esperar(240);
  comprobar("sin motivo tampoco: alguien lo va a leer en seis meses",
    m.rpc.filter((r) => r.nombre === "registrar_nc").length === 0 &&
    /motivo es obligatorio/.test(txtP(m)));

  vm.runInContext('window.__area("Producto con humedad alta")', m.ctx);
  vm.runInContext('window.__campo("N° de la nota", "001-001-000123")', m.ctx);
  await esperar(200);
  vm.runInContext('window.__tocar("Registrar la nota de crédito")', m.ctx);
  await esperar(320);
  const l = m.rpc.filter((r) => r.nombre === "registrar_nc")[0] || {};
  comprobar("manda la línea, los quintales, el valor, el motivo y el origen",
    l.args && l.args.p_item === "PED-DEMO-01-I1" && Number(l.args.p_qq) === 10 &&
    Number(l.args.p_valor) === 480 && l.args.p_origen === "vendedor" &&
    l.args.p_motivo === "Producto con humedad alta" && l.args.p_numero === "001-001-000123");
  comprobar("y avisa con las palabras que devuelve la base",
    /Espera el visto bueno del freelance/.test(txtP(m)));

  /* si la base rechaza */
  const m2 = montarProv({ falla: true });
  vm.runInContext("window.__montar(true)", m2.ctx);
  await esperar(280);
  vm.runInContext('window.__tocar("🧾 NC del SRI")', m2.ctx);
  await esperar(240);
  vm.runInContext('window.__tocar("La pidió el vendedor")', m2.ctx);
  vm.runInContext('window.__campo("Quintales devueltos", "95")', m2.ctx);
  vm.runInContext('window.__campo("Valor de la NC", "100")', m2.ctx);
  vm.runInContext('window.__area("x")', m2.ctx);
  await esperar(200);
  vm.runInContext('window.__tocar("Registrar la nota de crédito")', m2.ctx);
  await esperar(320);
  comprobar("si la base rechaza, muestra el motivo de verdad",
    /ya se devolvieron 95/.test(txtP(m2)));

  /* ── el freelance ── */
  const f = montarFc();
  await esperar(340);
  t = vm.runInContext("window.__txt()", f.ctx);
  comprobar("ve cuántas esperan su visto bueno", /1 esperando tu visto bueno/.test(t));
  comprobar("y por qué le importa: bajan comisiones", /bajan comisiones/.test(t));
  comprobar("dice quién la pidió, con nombre y no con un código", /La pidió el vendedor/.test(t));
  comprobar("muestra el producto, los quintales y lo que cuesta",
    /Producto Demo A/.test(t) && /10 qq devueltos/.test(t) && /\$480,00/.test(t));
  comprobar("y el motivo tal como lo escribieron", /Producto con humedad alta/.test(t));
  comprobar("explica qué pasa si la aprueba",
    /se reajusta la\s+comisión del vendedor y la tuya/.test(t) || /comisión del vendedor y la tuya/.test(t));

  comprobar("la que asumió la piladora se muestra diciendo que NO bajó comisiones",
    /la asumió la piladora, no bajó ninguna comisión/.test(t));
  comprobar("y una rechazada muestra el motivo del rechazo",
    /Rechazada: El cliente ya lo había recibido conforme/.test(t));

  vm.runInContext('window.__tocar("Aprobar")', f.ctx);
  await esperar(320);
  let lf = f.rpc.filter((r) => r.nombre === "resolver_nc")[0] || {};
  comprobar("al aprobar, manda la nota correcta y que sí",
    lf.args && lf.args.p_nc === "NC-DEMO-01" && lf.args.p_aprobar === true);

  const f2 = montarFc();
  await esperar(340);
  vm.runInContext('window.__tocar("Rechazar")', f2.ctx);
  await esperar(240);
  comprobar("para rechazar pide el motivo, y sin él no deja",
    vm.runInContext('window.__apagado("Confirmar el rechazo")', f2.ctx) === true);
  vm.runInContext('window.__area("No corresponde")', f2.ctx);
  await esperar(200);
  vm.runInContext('window.__tocar("Confirmar el rechazo")', f2.ctx);
  await esperar(320);
  lf = f2.rpc.filter((r) => r.nombre === "resolver_nc")[0] || {};
  comprobar("y al rechazar viaja el motivo escrito",
    lf.args && lf.args.p_aprobar === false && lf.args.p_motivo === "No corresponde");

  const f3 = montarFc({ hayNC: false });
  await esperar(340);
  comprobar("sin notas de crédito lo dice con palabras",
    /No hay ninguna nota de crédito todavía/.test(vm.runInContext("window.__txt()", f3.ctx)));

  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
