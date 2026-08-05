/* ═══════════════════════════════════════════════════════════════════════
   EL HISTORIAL COMERCIAL DEL CLIENTE · que no invente

   Escrito ANTES de tocar DashboardCliente, a propósito. Con el código de
   hoy tiene que salir ROJO: hoy el panel muestra las MISMAS cifras
   inventadas para todos los clientes y no lo dice. Ese es exactamente el
   defecto que este arnés vigila para siempre.

   Lo que exige:
     · el panel lee de la base (no trae cifras escritas a mano);
     · un cliente SIN movimientos dice "Sin historial", no un número;
     · un cliente CON movimientos muestra SUS cifras, calculadas;
     · dos clientes distintos NO pueden mostrar lo mismo;
     · si las filas que lo alimentan son de prueba, lo declara (DEMO).

   Uso: SISTEMA_WEB=/ruta/sistema-web.html node test_dashboard_cliente.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.env.SISTEMA_WEB || require("./rutas").app("sistema-web");
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets: ["react"] }).code;

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };

console.log("═══ Historial comercial del cliente · que no invente");

/* ── 1. Lectura estática del bloque ─────────────────────────────────── */
const ini = html.indexOf("function DashboardCliente(");
const fin = html.indexOf("function FichaCliente(", ini);
const bloque = html.slice(ini, fin);
comprobar("se encontró el bloque de DashboardCliente", ini > 0 && fin > ini);

comprobar("el panel consulta la base (no vive de cifras escritas a mano)",
  /window\.supa\.from\("pedidos"\)/.test(bloque));

/* Las cifras del panel viejo. Si alguna sobrevive, alguien volvió a inventar. */
const INVENTADAS = ["48750", "2119", "7320", "PED-0587", "21/06/2026", "18/06/2026",
                    "8 de tu catálogo", "Compra constante los últimos 3 meses"];
const sobreviven = INVENTADAS.filter((t) => bloque.indexOf(t) >= 0);
comprobar("ninguna cifra inventada sobrevive en el código"
  + (sobreviven.length ? " → " + sobreviven.join(", ") : ""), sobreviven.length === 0);

comprobar("el margen se retiró (no se puede calcular: no hay costo en pedido_items)",
  !/margen/i.test(bloque));

/* ── 2. Doble de Supabase que sí filtra, pagina y deja huella ────────
   `opciones.ignorarOrden` hace que el doble NO respete el .order() de la
   consulta. Sirve para probar que la pantalla ordena por su cuenta y no
   depende de lo que le devuelva la base. */
function dobleSupa(TABLAS, opciones) {
  const op = opciones || {};
  const huella = { consultas: [], inPedidos: [] };
  const from = (tabla) => {
    let filas = (TABLAS[tabla] || []).slice();
    huella.consultas.push(tabla);
    const api = {
      select() { return api; },
      eq(col, val) { filas = filas.filter((r) => r[col] === val); return api; },
      in(col, vals) {
        if (tabla === "productos") huella.inPedidos.push(vals.slice());
        filas = filas.filter((r) => vals.indexOf(r[col]) >= 0); return api; },
      order(col, o) { if (op.ignorarOrden) { filas.reverse(); return api; }
        const s = (o && o.ascending === false) ? -1 : 1;
        filas.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * s); return api; },
      /* .range(desde, hasta) tal cual lo entiende Supabase: ambos incluidos */
      range(a, b) { filas = filas.slice(a, b + 1); return api; },
      limit(n) { filas = filas.slice(0, n); return api; },
      then(res, rej) { return Promise.resolve({ data: filas, error: null }).then(res, rej); },
      catch(f) { return Promise.resolve({ data: filas, error: null }).catch(f); },
    };
    return api;
  };
  return { from, __huella: huella,
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } };
}

