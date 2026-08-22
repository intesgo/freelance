/* ═══════════════════════════════════════════════════════════════════════
   EL MENÚ DEL SISTEMA WEB · lo que debe seguir siendo cierto

   Escrito ANTES de reorganizar el menú, a propósito: primero se fija lo
   que no puede romperse y se comprueba que dé verde con el menú de HOY.
   Una prueba que nace verde después del cambio no prueba nada.

   Lo que vigila:
     · los 28 módulos existen y cada uno está en UN grupo, ni cero ni dos;
     · ningún grupo apunta a un módulo que no existe;
     · cada módulo tiene su pantalla en el router (nadie queda sin destino);
     · el grupo que no se pliega sigue existiendo con su nombre exacto;
     · los cuatro cargos ven un menú con contenido, sin grupos vacíos;
     · el menú se PINTA de verdad con cada cargo, sin reventar.

   No vigila el orden ni la agrupación: eso es una decisión de producto y va a
   cambiar. Vigila que al cambiarla no se pierda ni se duplique nada.

   Uso: SISTEMA_WEB=/ruta/sistema-web.html node test_menu_web.js
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

/* ── Lectura estática: las tres piezas del menú ────────────────────── */
const bloqueSec = html.slice(html.indexOf("const SECCIONES = ["), html.indexOf("const TODAS_LAS_SECCIONES"));
const SEC = {}, orden = [];
/* DISENO_BASE_ERP · cada sección lleva ahora `ic:"<nombre vectorial>"` (Lucide) antes del
   emoji `icon`. El arnés lee el icono vectorial (para el Sidebar) y la etiqueta. */
