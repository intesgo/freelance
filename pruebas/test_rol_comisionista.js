/* ═══════════════════════════════════════════════════════════════════════════
   DES-012 · PASOS 4 y 5 · QUE EL NOMBRE VIEJO NO QUEDE EN NINGÚN LADO

   Este arnés cambió de pregunta.

   Mientras duró la transición preguntaba: «¿los dos nombres llevan al mismo
   sitio?». Tenía sentido cuando en la base convivían filas con el nombre
   viejo y filas con el nuevo: había que garantizar que nadie perdiera el
   acceso por cómo estuviera escrito su rol.

   Esa etapa terminó. Se barrieron todas las columnas de texto de las 73
   tablas y no queda UNA SOLA FILA con el nombre viejo. Así que ahora la
   pregunta es otra, y más exigente:

       ¿queda algún rastro del nombre viejo en este archivo?

   Cero. Ni en las llaves de rol, ni en los rótulos, ni en los comentarios.

   Pero borrar una palabra es fácil y peligroso: se puede borrar de más y
   dejar al vendedor sin puerta, o borrarla del sitio equivocado y abrirle
   los pedidos de todo el equipo. Por eso el arnés NO se conforma con contar
   palabras. Sigue montando la app con datos de dos vendedores distintos y
   contando qué alcanza a ver cada rol:

       comisionista → solo los suyos
       freelance    → todos            (control)

   El control es lo que le da valor a lo demás: una puerta que dijera
   siempre "restringido" también pasaría la parte de contar palabras.

   Uso: node test_rol_comisionista.js <ruta.html>
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2];
if (!ruta) { console.error("Falta la ruta del html"); process.exit(1); }
const nombre = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets: ["react"] }).code;
const react = R.react(), reactDom = R.reactDom();

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };

/* Dos vendedores con trabajo propio. SC-D1 es quien inicia sesión.
   Si el filtro funciona ve 1 pedido y 1 comisión; si no funciona, ve 3 y 3. */
const MIOS = 1, DEL_EQUIPO = 3;

const FIX = (rol) => ({
  usuarios: [{ usr_id: "SC-D1", nombre: "Luis Paredes", rol: rol, auth_uid: "auth-x", activo: true }],
  pedidos: [
    { ped_id: "PD-0010", cli_id: "CLI-D01", sub_id: "SC-D1", prov_cod: "PROV-A", estado: "enviado_proveedor",
      factura: null, condicion: "credito", creado: "2026-07-10T06:38:39+00:00", es_demo: true },
    { ped_id: "PD-0006", cli_id: "CLI-D04", sub_id: "SC-D2", prov_cod: "PROV-A", estado: "cliente_pago",
      factura: "F-4590", condicion: "contado", creado: "2026-07-09T06:38:39+00:00", es_demo: true },
    { ped_id: "PD-0004", cli_id: "CLI-D02", sub_id: "SC-D2", prov_cod: "PROV-A", estado: "facturado",
      factura: "F-4489", condicion: "credito", creado: "2026-07-08T06:38:39+00:00", es_demo: true },
  ],
  pedido_items: [
    { ped_id: "PD-0010", descripcion: "Arroz Super Capirona · Quintal", cantidad_qq: 10, precio_usd: 40 },
    { ped_id: "PD-0006", descripcion: "Arroz Flor · Quintal", cantidad_qq: 20, precio_usd: 38 },
    { ped_id: "PD-0004", descripcion: "Azúcar Blanca · Quintal", cantidad_qq: 15, precio_usd: 44 },
  ],
  clientes: [{ cli_id: "CLI-D01", nombre: "Comercial Nilo" },
             { cli_id: "CLI-D04", nombre: "Bodega San Miguel" },
             { cli_id: "CLI-D02", nombre: "Almacenes Fernando" }],
  proveedores: [{ prov_cod: "PROV-A", nombre: "Agrícola del Valle" }],
  comisiones: [
    { com_id: "C1", ped_id: "PD-0010", sub_id: "SC-D1", monto: 124.50, estado: "Generada" },
    { com_id: "C3", ped_id: "PD-0006", sub_id: "SC-D2", monto: 66.15, estado: "Pagada" },
    { com_id: "C4", ped_id: "PD-0004", sub_id: "SC-D2", monto: 90.00, estado: "Pagada" },
  ],
  cartera_cliente: [{ mov_id: "MOV-D6", cli_id: "CLI-D02", doc: "F-4489",
                      vence: "2026-07-01", monto: 1000.00, estado: "pendiente" }],
  novedades: [], agenda_actividades: [], ubicaciones_cliente: [],
});

function montar(rol) {
  const FX = FIX(rol);
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = w.matchMedia || (q => ({ matches: false, media: q, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {} }));
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  w.Notification = function () {}; w.Notification.permission = "denied";
  w.Notification.requestPermission = async () => "denied";

  const tabla = (n) => {
    const datos = FX[n] || [];
    const p = Promise.resolve({ data: datos, error: null, count: datos.length });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "gte", "lte"].forEach(m => { p[m] = () => tabla(n); });
    p.maybeSingle = () => Promise.resolve({ data: datos[0] || null, error: null });
    p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ data: null, error: null });
    p.upsert = () => Promise.resolve({ data: null, error: null });
    p.update = () => { const q = Promise.resolve({ data: null, error: null });
      ["eq", "in", "is"].forEach(m => { q[m] = () => q; }); return q; };
    p.delete = () => { const q = Promise.resolve({ data: null, error: null }); q.eq = () => q; return q; };
    return p;
  };
  w.SB = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "auth-x", email: "luis@ejemplo.com" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from: (n) => tabla(n), rpc: async () => ({ data: null }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data: { enviados: 0 }, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(react, ctx); vm.runInContext(reactDom, ctx); vm.runInContext(js, ctx);
  return ctx;
}

