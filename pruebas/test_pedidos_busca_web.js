/* PED_FE_003 */
/* ═══════════════════════════════════════════════════════════════════════
   PEDIDOS (Sistema Web) · BÚSQUEDA + RESPONSIVE + MODAL · sistema-web · PedidosWeb

   Qué mide, montando la pantalla de verdad (React en JSDOM, sin ?demo=1):

   (A) BÚSQUEDA GLOBAL DE SERVIDOR · encuentra un pedido SIN saber su pestaña:
       se busca por N.º y la lista salta a «Todos» y lo muestra aunque estuviera
       en otra pestaña; y se busca por NOMBRE de cliente (que no está en «pedidos»),
       resolviendo primero el id y filtrando por .in.
   (B) RESPONSIVE · en pantalla angosta cada pedido es una TARJETA (no se comprimen
       las 8 columnas: no aparece el encabezado de tabla «Pedido N.º»).
   (C) MODAL · al tocar un pedido, el modal conserva los productos y el botón de
       edición, y suma proveedor/vendedor.

   El doble de Supabase evalúa .or (ilike / in), .in y .ilike, para poder filtrar
   de servidor como en producción. NO se escribe en la base de verdad.

   NACE ROJA a propósito: al final se rompe cada regla y la batería SE CAE.

   Uso: node test_pedidos_busca_web.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

const ESPERADAS = 6;
const MUTANTES_ESPERADOS = 3;
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

/* Dos pedidos: uno FACTURADO (pestaña «Por despachar») con N.º N-777, y uno
   INGRESADO (Pendientes). El primero es de «Supermercado Castillo». */
const PEDIDOS_BD = [
  { ped_id:"PED-777", cli_id:"CLI-CAS", sub_id:"USR-9", prov_cod:"PROV-1", ciudad:"Quito",
    estado:"facturado", estado_comercial:"facturado", estado_logistico:null, factura:"F-9001",
    condicion:"credito", creado:"2026-08-20T10:00:00Z", es_demo:false, numero_pedido:"N-777",
    clientes:{ nombre:"Supermercado Castillo", razon_social:"Pedro Castillo Rosero", tipo:"Natural" },
    proveedores:{ nombre:"Piladora Uno" } },
  { ped_id:"PED-100", cli_id:"CLI-OTRO", sub_id:"USR-9", prov_cod:"PROV-1", ciudad:"Guayaquil",
    estado:"ingresado", estado_comercial:"ingresado", estado_logistico:null, factura:null,
    condicion:"contado", creado:"2026-08-19T10:00:00Z", es_demo:false, numero_pedido:"N-100",
    clientes:{ nombre:"Tienda Norte", razon_social:"Tienda Norte S.A.", tipo:"Jurídica" },
    proveedores:{ nombre:"Piladora Uno" } },
];
const ITEMS_BD = [
  { item_id:"IT-1", ped_id:"PED-777", prod_id:"P-1", pres_cod:"QQ", descripcion:"Arroz Flor Fina",
    cantidad_qq:20, precio_usd:22, tipo_precio:"P1", gratis_qq:0, condicion:"credito" },
  { item_id:"IT-2", ped_id:"PED-100", prod_id:"P-2", pres_cod:"QQ", descripcion:"Arroz Vitalota",
    cantidad_qq:10, precio_usd:20, tipo_precio:"P2", gratis_qq:0, condicion:"contado" },
];
const CLIENTES_BD = [
  { cli_id:"CLI-CAS", nombre:"Supermercado Castillo", razon_social:"Pedro Castillo Rosero", tipo:"Natural",
    ruc:"1712345678001", condicion_pago:"Crédito", cupo:30000, usado:0, bloqueado:false, activo:true, sub_id:"USR-9", estado_cliente:"ACTIVO" },
  { cli_id:"CLI-OTRO", nombre:"Tienda Norte", razon_social:"Tienda Norte S.A.", tipo:"Jurídica",
    ruc:"1790000000001", condicion_pago:"Contado", cupo:0, usado:0, bloqueado:false, activo:true, sub_id:"USR-9", estado_cliente:"ACTIVO" },
];
const USUARIOS_BD = [ { usr_id:"USR-9", nombre:"Vendedor Nueve", rol:"Comisionista", activo:true } ];