for (const m of bloqueSec.matchAll(/key:"([a-z]+)",\s*ic:"([a-zA-Z]+)",\s*icon:"[^"]*",\s*label:"([^"]*)"/g)) {
  SEC[m[1]] = { ic: m[2], lab: m[3] }; orden.push(m[1]);
}
const bloqueGr = html.slice(html.indexOf("const GRUPOS_MENU = ["), html.indexOf("// ── Empresas"));
/* Entre el título y las claves puede haber otros campos (por ejemplo el ícono
   del grupo). El arnés no debe romperse por el orden de los campos: lee el
   título y luego la lista de claves, haya lo que haya en medio. */
const GRUPOS = [...bloqueGr.matchAll(/titulo:"([^"]+)",[\s\S]{0,120}?keys:\[([^\]]*)\]/g)]
  .map((m) => ({ t: m[1], k: [...m[2].matchAll(/"([a-z]+)"/g)].map((x) => x[1]) }));
const enMenu = GRUPOS.flatMap((g) => g.k);
const router = [...html.matchAll(/case "([a-z]+)":/g)].map((m) => m[1]);

console.log("═══ El menú del Sistema Web · " + orden.length + " módulos en " + GRUPOS.length + " grupos");

comprobar("se pudieron leer los módulos y los grupos", orden.length > 0 && GRUPOS.length > 0);

const huerfanos = orden.filter((k) => !enMenu.includes(k));
comprobar("ningún módulo queda fuera del menú" + (huerfanos.length ? " → " + huerfanos.join(", ") : ""),
  huerfanos.length === 0);

const rotos = enMenu.filter((k) => !SEC[k]);
comprobar("ningún grupo apunta a un módulo que no existe" + (rotos.length ? " → " + rotos.join(", ") : ""),
  rotos.length === 0);

const dobles = enMenu.filter((k, i) => enMenu.indexOf(k) !== i);
comprobar("ningún módulo aparece en dos grupos" + (dobles.length ? " → " + dobles.join(", ") : ""),
  dobles.length === 0);

const sinPantalla = orden.filter((k) => !router.includes(k));
comprobar("todos tienen su pantalla en el router" + (sinPantalla.length ? " → " + sinPantalla.join(", ") : ""),
  sinPantalla.length === 0);

comprobar("no hay grupos vacíos en la definición", GRUPOS.every((g) => g.k.length > 0));

/* El título "Principal" está escrito a mano dos veces en el Sidebar: es el
   grupo que NO se pliega y que arranca abierto. Si alguien lo renombra, esa
   regla deja de funcionar en silencio. Por eso se vigila el nombre exacto. */
comprobar('existe el grupo "Principal" (el que no se pliega)',
  GRUPOS.some((g) => g.t === "Principal"));
comprobar('el Sidebar sigue tratando "Principal" como el grupo fijo',
  /g\.titulo === "Principal"/.test(html) && /t === "Principal"/.test(html));

/* ── Los cuatro cargos ─────────────────────────────────────────────── */
const CARGOS = {
  admin: orden,
  freelance: orden.filter((k) => k !== "admin" && k !== "empresas"),
  contadora: ["dashboard", "clientes", "cobranza", "pagos", "comisiones", "conciliacion", "reportes", "auditoria"],
  operadora: ["dashboard", "clientes", "pedidos", "trazabilidad", "calidad", "cobranza",
              "conciliacion", "documentos", "comunicacion", "reportes", "emparejar"],
};
for (const [cargo, permitidas] of Object.entries(CARGOS)) {
  const visibles = GRUPOS.map((g) => g.k.filter((k) => permitidas.includes(k))).filter((k) => k.length);
  const total = visibles.reduce((a, k) => a + k.length, 0);
  comprobar("el cargo " + cargo + " ve sus " + permitidas.length + " módulos, repartidos en " + visibles.length + " grupos",
    total === permitidas.length && visibles.length > 0);
}

/* ── Y ahora se pinta de verdad: que no reviente al renderizar ─────── */
function pintar(cargo, permitidas) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {};
  w.Notification = function () {}; w.Notification.permission = "denied";
  const q = () => { const p = Promise.resolve({ data: [], error: null });
    ["select","eq","neq","in","order","limit","like","not","maybeSingle","single","insert","update","upsert","delete"]
      .forEach((m) => { p[m] = () => q(); }); return p; };
  w.supa = { auth: { getSession: async () => ({ data: { session: { user: { id: "u1", email: "qa@example.invalid" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => q(), rpc: async () => ({ data: null }),
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) } };
  w.XLSX = null;
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  /* DISENO_BASE_ERP · el Sidebar lee s.ic (icono vectorial Lucide) y s.label. Se le pasa la
     sección con su nombre de icono y su etiqueta, como en producción. */
  const permitidasJSON = JSON.stringify(permitidas.map((k) => ({ key: k, ic: SEC[k].ic, label: SEC[k].lab })));
  vm.runInContext(`
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(Sidebar, {
        active: "dashboard", onNav: function(){}, secciones: ${permitidasJSON},
        usuario: { nombre:"QA", rol:"QA", real:false }, empresa: "Empresa QA",
        onSalir: function(){}, onCambiarClave: null, usos: {} }));
    });
    window.__txt = function(){ return window.__c.textContent || ""; };
    /* Es un acordeón: abrir un grupo pliega el anterior. Por eso la prueba
       abre uno por uno y acumula lo visible, igual que haría una persona. */
    window.__abrirGrupo = function(titulo){
      var ds=window.__c.querySelectorAll("nav div"),h=null;
      for(var i=0;i<ds.length;i++) {
        var t=(ds[i].textContent||"").replace("▶","").trim().toLowerCase();
        if(t===String(titulo).toLowerCase()) h=ds[i];
      }
      if(!h) return false; h.click(); return true;
    };
  `, ctx);
  return ctx;
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms || 60));

(async () => {
for (const [cargo, permitidas] of Object.entries(CARGOS)) {
  let ctx = null, cayo = "";
  try { ctx = pintar(cargo, permitidas); } catch (e) { cayo = String((e && e.message) || e).split("\n")[0]; }
  comprobar("el menú de " + cargo + " se pinta sin reventar" + (cayo ? " → " + cayo : ""), !cayo);
  if (cayo) continue;
  /* React 18 agrupa los cambios de estado: se abre y se lee cada grupo por
     separado. El encabezado Principal representa Dashboard y no repite su
     etiqueta como una segunda opción. */
  let texto = vm.runInContext("window.__txt()", ctx);
  const gruposCargo = GRUPOS.filter(g => g.t!=="Principal" && g.k.some(k=>permitidas.includes(k)));
  for (const g of gruposCargo) {
    vm.runInContext(`window.__abrirGrupo(${JSON.stringify(g.t)})`, ctx);
    await esperar(40);
    texto += " " + vm.runInContext("window.__txt()", ctx);
  }
  const faltan = permitidas.filter((k) => k==="dashboard"
    ? texto.toUpperCase().indexOf("PRINCIPAL")<0
    : texto.indexOf(SEC[k].lab) < 0);
  comprobar("y salen en pantalla los " + permitidas.length + " módulos de " + cargo
    + (faltan.length ? " → falta " + faltan.map((k) => SEC[k].lab).join(", ") : ""), faltan.length === 0);
  const titulosVisibles = GRUPOS.filter((g) => g.k.some((k) => permitidas.includes(k))).map((g) => g.t);
  const sinTitulo = titulosVisibles.filter((t) => texto.toUpperCase().indexOf(t.toUpperCase()) < 0);
  comprobar("y sus " + titulosVisibles.length + " títulos de grupo"
    + (sinTitulo.length ? " → falta " + sinTitulo.join(", ") : ""), sinTitulo.length === 0);
}

console.log("Resultado del menú: " + ok + " ✓ · " + mal + " ✗");
process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