/* Le pregunta a la app misma, por los mismos caminos que usa en producción:
   vivoPedidos() y vivoComisiones() son las dos funciones que pasan por la
   puerta de permisos antes de entregar datos a la pantalla. */
const medir = (rol) => {
  const ctx = montar(rol);
  return vm.runInContext(`(async()=>{
    var p = await vivoPedidos();
    var c = await vivoComisiones();
    var cli = {};
    (p||[]).forEach(function(x){ cli[x.cli] = true; });
    return { pedidos: (p||[]).length, comisiones: (c && c.nComisiones) || 0,
             clientes: Object.keys(cli).sort() };
  })()`, ctx);
};

(async () => {
  console.log("\n═══ DES-012 · el nombre viejo ya no está en ningún lado · " + nombre);

  /* ── 1 · Ni un rastro de la palabra ───────────────────────────────────
     Se mira el archivo entero, no solo el código: también los rótulos que
     lee la gente y los comentarios que lee quien venga detrás. */
  const VIEJO = /subcomisionista/i;
  const rastro = [];
  html.split("\n").forEach((linea, i) => {
    if (VIEJO.test(linea)) rastro.push((i + 1) + ": " + linea.trim().slice(0, 90));
  });
  comprobar("no queda ni un rastro del nombre viejo en todo el archivo"
    + (rastro.length ? " → " + rastro.length + " todavía" : ""), rastro.length === 0);
  if (rastro.length) rastro.slice(0, 8).forEach(l => console.log("      " + l));

  /* Y que no se cuele por la puerta de atrás, abreviado. */
  const abreviado = (html.match(/subcom(?!isionista)/gi) || []).length;
  comprobar("tampoco quedan abreviaturas («subcom.»)"
    + (abreviado ? " → " + abreviado : ""), abreviado === 0);

  /* ── 2 · Borrar la palabra no puede haber roto la puerta ──────────── */
  const vendedor = await medir("comisionista");
  const jefe     = await medir("freelance");

  const linea = (t, r) => "  · " + t + " → " + r.pedidos + " pedidos, " + r.comisiones +
    " comisiones, clientes: " + (r.clientes.join(" / ") || "ninguno");
  console.log(linea("comisionista", vendedor));
  console.log(linea("freelance   ", jefe));

  comprobar("el escenario distingue: hay trabajo de otro vendedor en la mesa",
    DEL_EQUIPO > MIOS && jefe.pedidos === DEL_EQUIPO && jefe.comisiones === DEL_EQUIPO);

  comprobar("el comisionista ve solo sus " + MIOS + " pedido(s)",    vendedor.pedidos === MIOS);
  comprobar("el comisionista ve solo su " + MIOS + " comisión(es)",  vendedor.comisiones === MIOS);
  comprobar("el comisionista ve solo su(s) " + MIOS + " cliente(s)", vendedor.clientes.length === MIOS);

  /* El control. Sin esto, una puerta que dijera siempre "restringido"
     también pasaría, y no estaríamos midiendo la puerta sino la nada. */
  comprobar("control · el freelance sigue viendo los " + DEL_EQUIPO + " pedidos del equipo",
    jefe.pedidos === DEL_EQUIPO);
  comprobar("control · el freelance sigue viendo las " + DEL_EQUIPO + " comisiones del equipo",
    jefe.comisiones === DEL_EQUIPO);
  comprobar("control · el freelance sigue viendo los " + DEL_EQUIPO + " clientes del equipo",
    jefe.clientes.length === DEL_EQUIPO);

  /* ── 3 · El portal ────────────────────────────────────────────────────
     De nada sirve que la app respete el rol si el portal no sabe a dónde
     mandar a esa persona. No se busca el texto: se ejecuta el mapa real. */
  const portal = fs.readFileSync(require("path").join(R.RAIZ, "index.html"), "utf-8");
  const trozo = portal.match(/var APP_POR_ROL = \{[\s\S]*?\};/);
  const MAPA = trozo ? vm.runInNewContext(trozo[0] + " APP_POR_ROL;") : null;
  comprobar("portal · el comisionista tiene app a dónde ir",
    !!MAPA && !!MAPA.comisionista);
  comprobar("portal · ya no existe la entrada del nombre viejo",
    !!MAPA && !("subcomisionista" in MAPA));
  comprobar("portal · el archivo del portal tampoco lo menciona",
    !VIEJO.test(portal));

  console.log("\n" + (mal ? "✗ " + mal + " fallo(s) de " + (ok + mal) : "✓ " + ok + " comprobaciones") + " · " + nombre);
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error("✗ reventó: " + e.message); process.exit(1); });
