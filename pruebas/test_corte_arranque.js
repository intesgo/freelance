/* ═══════════════════════════════════════════════════════════════════════
   EL CORTE DEL ARRANQUE · freelance-completo b383

   Decisión de Richard: cuando marque el arranque, TODOS los informes
   empiezan ahí. Parejo, no informe por informe — el que se quedara fuera
   daría cifras mezcladas sin avisar. La única excepción es la cartera:
   los saldos de apertura son de ANTES por definición y tienen que verse.

   Lo que se comprueba:
     · sin arranque marcado NADA cambia: ninguna consulta lleva piso;
     · con arranque marcado, pedidos, comisiones y notas de crédito
       arrancan en esa fecha, por su columna de fecha correcta;
     · la cartera NO se corta, y las filas de antes quedan rotuladas;
     · si la base no responde la fecha, no se inventa un corte.

   Uso: node test_corte_arranque.js [ruta.html]
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

const ARRANQUE = "2026-07-01";

const FILAS = {
  pedidos: [{ ped_id: "PD-0100", cli_id: "CLI-001", prov_cod: "AGU", estado: "facturado",
    condicion: "credito", creado: "2026-07-05T10:00:00Z", factura: "001-001-1", es_demo: false }],
  pedido_items: [{ item_id: "PD-0100-I1", ped_id: "PD-0100", descripcion: "Arroz",
    cantidad_qq: 100, precio_usd: 30, despachado_qq: 100, comision_usd: 50 }],
  clientes: [{ cli_id: "CLI-001", nombre: "Comercial Nilo", es_demo: false, cupo: 1000, plazo: 30 }],
  proveedores: [{ prov_cod: "AGU", nombre: "Piladora San Agustín", pago_habitual: "contado" }],
  comisiones: [{ com_id: "COM-1", ped_id: "PD-0100", sub_id: "SC1", monto: 50,
    f_gen: "2026-07-05T10:00:00Z", estado: "Generada" }],
  notas_credito: [{ nc_id: "NC-1", ped_id: "PD-0100", item_id: "PD-0100-I1", qq: 10, valor: 300,
    motivo: "x", origen: "vendedor", estado: "pendiente", creado: "2026-07-06T10:00:00Z",
    afecta_comision: true, es_demo: false }],
  usuarios: [{ usr_id: "SC1", nombre: "Un vendedor", rol: "comisionista", auth_uid: "u1" }],
  cartera_cliente: [
    { mov_id: "MOV-AP0001", cli_id: "CLI-001", doc: "F-1001", emision: "2026-06-10",
      vence: "2026-07-10", monto: 1500, estado: "pendiente" },
    { mov_id: "MOV-1", cli_id: "CLI-001", doc: "001-001-1", emision: "2026-07-20",
      vence: "2026-08-19", monto: 900, estado: "pendiente" },
  ],
  ubicaciones_cliente: [], proveedor_fichas: [], proveedor_contactos: [], proveedor_documentos: [],
};

/* Monta el bundle con un doble que ANOTA cada consulta: qué tabla, y con
   qué piso de fecha (gte) se pidió. Eso es justo lo que hay que vigilar. */
function montar({ arranque = ARRANQUE, rpcMuda = false } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  w.Notification = function () {}; w.Notification.permission = "denied"; w.Notification.requestPermission = async () => "denied";

  const consultas = [];
  const tabla = (nombre) => {
    const reg = { tabla: nombre, gte: null };
    consultas.push(reg);
    const datos = FILAS[nombre] || [];
    const p = Promise.resolve({ data: datos, error: null, count: datos.length });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "lte", "or"].forEach((m) => { p[m] = () => p; });
    p.gte = (col, val) => { reg.gte = { col, val }; return p; };
    p.maybeSingle = () => Promise.resolve({ data: datos[0] || null, error: null }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error: null });
    p.update = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    p.delete = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1", email: "intesgo@gmail.com" } } } }),
      getUser: async () => ({ data: { user: { id: "u1", email: "intesgo@gmail.com" } } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (n) => tabla(n),
    rpc: async (nombre) => {
      if (nombre === "inicio_operacion") return rpcMuda ? { data: null, error: { message: "sin respuesta" } }
                                                       : { data: arranque, error: null };
      return { data: null, error: null };
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  return { ctx, consultas };
}

const correr = (m, expr) => vm.runInContext(expr, m.ctx);
const piso = (m, t) => (m.consultas.filter((c) => c.tabla === t)[0] || {}).gte;

(async () => {
  console.log("═══ El corte del arranque · " + nombreApp);

  /* ── 1 · con arranque marcado ────────────────────────────────────── */
  const m = montar();
  await correr(m, "cargarArranque()");
  comprobar("lee la fecha de arranque de la base", correr(m, "arranqueFijado()") === ARRANQUE);

  await correr(m, "vivoPedidos()");
  const pp = piso(m, "pedidos");
  comprobar("los pedidos arrancan en esa fecha, por su fecha de creación",
    pp && pp.col === "creado" && pp.val === ARRANQUE);

  const m2 = montar();
  await correr(m2, "vivoNotasCredito()");
  const pn = piso(m2, "notas_credito");
  comprobar("las notas de crédito arrancan en esa fecha",
    pn && pn.col === "creado" && pn.val === ARRANQUE);

  const m3 = montar();
  await correr(m3, "cargarComisionesReal()");
  const pc = piso(m3, "comisiones");
  comprobar("las comisiones arrancan en esa fecha, por cuándo se generaron",
    pc && pc.col === "f_gen" && pc.val === ARRANQUE);

  /* ── 2 · la cartera es la excepción ──────────────────────────────── */
  const m4 = montar();
  const cart = await correr(m4, "cargarCarteraReal()");
  comprobar("la cartera NO se corta: no lleva piso de fecha", piso(m4, "cartera_cliente") == null);
  comprobar("y sigue trayendo el saldo de apertura, que es de antes",
    Array.isArray(cart) && cart.some((f) => f.fac === "F-1001" && f.saldo === 1500));
  comprobar("el saldo de antes del arranque queda rotulado como tal",
    Array.isArray(cart) && cart.filter((f) => f.deAntes === true).length === 1 &&
    cart.filter((f) => f.fac === "F-1001")[0].deAntes === true);
  comprobar("y una factura nacida después NO se rotula",
    Array.isArray(cart) && cart.filter((f) => f.fac === "001-001-1")[0].deAntes === false);

  /* ── 3 · sin arranque marcado, nada cambia ───────────────────────── */
  const m5 = montar({ arranque: null });
  await correr(m5, "cargarArranque()");
  comprobar("sin arranque marcado no hay fecha", correr(m5, "arranqueFijado()") === "");
  await correr(m5, "vivoPedidos()");
  comprobar("y los pedidos se piden sin piso: la app trabaja como siempre",
    piso(m5, "pedidos") == null);
  const c5 = await correr(m5, "cargarCarteraReal()");
  comprobar("sin arranque, ninguna fila de cartera se rotula como vieja",
    Array.isArray(c5) && c5.every((f) => f.deAntes === false));

  /* ── 4 · si la base no contesta, no se inventa un corte ──────────── */
  const m6 = montar({ rpcMuda: true });
  await correr(m6, "cargarArranque()");
  comprobar("si la base no responde la fecha, no se inventa un corte",
    correr(m6, "arranqueFijado()") === "");
  await correr(m6, "vivoNotasCredito()");
  comprobar("y tampoco se recorta lo que se muestra", piso(m6, "notas_credito") == null);

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
