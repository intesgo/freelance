/* ═══════════════════════════════════════════════════════════════════════
   LA PANTALLA DE PRODUCTOS SALE DE LAS OFERTAS, YA NO DE `precios`
   · freelance-completo

   Qué se rompía: el sistema web dejó de escribir en `precios`. Un producto
   creado hoy nace con sus ofertas en `ofertas_piladora` y CERO filas en
   `precios`. La pantalla Productos leía `precios`, así que ese producto no
   existía en el celular y el sello verde contaba de menos.
   Medido contra producción el 05/08/2026 (ztpwtddrblfvcnnhbevq):
   59 productos activos · 58 con fila en `precios` · 59 con oferta vigente.
   El sello decía «58 productos» y el que faltaba era P-00197
   «Arroz Crecedor»: activo, 2 presentaciones, 2 ofertas vigentes, marca NULL.

   Lo que fija esta prueba:
     · un producto con oferta y SIN fila en `precios` aparece igual;
     · el mismo producto NO se duplica aunque tenga varias presentaciones
       y varias piladoras;
     · el precio se lleva a quintales (precio ÷ equiv_qq) y, si dos piladoras
       cobran distinto, se ofrece el MÁS BARATO;
     · lo vencido, lo inactivo y lo que aún no rige NO se ofrecen;
     · un producto dado de baja no se ofrece aunque tenga oferta viva;
     · un producto SIN MARCA sale con su nombre, nunca en blanco;
     · el buscador lo encuentra por nombre y también por piladora, y el
       texto de ayuda dice la verdad;
     · el número del sello verde CUADRA con las tarjetas que se ven;
     · si la base contesta con error, supabase-js lo devuelve en `.error`
       (no lo lanza): la pantalla cae a la demostración y no se rompe.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente,
   una rotura a la vez, y se comprueba que la prueba SE CAE. Si un mutante
   pasa entero, esta prueba no está midiendo nada y lo dice a gritos.

   Uso: node test_catalogo_productos.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("freelance-completo");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const react = R.reactDev(), reactDom = R.reactDomDev();

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una prueba que se borra sin querer no pase inadvertida. ── */
const ESPERADAS = 30;
const MUTANTES_ESPERADOS = 9;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 200));
const dia = (n) => { const d = new Date(Date.now() + n * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
const HOY = dia(0), AYER = dia(-1), MANANA = dia(1);

/* ══ La base de prueba, con la forma de producción ══ */
const PRODUCTOS_BD = [
  { prod_id:"P-00001", nombre:"Arrocillo Envejecido", marca:"Arrocillo Envejecido",
    linea:"Arroz", proveedor:"POR ASIGNAR", proveedor_cod:null, estado:"activo" },
  /* el huérfano de verdad: sin marca y sin una sola fila en `precios` */
  { prod_id:"P-00197", nombre:"Arroz Crecedor", marca:null,
    linea:"Arroz", proveedor:"Piladora San Agustín", proveedor_cod:"AGU", estado:"activo" },
  /* dado de baja: aunque tenga oferta viva, no se vende */
  { prod_id:"P-BAJA", nombre:"Arroz Retirado", marca:"Retirado",
    linea:"Arroz", proveedor:"POR ASIGNAR", proveedor_cod:null, estado:"inactivo" },
];

const PRESENTACIONES_BD = [
  { pres_id:"PR-1", prod_id:"P-00001", presentacion_cod:"QQ",  activo:true },
  { pres_id:"PR-2", prod_id:"P-00001", presentacion_cod:"ARR", activo:true },
  { pres_id:"PR-3", prod_id:"P-00197", presentacion_cod:"QQ",  activo:true },
  { pres_id:"PR-4", prod_id:"P-00197", presentacion_cod:"ARR", activo:true },
  { pres_id:"PR-5", prod_id:"P-BAJA",  presentacion_cod:"QQ",  activo:true },
];

const OFERTAS_BD = [
  /* Arrocillo: dos presentaciones × dos piladoras = 4 filas, UN solo producto.
     La arroba de $4,75 con equiv 0,25 es exactamente $19 el quintal.
     Cordero cobra más caro ($21): el vendedor ofrece el más barato, $19. */
  { prod_id:"P-00001", pres_cod:"QQ",  equiv_qq:1,    prov_cod:"AGU", precio_contado:19.00, precio_credito:20.00, costo:17.50, costo_contado:17.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"ARR", equiv_qq:0.25, prov_cod:"AGU", precio_contado:4.75,  precio_credito:5.00,  costo:4.40,  costo_contado:4.25,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"QQ",  equiv_qq:1,    prov_cod:"COR", precio_contado:21.00, precio_credito:22.00, costo:19.00, costo_contado:18.50, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"ARR", equiv_qq:0.25, prov_cod:"COR", precio_contado:5.25,  precio_credito:5.50,  costo:4.75,  costo_contado:4.65,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* tres trampas baratas: si alguna entra, el precio se desploma y se nota */
  { prod_id:"P-00001", pres_cod:"QQ", equiv_qq:1, prov_cod:"AGU", precio_contado:1.00, precio_credito:1.00, costo:1, costo_contado:1, activo:true,  vigente_desde:"2026-01-01", vigente_hasta:AYER },
  { prod_id:"P-00001", pres_cod:"QQ", equiv_qq:1, prov_cod:"AGU", precio_contado:2.00, precio_credito:2.00, costo:2, costo_contado:2, activo:false, vigente_desde:AYER,         vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"QQ", equiv_qq:1, prov_cod:"PIL", precio_contado:3.00, precio_credito:3.00, costo:3, costo_contado:3, activo:true,  vigente_desde:MANANA,       vigente_hasta:null },
  /* Arroz Crecedor: una sola piladora, dos presentaciones. CERO filas en `precios`. */
  { prod_id:"P-00197", pres_cod:"QQ",  equiv_qq:1,    prov_cod:"AGU", precio_contado:37.00, precio_credito:38.00, costo:34.00, costo_contado:33.50, activo:true, vigente_desde:HOY, vigente_hasta:null },
  { prod_id:"P-00197", pres_cod:"ARR", equiv_qq:0.25, prov_cod:"AGU", precio_contado:9.25,  precio_credito:9.50,  costo:8.50,  costo_contado:8.40,  activo:true, vigente_desde:HOY, vigente_hasta:null },
  /* el dado de baja sí tiene oferta viva: lo que lo saca es el producto */
  { prod_id:"P-BAJA", pres_cod:"QQ", equiv_qq:1, prov_cod:"AGU", precio_contado:10.00, precio_credito:10.00, costo:9, costo_contado:9, activo:true, vigente_desde:AYER, vigente_hasta:null },
];

const PROVEEDORES_BD = [
  { prov_cod:"AGU", nombre:"Piladora San Agustín" },
  { prov_cod:"COR", nombre:"Piladora Cordero" },
  { prov_cod:"PIL", nombre:"Piladora del Futuro" },
];

/* `precios` VACÍA: es el estado real de un producto nuevo del sistema web.
   Si la pantalla volviera a depender de ella, aquí no habría catálogo. */
const PRECIOS_BD = [];

function datosDe(t) {
  if (t === "productos")       return PRODUCTOS_BD;
  if (t === "presentaciones")  return PRESENTACIONES_BD;
  if (t === "ofertas_piladora")return OFERTAS_BD;
  if (t === "v_ofertas_vigentes") return OFERTAS_BD.filter(o => o.activo && !o.vigente_hasta && o.vigente_desde <= HOY);
  if (t === "proveedores")     return PROVEEDORES_BD;
  if (t === "precios")         return PRECIOS_BD;
  if (t === "usuarios")        return [{ usr_id:"FL1", nombre:"Daniel Ríos", rol:"freelance", activo:true }];
  return [];
}

function montar(js, opciones) {
  const op = opciones || {};
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";

  const pedidas = [];
  /* La consulta de mentira RESPETA los filtros: la pantalla saca los productos
     dados de baja con `.eq("estado","activo")`, y si aquí se ignorara el filtro
     la prueba estaría midiendo otra cosa. */
  function consulta(tabla, filtros) {
    const rota = op.tablaRota === tabla;
    const resolver = () => {
      if (rota) return Promise.resolve({ data:null, error:{ message:"permission denied for table " + tabla, code:"42501" } });
      let filas = datosDe(tabla).slice();
      filtros.forEach(f => {
        if (f[0] === "eq")  filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq") filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "is")  filas = filas.filter(r => (f[2] === null ? r[f[1]] == null : r[f[1]] === f[2]));
        if (f[0] === "in")  filas = filas.filter(r => (f[2] || []).indexOf(r[f[1]]) >= 0);
      });
      return Promise.resolve({ data:filas, error:null, count:filas.length });
    };
    const con = (t, c, v) => consulta(tabla, filtros.concat([[t, c, v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, range:()=>enc, filter:()=>enc,
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), is:(c,v)=>con("is",c,v), in:(c,v)=>con("in",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      insert:()=>Promise.resolve({ error:null }), upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => r; return r; },
      delete:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => r; return r; },
    };
    return enc;
  }
  w.SB = {
    auth: {
      getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"daniel@ejemplo.com" }, expires_at: Math.floor(Date.now()/1000)+3600 } } }),
      refreshSession: async () => ({ data:{ session:null } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => { pedidas.push(t); return consulta(t, []); },
    rpc: async () => ({ data:null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(react, ctx); vm.runInContext(reactDom, ctx); vm.runInContext(js, ctx);
  return { ctx, pedidas, w };
}

function pintar(m) {
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__cont).render(React.createElement(Productos, { vender: function(){} }));
    });
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tarjetas = function(){ return window.__cont.querySelectorAll(".card").length; };
    window.__ayudas = function(){
      var ins = window.__cont.querySelectorAll("input"), r = [];
      for (var i=0;i<ins.length;i++) r.push(ins[i].placeholder || "");
      return r.join(" | ");
    };
    window.__escribir = function(marcador, valor){
      var ins = window.__cont.querySelectorAll("input");
      for (var i=0;i<ins.length;i++){
        if ((ins[i].placeholder||"").indexOf(marcador) >= 0){
          var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
          set.call(ins[i], valor);
          ins[i].dispatchEvent(new window.Event("input",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
  `, m.ctx);
}
const txt      = (m) => vm.runInContext("window.__txt()", m.ctx);
const tarjetas = (m) => vm.runInContext("window.__tarjetas()", m.ctx);
const ayudas   = (m) => vm.runInContext("window.__ayudas()", m.ctx);
const buscar   = (m, k, v) => vm.runInContext(`window.__escribir(${JSON.stringify(k)}, ${JSON.stringify(v)})`, m.ctx);

/* ══ La batería. Se corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ── 1) La carga, mirada por dentro ── */
  const m = montar(js);
  let lista = null, reventó = false;
  try { lista = await vm.runInContext("cargarCatalogoReal()", m.ctx); }
  catch (e) { reventó = true; }
  const prods = Array.isArray(lista) ? Array.from(lista) : [];
  const porId = (id) => prods.find(p => p.id === id) || null;
  const arrocillo = porId("P-00001"), crecedor = porId("P-00197");
  const presDe = (p, cod) => (p && (p.presentaciones||[]).find(x => x.presCod === cod)) || null;

  comprobar("la carga no revienta y trae los 2 productos activos con oferta vigente",
    !reventó && prods.length === 2);
  comprobar("«Arroz Crecedor» aparece aunque no tiene NI UNA fila en `precios`", !!crecedor);
  const ids = prods.map(p => p.id);
  comprobar("no se duplica: cada producto aparece una sola vez",
    ids.length > 0 && new Set(ids).size === ids.length);
  comprobar("«Arrocillo Envejecido» sale UNA vez pese a sus 4 ofertas vigentes",
    prods.filter(p => p.id === "P-00001").length === 1);
  comprobar("el producto SIN MARCA sale con su nombre, nunca en blanco",
    !!crecedor && crecedor.marca === "Arroz Crecedor");
  comprobar("dos piladoras a distinto precio: se ofrece el MÁS BARATO ($19,00 el quintal)",
    !!presDe(arrocillo,"QQ") && presDe(arrocillo,"QQ").baseContado === 19);
  comprobar("Arrocillo: $20,00 el quintal a crédito",
    !!presDe(arrocillo,"QQ") && presDe(arrocillo,"QQ").baseCredito === 20);
  comprobar("Arrocillo: la arroba sale de ese mismo quintal ($4,75)",
    !!presDe(arrocillo,"ARR") && presDe(arrocillo,"ARR").baseContado === 4.75);
  comprobar("Crecedor: $37,00 el quintal de contado",
    !!presDe(crecedor,"QQ") && presDe(crecedor,"QQ").baseContado === 37);
  comprobar("Crecedor: $38,00 el quintal a crédito",
    !!presDe(crecedor,"QQ") && presDe(crecedor,"QQ").baseCredito === 38);
  const contados = prods.map(p => (presDe(p,"QQ")||{}).baseContado);
  comprobar("la oferta VENCIDA no se ofrece (nadie queda en $1)", contados.every(x => x !== 1));
  comprobar("la oferta INACTIVA no se ofrece (nadie queda en $2)", contados.every(x => x !== 2));
  comprobar("la oferta que aún NO rige no se ofrece (nadie queda en $3)", contados.every(x => x !== 3));
  comprobar("el producto dado de baja no se ofrece aunque tenga oferta viva", !porId("P-BAJA"));
  comprobar("Arrocillo nombra a sus DOS piladoras, no escoge una al azar",
    !!arrocillo && (arrocillo.piladoras||[]).length === 2 &&
    arrocillo.piladoras.map(x=>x.nombre).join("|").indexOf("Piladora Cordero") >= 0);
  comprobar("Crecedor nombra a su única piladora",
    !!crecedor && (crecedor.piladoras||[]).length === 1 &&
    crecedor.piladoras[0].nombre === "Piladora San Agustín");
  comprobar("la piladora que aún NO rige no se cuela entre las de Arrocillo",
    !!arrocillo && arrocillo.piladoras.every(x => x.cod !== "PIL"));
  comprobar("los costos por presentación siguen llegando (2 piladoras en el quintal)",
    !!presDe(arrocillo,"QQ") && (presDe(arrocillo,"QQ").costos||[]).length === 2);
  comprobar("cada presentación conserva su pres_id de `presentaciones`",
    !!presDe(crecedor,"QQ") && presDe(crecedor,"QQ").presId === "PR-3");
  comprobar("la carga consulta `ofertas_piladora`", m.pedidas.indexOf("ofertas_piladora") >= 0);
  comprobar("la carga YA NO consulta la tabla `precios`", m.pedidas.indexOf("precios") < 0);

  /* ── 2) La pantalla ── */
  pintar(m);
  await esperar(300);
  const t0 = txt(m);
  comprobar("en pantalla: el sello verde cuenta los 2 productos de la base",
    /Cat[áa]logo y precios vivos de la base · 2 productos/.test(t0));
  comprobar("en pantalla: el número del sello CUADRA con las tarjetas que se ven",
    tarjetas(m) === prods.length);
  comprobar("en pantalla: «Arroz Crecedor» se ve sin buscar nada", /Arroz Crecedor/.test(t0));

  buscar(m, "producto", "crecedor");
  await esperar(200);
  comprobar("en pantalla: escribiendo «crecedor» lo encuentra",
    /Arroz Crecedor/.test(txt(m)) && tarjetas(m) === 1);

  buscar(m, "producto", "cordero");
  await esperar(200);
  comprobar("en pantalla: se encuentra por PILADORA («cordero»)",
    /Arrocillo Envejecido/.test(txt(m)));

  const ay = ayudas(m);
  comprobar("en pantalla: el texto de ayuda nombra producto, línea y piladora",
    /producto/i.test(ay) && /l[ií]nea/i.test(ay) && /piladora/i.test(ay));

  buscar(m, "producto", "zzzz-no-existe");
  await esperar(200);
  comprobar("en pantalla: lo que no existe se dice, no se deja en blanco",
    /Sin marcas que coincidan/.test(txt(m)) && tarjetas(m) === 0);

  /* ── 3) La base contesta con error: viene en `.error`, no lanzado ── */
  const r = montar(js, { tablaRota:"ofertas_piladora" });
  let listaRota = "no-corrió", tumbó = false;
  try { listaRota = await vm.runInContext("cargarCatalogoReal()", r.ctx); }
  catch (e) { tumbó = true; }
  comprobar("con error de la base (en `.error`, no lanzado) la carga no revienta",
    !tumbó && !listaRota);
  pintar(r);
  await esperar(300);
  const tr = txt(r);
  comprobar("y la pantalla queda de pie con la demostración, sin sello mentiroso",
    /Arroz Gustadina/.test(tr) && !/Cat[áa]logo y precios vivos/.test(tr));

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  ["vuelve a leer la tabla `precios`",
    `window.SB.from("ofertas_piladora")`, `window.SB.from("precios")`],
  ["se le olvida mirar si la oferta sigue activa",
    `o.activo !== false &&`, `true &&`],
  ["se le olvida la fecha en que la oferta empieza a regir",
    `(!o.vigente_desde || String(o.vigente_desde).slice(0,10) <= hoyISO) &&`, `true &&`],
  ["se le olvida la fecha en que la oferta deja de regir",
    `(!o.vigente_hasta || String(o.vigente_hasta).slice(0,10) >  hoyISO));`, `true);`],
  ["no lleva el precio a quintales (se olvida del equiv_qq)",
    `const c=(Number(o.precio_contado)||0)/eq; if(!(c>0)) return;`,
    `const c=(Number(o.precio_contado)||0); if(!(c>0)) return;`],
  ["no se queda con el más barato: agarra la última oferta que pase",
    `if(!g || c < g.base_contado) precioDe[o.prod_id]=`, `if(true) precioDe[o.prod_id]=`],
  ["el producto sin marca se queda en blanco",
    `nom=p.nombre||p.marca||p.prod_id;`, `nom=p.marca||"";`],
  ["el buscador deja de mirar la piladora",
    `const pilas=(m.piladoras||[]).map(x=>x.nombre).join(" ");`, `const pilas="";`],
  ["el sello verde cuenta otra cosa que lo que se muestra",
    `background:"rgba(28,122,68,.13)",color:"#1c7a44",margin:"0 0 12px"}}>
      🟢 Catálogo y precios vivos de la base · {reales.length} productos</div>}`,
    `background:"rgba(28,122,68,.13)",color:"#1c7a44",margin:"0 0 12px"}}>
      🟢 Catálogo y precios vivos de la base · {reales.length + 1} productos</div>}`],
];

(async () => {
  console.log("═══ Productos: el catálogo sale de las ofertas · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
      (ok + mal - 1) + ". Alguna se perdió o se agregó sin declararla.");
  }

  /* ── Nace roja: se rompe la regla y se comprueba que la prueba se cae ── */
  console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
  if (MUTANTES.length !== MUTANTES_ESPERADOS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + MUTANTES_ESPERADOS + " mutantes y hay " + MUTANTES.length + ".");
  }
  for (const [nombre, de, a] of MUTANTES) {
    const veces = jsx.split(de).length - 1;
    if (veces !== 1) {
      mal++;
      console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
      continue;
    }
    const mutado = jsx.replace(de, a);
    let res;
    try { res = await bateria(R.Babel.transform(mutado, { presets:["react"] }).code, false); }
    catch (e) { res = { mal:1, fallos:["reventó: " + e.message] }; }
    if (res.mal > 0) {
      ok++;
      console.log(`  ✓ «${nombre}» → la prueba se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
    } else {
      mal++;
      console.log(`  ✗ «${nombre}» → la prueba PASA IGUAL: no está midiendo nada`);
    }
  }

  console.log("Resultado del catálogo de Productos: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