function datosDe(t) {
  if (t === "pedidos")      return PEDIDOS_BD;
  if (t === "pedido_items") return ITEMS_BD;
  if (t === "clientes")     return CLIENTES_BD;
  if (t === "usuarios")     return USUARIOS_BD;
  return [];
}
/* Parte una cadena .or respetando los paréntesis de .in.(a,b) */
function partirOr(str) {
  const out = []; let cur = "", prof = 0;
  for (const ch of String(str)) {
    if (ch === "(") prof++; if (ch === ")") prof--;
    if (ch === "," && prof === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const contiene = (val, like) => String(val==null?"":val).toLowerCase().indexOf(String(like).replace(/%/g,"").toLowerCase()) >= 0;
function pasaClausula(row, cl) {
  const mIlike = cl.match(/^(\w+)\.ilike\.(.+)$/);
  if (mIlike) return contiene(row[mIlike[1]], mIlike[2]);
  const mIn = cl.match(/^(\w+)\.in\.\((.*)\)$/);
  if (mIn) { const ids = mIn[2].split(",").filter(Boolean); return ids.indexOf(row[mIn[1]]) >= 0; }
  return false;
}

function montar(js, opts) {
  opts = opts || {};
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  try { Object.defineProperty(w, "innerWidth", { value: opts.ancho || 1200, configurable: true }); } catch(_) {}
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied"; w.XLSX = null;

  function consulta(tabla, filtros) {
    const resolver = () => {
      let filas = datosDe(tabla).slice();
      let rango = null;
      filtros.forEach(f => {
        if (f[0] === "eq")    filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq")   filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "in")    filas = filas.filter(r => (f[2]||[]).indexOf(r[f[1]]) >= 0);
        if (f[0] === "ilike") filas = filas.filter(r => contiene(r[f[1]], f[2]));
        if (f[0] === "gte")   filas = filas.filter(r => String(r[f[1]]||"") >= f[2]);
        if (f[0] === "lte")   filas = filas.filter(r => String(r[f[1]]||"") <= f[2]);
        if (f[0] === "or")    { const cls = partirOr(f[1]); filas = filas.filter(r => cls.some(c => pasaClausula(r, c))); }
        if (f[0] === "range") rango = [f[1], f[2]];
      });
      if (rango) filas = filas.slice(rango[0], rango[1] + 1);
      return Promise.resolve({ data:filas, error:null });
    };
    const con = (t,c,v) => consulta(tabla, filtros.concat([[t,c,v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, not:()=>enc, is:()=>enc, filter:()=>enc, like:()=>enc,
      range:(a,b)=>con("range",a,b), or:(s)=>con("or",s),
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), in:(c,v)=>con("in",c,v), ilike:(c,v)=>con("ilike",c,v),
      gte:(c,v)=>con("gte",c,v), lte:(c,v)=>con("lte",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      insert:()=>Promise.resolve({ error:null }), upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => Promise.resolve({ error:null }); return r; },
      delete:()=>({ eq:()=>Promise.resolve({ error:null }) }),
    };
    return enc;
  }
  w.supa = {
    auth: { getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } }),
            onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
            getUser: async () => ({ data:{ user:{ id:"u1" } } }), signOut: async () => ({}) },
    from: (t) => consulta(t, []),
    rpc: async () => ({ data:null, error:null }),
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx);
  vm.runInContext(R.reactDomDev(), ctx);
  vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__render = function(){ window.__c = document.createElement("div"); document.body.appendChild(window.__c);
      ReactDOM.flushSync(function(){ ReactDOM.createRoot(window.__c).render(React.createElement(PedidosWeb, {
        usuario:{ usuario:"richard", nombre:"Richard", cargo:"freelance", rol:"Freelance", empresaId:"ORG-001", secciones:[] } })); }); };
    window.__flush = function(){ ReactDOM.flushSync(function(){}); };
    window.__txt = function(){ return (window.__c && window.__c.textContent) || ""; };
    window.__nCards = function(){ return window.__c.querySelectorAll(".ped-cabecera").length; };
    window.__buscar = function(txt){
      var ins = window.__c.querySelectorAll("input");
      for (var i=0;i<ins.length;i++){ var ph=(ins[i].getAttribute("placeholder")||"").toLowerCase();
        if (ph.indexOf("buscar")>=0){
          var setV = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
          setV.call(ins[i], txt); ins[i].dispatchEvent(new window.Event("input",{bubbles:true})); return true; } }
      return false;
    };
    window.__clickBtn = function(sub){
      var bs = window.__c.querySelectorAll("button");
      for (var i=0;i<bs.length;i++){ if ((bs[i].textContent||"").indexOf(sub)>=0){
        bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } }
      return false;
    };
    window.__clickCard = function(sub){
      var cs = window.__c.querySelectorAll(".ped-cabecera");
      for (var i=0;i<cs.length;i++){ if ((cs[i].textContent||"").indexOf(sub)>=0){
        cs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } }
      return false;
    };
    window.__dialog = function(){ var ds=document.querySelectorAll('[role="dialog"]'); var t=""; for(var i=0;i<ds.length;i++) t+=(ds[i].textContent||"")+" | "; return t; };
  `, ctx);
  return { ctx, w };
}
const corre = (m, e) => vm.runInContext(e, m.ctx);
async function montarLista(js, opts) {
  const m = montar(js, opts);
  corre(m, `window.__render()`);
  await esperar(340); corre(m, `window.__flush()`);
  await esperar(160); corre(m, `window.__flush()`);
  return m;
}

async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ───────── (A) BÚSQUEDA de servidor, cruza pestañas ───────── */
  {
    const m = await montarLista(js, { ancho:1200 });
    // arranca en Pendientes: el facturado (N-777) NO se ve
    const txt0 = corre(m, `window.__txt()`);
    comprobar("(A) al inicio, en «Pendientes», el pedido facturado (N-777) NO está a la vista",
      txt0.indexOf("N-777") < 0);
    // buscar por N.º → salta a «Todos» y lo encuentra
    corre(m, `window.__buscar("777")`);
    await esperar(460); corre(m, `window.__flush()`);
    const txt1 = corre(m, `window.__txt()`);
    comprobar("(A) buscar «777» encuentra el pedido aunque esté en otra pestaña (salta a Todos)",
      txt1.indexOf("N-777") >= 0);
    // buscar por NOMBRE de cliente (no está en «pedidos»: se resuelve el id y se filtra por .in)
    corre(m, `window.__buscar("Castillo")`);
    await esperar(460); corre(m, `window.__flush()`);
    const txt2 = corre(m, `window.__txt()`);
    comprobar("(A) buscar por nombre de cliente «Castillo» resuelve el id y lo encuentra",
      txt2.indexOf("N-777") >= 0 && txt2.indexOf("N-100") < 0);
  }

  /* ───────── (B) RESPONSIVE · tarjetas en móvil ───────── */
  {
    const m = await montarLista(js, { ancho:390 });
    corre(m, `window.__clickBtn("Todos")`);   // ambos pedidos: 1 en Pendientes, 1 en Por despachar
    corre(m, `window.__flush()`);
    const txt = corre(m, `window.__txt()`);
    const nCards = corre(m, `window.__nCards()`);
    comprobar("(B) móvil: hay una tarjeta por pedido (2)", nCards === 2);
    comprobar("(B) móvil: NO se dibuja el encabezado de tabla «Pedido N.º» (no se comprimen 8 columnas)",
      txt.indexOf("Pedido N.º") < 0);
  }

  /* ───────── (C) MODAL · conserva productos y edición, suma proveedor/vendedor ───────── */
  {
    const m = await montarLista(js, { ancho:1200 });
    corre(m, `window.__clickCard("N-100")`);   // el ingresado es editable
    corre(m, `window.__flush()`); await esperar(60); corre(m, `window.__flush()`);
    const d = corre(m, `window.__dialog()`);
    comprobar("(C) el modal conserva el detalle de productos (Arroz Vitalota), la edición y el proveedor/vendedor"
      + (d ? "" : " [no abrió el modal]"),
      d.indexOf("Arroz Vitalota") >= 0 && d.indexOf("Editar pedido") >= 0 && d.indexOf("Piladora Uno") >= 0 && d.indexOf("Vendedor Nueve") >= 0);
  }

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito ══ */
const MUTANTES = [
  /* (A) la búsqueda deja de filtrar en el servidor: no encuentra por N.º/cliente. */
  ["la búsqueda no arma el .or de servidor (no encuentra nada)",
   `q = q.or(partes.join(","));`, `q = q;`],
  /* (B) nunca se ve como móvil: se comprimen las 8 columnas en lugar de tarjetas. */
  ["nunca se dibuja la vista móvil (movil = false)",
   `const movil = useEsMovil(760);`, `const movil = false;`],
  /* (A) al buscar ya no salta a «Todos»: el facturado se queda oculto en su pestaña. */
  ["buscar ya no salta a «Todos»",
   `if(v.trim() && pTab!=="todos") setPTab("todos");`, `if(false) setPTab("todos");`],
];

(async () => {
  console.log("═══ Pedidos web · búsqueda, responsive y modal · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) { mal++; console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " + (ok + mal - 1) + "."); }

  console.log("  · rompiendo la regla a propósito (la batería debe caerse):");
  if (MUTANTES.length !== MUTANTES_ESPERADOS) { mal++; console.log("  ✗ AVISO: se declararon " + MUTANTES_ESPERADOS + " mutantes y hay " + MUTANTES.length + "."); }
  for (const [nombre, de, a] of MUTANTES) {
    const veces = jsx.split(de).length - 1;
    if (veces !== 1) { mal++; console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`); continue; }
    const mutado = jsx.replace(de, a);
    let res;
    try { res = await bateria(R.Babel.transform(mutado, { presets:["react"] }).code, false); }
    catch (e) { res = { mal:1, fallos:["reventó: " + e.message] }; }
    if (res.mal > 0) { ok++; console.log(`  ✓ «${nombre}» → la batería se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`); }
    else { mal++; console.log(`  ✗ «${nombre}» → la batería PASA IGUAL: no está midiendo nada`); }
  }

  console.log("Resultado de pedidos-busca-web: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