/* Dos clientes con historiales DISTINTOS y uno sin nada. */
const TABLAS = {
  pedidos: [
    /* A propósito el nuevo va primero: al invertir el orden queda el viejo
       arriba, y una pantalla que confíe en la posición se equivoca. */
    { ped_id:"P-2", cli_id:"CLI-A", estado:"facturado",  estado_comercial:"facturado",  factura:"F-2", condicion:"credito", creado:"2026-07-15T10:00:00Z", es_demo:false },
    { ped_id:"P-1", cli_id:"CLI-A", estado:"entregado",  estado_comercial:"entregado",  factura:"F-1", condicion:"credito", creado:"2026-07-05T10:00:00Z", es_demo:false },
    { ped_id:"P-3", cli_id:"CLI-A", estado:"anulado",    estado_comercial:"anulado",    factura:null,  condicion:"credito", creado:"2026-07-16T10:00:00Z", es_demo:false },
    /* La misma anulación escrita de otras tres formas. En la base de hoy todas
       dicen "anulado" en minúscula, pero nada lo garantiza mañana. */
    { ped_id:"P-4", cli_id:"CLI-A", estado:"ANULADO",    estado_comercial:"ANULADO",    factura:null,  condicion:"credito", creado:"2026-07-17T10:00:00Z", es_demo:false },
    { ped_id:"P-5", cli_id:"CLI-A", estado:"Anulado",    estado_comercial:"Anulado",    factura:null,  condicion:"credito", creado:"2026-07-18T10:00:00Z", es_demo:false },
    { ped_id:"P-6", cli_id:"CLI-A", estado:" anulado ",  estado_comercial:" anulado ",  factura:null,  condicion:"credito", creado:"2026-07-19T10:00:00Z", es_demo:false },
    { ped_id:"P-9", cli_id:"CLI-B", estado:"entregado",  estado_comercial:"entregado",  factura:"F-9", condicion:"contado", creado:"2026-07-20T10:00:00Z", es_demo:true  },
  ].concat(
    /* CLI-M: 1.100 pedidos. Con el limit(500) fijo de antes solo se leían 500
       y la pantalla decía "compras acumuladas" igual, tan segura como siempre. */
    Array.from({ length:1100 }, (_,i) => ({ ped_id:"M-"+i, cli_id:"CLI-M", estado:"entregado",
      estado_comercial:"entregado", factura:"FM-"+i, condicion:"contado",
      creado:"2026-07-01T00:00:00Z", es_demo:false }))
  ),
  pedido_items: [
    /* CLI-A: 10qq × $40 = 400  +  5qq × $22.50 = 112.50  →  P-1 = 512.50 */
    { ped_id:"P-1", prod_id:"P-100", descripcion:"Arroz Capirona", cantidad_qq:10, precio_usd:40,   es_demo:false },
    { ped_id:"P-1", prod_id:"P-200", descripcion:"Arroz Chifa",    cantidad_qq:5,  precio_usd:22.5, es_demo:false },
    /* P-2 = 20qq × $40 = 800  →  total CLI-A = 1312.50 en 2 pedidos → ticket 656.25 */
    { ped_id:"P-2", prod_id:"P-100", descripcion:"Arroz Capirona", cantidad_qq:20, precio_usd:40,   es_demo:false },
    /* los anulados NO deben contar, se escriban como se escriban */
    { ped_id:"P-3", prod_id:"P-100", descripcion:"Arroz Capirona", cantidad_qq:99, precio_usd:99,   es_demo:false },
    { ped_id:"P-4", prod_id:"P-100", descripcion:"Arroz Capirona", cantidad_qq:77, precio_usd:77,   es_demo:false },
    { ped_id:"P-5", prod_id:"P-100", descripcion:"Arroz Capirona", cantidad_qq:55, precio_usd:55,   es_demo:false },
    { ped_id:"P-6", prod_id:"P-100", descripcion:"Arroz Capirona", cantidad_qq:33, precio_usd:33,   es_demo:false },
    /* CLI-B: 3qq × $30 = 90 */
    { ped_id:"P-9", prod_id:"P-300", descripcion:"Azúcar Valdez",  cantidad_qq:3,  precio_usd:30,   es_demo:true  },
  ],
  cartera_cliente: [
    { cli_id:"CLI-A", doc:"F-1", emision:"2026-07-05", vence:"2026-08-04", monto:512.5, estado:"pendiente", es_demo:false },
    { cli_id:"CLI-A", doc:"F-2", emision:"2026-07-15", vence:"2026-08-14", monto:800,   estado:"pendiente", es_demo:false },
    { cli_id:"CLI-B", doc:"F-9", emision:"2026-07-20", vence:"2026-08-19", monto:90,    estado:"pendiente", es_demo:true  },
  ],
  cobros: [
    /* el pago MÁS RECIENTE va PRIMERO en el arreglo, también a propósito */
    { cobro_id:"C-3", cli_id:"CLI-A", factura:"F-SIN-CARTERA", monto:150, creado:"2026-07-28T10:00:00Z", anulado:false, es_demo:false },
    /* pagó F-1 el 25/07: 20 días después de la emisión */
    { cobro_id:"C-1", cli_id:"CLI-A", factura:"F-1", monto:512.5, creado:"2026-07-25T10:00:00Z", anulado:false, es_demo:false },
    /* anulado: no cuenta ni como pago ni como días */
    { cobro_id:"C-2", cli_id:"CLI-A", factura:"F-2", monto:800,   creado:"2026-07-16T10:00:00Z", anulado:true,  es_demo:false },
  ],
  productos: [
    { prod_id:"P-100", linea:"Arroz",  nombre:"Arroz Capirona" },
    { prod_id:"P-200", linea:"Arroz",  nombre:"Arroz Chifa" },
    { prod_id:"P-300", linea:"Azúcar", nombre:"Azúcar Valdez" },
  ].concat(
    /* Catálogo grande a propósito: la pantalla solo necesita la línea de 2 o 3
       productos, no puede traerse los 900 para leerlas. */
    Array.from({ length:900 }, (_,i) => ({ prod_id:"X-"+i, linea:"Relleno", nombre:"Producto "+i }))
  ),
};

