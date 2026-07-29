/* ═══════════════════════════════════════════════════════════════════════════
   DES-012 · ¿VE LO MISMO LLAMÁNDOSE DE LAS DOS MANERAS?

   El rol "subcomisionista" pasa a llamarse "comisionista". El nombre cambia;
   lo que la persona puede ver NO debe cambiar ni un poco.

   El peligro real no es que algo se rompa: es que la puerta de permisos deje
   de reconocer al vendedor y, sin ningún error en pantalla, le muestre los
   pedidos y las comisiones de TODO EL EQUIPO.

   Por eso esto no comprueba que una lista contenga una palabra —eso sería un
   amuleto—. Monta la app de verdad, con datos de dos vendedores distintos, y
   CUENTA cuántos pedidos y cuántas comisiones alcanza a ver cada rol:

       subcomisionista → solo los suyos     (nombre viejo)
       comisionista    → solo los suyos     (nombre nuevo)
       freelance       → todos              (control)

   El caso "freelance" es el que le da valor a los otros dos. Sin él, una
   puerta que dijera siempre "sí, restringido" también pasaría la prueba.

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
    return { pedidos: (p||[]).length, comisiones: (c && c.nComisiones) || 0 };
  })()`, ctx);
};

(async () => {
  console.log("\n═══ DES-012 · el rol nuevo ve lo mismo que el viejo · " + nombre);

  const viejo = await medir("subcomisionista");
  const nuevo = await medir("comisionista");
  const jefe  = await medir("freelance");

  console.log("  · subcomisionista → " + viejo.pedidos + " pedidos, " + viejo.comisiones + " comisiones");
  console.log("  · comisionista    → " + nuevo.pedidos + " pedidos, " + nuevo.comisiones + " comisiones");
  console.log("  · freelance       → " + jefe.pedidos + " pedidos, " + jefe.comisiones + " comisiones");

  /* Primero: que el escenario sirva para distinguir. Si el vendedor y el jefe
     vieran lo mismo por construcción, todo lo demás sería humo. */
  comprobar("el escenario distingue: hay trabajo de otro vendedor en la mesa",
    DEL_EQUIPO > MIOS && jefe.pedidos === DEL_EQUIPO && jefe.comisiones === DEL_EQUIPO);

  comprobar("nombre viejo · ve solo sus " + MIOS + " pedido(s)",      viejo.pedidos === MIOS);
  comprobar("nombre viejo · ve solo su " + MIOS + " comisión(es)",    viejo.comisiones === MIOS);
  comprobar("nombre nuevo · ve solo sus " + MIOS + " pedido(s)",      nuevo.pedidos === MIOS);
  comprobar("nombre nuevo · ve solo su " + MIOS + " comisión(es)",    nuevo.comisiones === MIOS);
  comprobar("los dos nombres dan exactamente lo mismo",
    JSON.stringify(viejo) === JSON.stringify(nuevo));

  /* El control. Sin esto, una puerta que dijera siempre "restringido"
     también pasaría, y no estaríamos midiendo la puerta sino la nada. */
  comprobar("control · el freelance sigue viendo los " + DEL_EQUIPO + " pedidos del equipo",
    jefe.pedidos === DEL_EQUIPO);
  comprobar("control · el freelance sigue viendo las " + DEL_EQUIPO + " comisiones del equipo",
    jefe.comisiones === DEL_EQUIPO);

  /* El portal: de nada sirve que la app respete el rol nuevo si el portal no
     sabe a qué app mandar a esa persona. Se queda mirando una pantalla sin
     destino y parece que el sistema no la reconoce.
     No se busca el texto: se ejecuta el mapa real del portal. */
  const portal = fs.readFileSync(require("path").join(R.RAIZ, "index.html"), "utf-8");
  const trozo = portal.match(/var APP_POR_ROL = \{[\s\S]*?\};/);
  const MAPA = trozo ? vm.runInNewContext(trozo[0] + " APP_POR_ROL;") : null;
  comprobar("portal · el nombre nuevo tiene app a dónde ir",
    !!MAPA && !!MAPA.comisionista);
  comprobar("portal · los dos nombres llevan a la misma app",
    !!MAPA && MAPA.comisionista === MAPA.subcomisionista);

  console.log("\n" + (mal ? "✗ " + mal + " fallo(s) de " + (ok + mal) : "✓ " + ok + " comprobaciones") + " · " + nombre);
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error("✗ reventó: " + e.message); process.exit(1); });