const CLIENTES = {
  /* OJO: cupo y usado se eligen a propósito distintos de las cifras calculadas.
     Si "usado" valiera lo mismo que las compras, una prueba podría pasar por
     casualidad leyendo el cupo en vez del historial. */
  "CLI-A": { id:"CLI-A", nombre:"Comercial Alfa", ruc:"0900000001001", cupo:5000, usado:333, plazo:30,
             dueno:"freelance", condicionPago:"Crédito", nivelCupo:"Cupo 1" },
  "CLI-B": { id:"CLI-B", nombre:"Tienda Beta",   ruc:"0900000002001", cupo:1000, usado:44, plazo:15,
             dueno:"VEN-01", condicionPago:"Contado", nivelCupo:"Cupo 1" },
  "CLI-Z": { id:"CLI-Z", nombre:"Cliente Nuevo", ruc:"0900000003001", cupo:0, usado:0, plazo:0,
             dueno:"freelance", condicionPago:"Contado", nivelCupo:"Cupo 1" },
  "CLI-M": { id:"CLI-M", nombre:"Mayorista Mil", ruc:"0900000004001", cupo:9000, usado:77, plazo:30,
             dueno:"freelance", condicionPago:"Crédito", nivelCupo:"Cupo 1" },
};

function pintar(cliId, opciones) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = (q) => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {};
  w.Notification = function () {}; w.Notification.permission = "denied";
  w.supa = dobleSupa(TABLAS, opciones);
  ultimaHuella = w.supa.__huella;
  w.XLSX = null;
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    var money = function(n){ return "$" + Number(n||0).toLocaleString("es-EC",{minimumFractionDigits:2,maximumFractionDigits:2}); };
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(DashboardCliente, {
        cli: ${JSON.stringify(CLIENTES[cliId])}, money: money, ciudad: "Guayaquil",
        onCerrar: function(){}, onInicio: function(){} }));
    });
    window.__txt = function(){ return window.__c.textContent || ""; };
  `, ctx);
  return ctx;
}
let ultimaHuella = null;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms || 120));

(async () => {
  const textos = {};
  for (const id of ["CLI-A", "CLI-B", "CLI-Z"]) {
    let ctx = null, cayo = "";
    try { ctx = pintar(id); } catch (e) { cayo = String((e && e.message) || e).split("\n")[0]; }
    comprobar("el panel de " + id + " se pinta sin reventar" + (cayo ? " → " + cayo : ""), !cayo);
    if (cayo) continue;
    /* las consultas son asíncronas: hay que darles su tiempo antes de leer */
    await esperar(150);
    textos[id] = vm.runInContext("window.__txt()", ctx);
  }

  const A = textos["CLI-A"] || "", B = textos["CLI-B"] || "", Z = textos["CLI-Z"] || "";

  /* ── El defecto central: ninguna de las cifras del panel viejo ── */
  const FANTASMAS = ["48.750", "2.119", "7.320", "PED-0587", "21/06/2026"];
  for (const [id, t] of [["CLI-A", A], ["CLI-B", B], ["CLI-Z", Z]]) {
    const vistas = FANTASMAS.filter((f) => t.indexOf(f) >= 0);
    comprobar(id + " · no muestra ninguna cifra inventada en pantalla"
      + (vistas.length ? " → " + vistas.join(", ") : ""), vistas.length === 0);
  }
  comprobar("dos clientes distintos NO muestran las mismas compras",
    A.indexOf("1.312,50") >= 0 && B.indexOf("1.312,50") < 0);

  /* ── CLI-A: cifras calculadas de verdad ── */
  comprobar("CLI-A · compras acumuladas = $1.312,50 (512,50 + 800; el anulado no cuenta)",
    /1\.312[.,]50/.test(A));
  comprobar("CLI-A · el pedido anulado quedó fuera (no aparece 9.801)", A.indexOf("9.801") < 0);
  comprobar("CLI-A · ticket promedio = $656,25", /656[.,]25/.test(A));
  comprobar("CLI-A · nombra su producto más comprado", A.indexOf("Arroz Capirona") >= 0);
  comprobar("CLI-A · días promedio de pago = 20 (emisión 05/07 → cobro 25/07)", /20 días/.test(A));
  if (!/20 días/.test(A)) console.log("     ↳ lo que se pintó: " + A.replace(/\s+/g," ").slice(0,700));
  comprobar("CLI-B · muestra SUS compras ($90,00), no las de otro", B.indexOf("$90,00") >= 0);

  /* ── CLI-B: su historial es de PRUEBA y tiene que decirlo ── */
  comprobar("CLI-B · declara que su historial es de prueba (DEMO)", /DEMO/.test(B));
  comprobar("CLI-A · NO se marca como demo (sus filas son reales)", !/DEMO/.test(A));

  /* ── CLI-Z: sin movimientos, no se inventa nada ── */
  comprobar("CLI-Z · dice \"Sin historial\" en vez de un número", /Sin historial/i.test(Z));
  comprobar("CLI-Z · no muestra compras acumuladas de la nada",
    Z.indexOf("1.312") < 0 && Z.indexOf("48.750") < 0);
  comprobar("CLI-Z · avisa que no existen compras registradas",
    /No existen compras registradas/i.test(Z));

  /* ══════════════════════════════════════════════════════════════════
     DES-004.1 · Lo que encontró la revisión de GitHub Copilot
     ══════════════════════════════════════════════════════════════════ */

  /* 1. "anulado" escrito de cualquier forma sigue siendo anulado */
  comprobar("CLI-A · ANULADO / Anulado / \" anulado \" tampoco cuentan (compras siguen en $1.312,50)",
    /1\.312[.,]50/.test(A));
  const COLADOS = ["5.929", "3.025", "1.089"];   /* 77×77, 55×55, 33×33 */
  const cuela = COLADOS.filter((c) => A.indexOf(c) >= 0);
  comprobar("CLI-A · ningún pedido anulado se coló por la grafía"
    + (cuela.length ? " → " + cuela.join(", ") : ""), cuela.length === 0);
  comprobar("CLI-A · N° de pedidos sigue siendo 2 (los 4 anulados quedan fuera)",
    /N° de pedidos\s*2/i.test(A.replace(/\s+/g, " ")));

  /* 2. El límite fijo ya no recorta el historial */
  let ctxM = null, cayoM = "";
  try { ctxM = pintar("CLI-M"); } catch (e) { cayoM = String((e && e.message) || e).split("\n")[0]; }
  comprobar("el panel del cliente con 1.100 pedidos se pinta" + (cayoM ? " → " + cayoM : ""), !cayoM);
  let M = "";
  if (!cayoM) { await esperar(700); M = vm.runInContext("window.__txt()", ctxM); }
  /* el contador se pinta sin separador de miles: "1100", no "1.100" */
  comprobar("CLI-M · lee los 1.100 pedidos, no los primeros 500",
    /N° de pedidos\s*1100/i.test(M.replace(/\s+/g, " ")));
  comprobar("CLI-M · no se quedó en 500 ni en 1000 (los topes de página)",
    !/N° de pedidos\s*(500|1000)\b/i.test(M.replace(/\s+/g, " ")));

  /* 3. Solo se piden los productos de ESTE cliente, no el catálogo */
  pintar("CLI-A"); const huellaA = ultimaHuella;
  await esperar(300);
  const pedidos = huellaA.inPedidos;
  const pedidosTotales = pedidos.reduce((n, l) => n + l.length, 0);
  comprobar("productos: se piden por prod_id, no el catálogo entero (pedidos "
    + pedidosTotales + " ids, catálogo 903)", pedidos.length > 0 && pedidosTotales <= 10);

  /* 4. El último pago no depende del orden que devuelva la consulta */
  let ctxD = null, cayoD = "";
  try { ctxD = pintar("CLI-A", { ignorarOrden:true }); } catch (e) { cayoD = String((e && e.message) || e).split("\n")[0]; }
  comprobar("el panel se pinta aunque la base devuelva las filas desordenadas"
    + (cayoD ? " → " + cayoD : ""), !cayoD);
  let D = "";
  if (!cayoD) { await esperar(250); D = vm.runInContext("window.__txt()", ctxD); }
  /* Pegado a su etiqueta: que la fecha aparezca "en alguna parte" no prueba
     nada, porque las tres fechas salen también en la lista de pedidos. */
  const Dp = D.replace(/\s+/g, " ");
  comprobar("último pago = 28/07/2026 aun con la base desordenada",  /Último pago ?28\/07\/2026/.test(Dp));
  comprobar("última compra = 15/07/2026 aun con la base desordenada", /Última compra ?15\/07\/2026/.test(Dp));
  comprobar("primer pedido = 05/07/2026 aun con la base desordenada", /Primer pedido ?05\/07\/2026/.test(Dp));
  comprobar("las cifras no cambian por el orden de las filas", /1\.312[.,]50/.test(D) && /656[.,]25/.test(D));
  comprobar("la lista de últimos pedidos sale del más nuevo al más viejo, aunque la base los mande al revés",
    D.indexOf("15/07/2026") >= 0 && D.indexOf("15/07/2026") < D.indexOf("05/07/2026"));

  console.log("Resultado del historial: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
