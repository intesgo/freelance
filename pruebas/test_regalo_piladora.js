/* ═══════════════════════════════════════════════════════════════════════════
   LA PILADORA CONFIRMA EL REGALO AL DESPACHAR
   · proveedor-freelance

   Qué se rompía. `guardarFactura` mandaba solo {item_id, despachado_qq} por
   línea: `facturar_pedido` ya sabía recibir `gratis_despachado_qq`, pero la
   única app que podía decirlo nunca lo decía. Resultado: TODO pedido con
   regalo se facturaba con el regalo sin confirmar y nacía un fallo urgente
   («mercadería que salió de bodega sin registro que lo diga»).

   La decisión del Product Owner (06/08/2026): la piladora confirma el regalo
   al despachar, lo regalado se factura a valor cero, y en su pantalla se ve
   DE QUIÉN es el costo de cada regalo: P3 lo paga el vendedor con su
   comisión, P4 lo paga el freelance, P6 lo asume la propia piladora. Los
   tres salen físicamente de su bodega; el bolsillo es lo que cambia.

   Lo que mide esta prueba, y por qué así:

   1) Que `gratis_despachado_qq` VIAJE de verdad en el jsonb de
      `facturar_pedido`. Y que CERO viaje como cero: «no salió regalo» es un
      pronunciamiento, no un silencio. La clave ausente es el silencio.

   2) Que el tope del regalo se le PREGUNTE a la base
      (`gratis_tope_al_despachar`), no se calcule en JavaScript: el mismo
      hecho calculado en dos lugares termina contradiciéndose. Caso medido en
      un doble sintético: 100 pedidos, salen 50, prometidos 2 → tope 1.00.

   3) Que sin señal NO se invente un tope ni se bloquee a ciegas: manda el
      cerrojo de la base.

   4) Que los TRES tipos de promoción se distingan en la pantalla por
      `tipo_precio` (P3/P4/P6), que es el dato que ya viaja en cada línea
      desde las apps de venta.

   5) Que los quintales lleguen TAL CUAL están en `pedido_items` (ya vienen
      en qq): un regalo de 0,25 qq (arroba) o 0,1 qq (10 libras) no se
      redondea ni se convierte por el texto de la presentación.

   NACE ROJA a propósito: al final se rompe la regla en el fuente, una rotura
   a la vez, y se comprueba que la prueba SE CAE. Hay DOS roturas TONTAS y
   directas (sumar 1 a los quintales de regalo que viajan, y sumar 1 al tope
   que da la base) además de las semánticas.

   Uso: node test_regalo_piladora.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("proveedor-freelance");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr. ── */
const ESPERADAS = 24;
const MUTANTES_ESPERADOS = 7;

/* ── La app montada en seco: solo hacen falta sus funciones de módulo ── */
function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
  w.SB = null;
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
  return ctx;
}
const plano = x => JSON.parse(JSON.stringify(x));

/* Fixture completamente sintético. Los datos con los que vivoDecidir arma la
   pantalla incluyen un pedido con las TRES
   promociones y una línea sin regalo. Todo ya en quintales, como lo guarda
   `pedido_items` (0,25 qq = una arroba; 0,1 qq = «10 libras»). */
const FILAS = {
  usuarios: [{ usr_id:"USR-PROV-DEMO", nombre:"Proveedor Demo", rol:"proveedor", prov_cod:"PROV-DEMO" }],
  pedidos: [{ ped_id:"PED-DEMO-01", cli_id:"CLI-DEMO", prov_cod:"PROV-DEMO", estado:"enviado_proveedor",
    condicion:"credito", creado:"2026-08-01T10:00:00+00:00", factura:null, es_demo:false }],
  pedido_items: [
    { item_id:"ITEM-DEMO-01", ped_id:"PED-DEMO-01", prod_id:"PROD-DEMO-01", descripcion:"Producto Demo · Quintal",
      cantidad_qq:100, precio_usd:43, despachado_qq:null, gratis_qq:2,    gratis_despachado_qq:null, tipo_precio:"P6", es_demo:false },
    { item_id:"ITEM-DEMO-02", ped_id:"PED-DEMO-01", prod_id:"PROD-DEMO-02", descripcion:"Producto Demo · Arroba",
      cantidad_qq:25,  precio_usd:11, despachado_qq:null, gratis_qq:0.25, gratis_despachado_qq:null, tipo_precio:"P4", es_demo:false },
    { item_id:"ITEM-DEMO-03", ped_id:"PED-DEMO-01", prod_id:"PROD-DEMO-03", descripcion:"Producto Demo · 10 libras",
      cantidad_qq:20,  precio_usd:4.5, despachado_qq:null, gratis_qq:0.1, gratis_despachado_qq:null, tipo_precio:"P3", es_demo:false },
    { item_id:"ITEM-DEMO-04", ped_id:"PED-DEMO-01", prod_id:"PROD-DEMO-04", descripcion:"Producto Demo · Quintal",
      cantidad_qq:10,  precio_usd:40, despachado_qq:null, gratis_qq:0,    gratis_despachado_qq:null, tipo_precio:"P1", es_demo:false },
  ],
  clientes: [{ cli_id:"CLI-DEMO", nombre:"Cliente Demo" }],
  solicitudes: [],
};

/* ══ La batería. Se corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(fuenteJsx, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  let ctx;
  try { ctx = montar(R.Babel.transform(fuenteJsx, { presets:["react"] }).code); }
  catch (e) { return { ok:0, mal:1, fallos:["la app no compila: " + e.message.split("\n")[0]] }; }
  const corre = e => vm.runInContext(e, ctx);

  /* ── A · EL DATO VIAJA · guardarFactura mete el regalo en el jsonb ── */
  corre(`
    globalThis.__rpc = [];
    window.SB = { rpc: async function(fn, args){
      globalThis.__rpc.push({ fn: fn, args: args });
      return { data:[{ aviso:"Facturado", parcial:false }], error:null };
    }};`);
  const LINEAS = [
    { itemId:"ITEM-DEMO-01", despachado:100, gratisDesp:1.5 },   /* regalo confirmado */
    { itemId:"ITEM-DEMO-02", despachado:10 },                    /* sin regalo: sin clave */
    { itemId:"ITEM-DEMO-03", despachado:20,  gratisDesp:0 },     /* confirmó CERO */
    { itemId:"ITEM-DEMO-04", despachado:5,   gratisDesp:null },  /* nadie se pronunció */
  ];
  try { await corre(`guardarFactura("PED-DEMO-01","001-001-000123", ${JSON.stringify(LINEAS)})`); }
  catch (e) {}
  const rpc = plano(corre("globalThis.__rpc"));
  const fac = rpc.find(x => x.fn === "facturar_pedido") || { args:{} };
  const jl = fac.args.p_lineas || [];
  const li = id => jl.find(l => l && l.item_id === id) || {};
  comprobar("la factura va en UNA llamada a `facturar_pedido` con el pedido y el número",
    fac.args.p_ped === "PED-DEMO-01" && fac.args.p_factura === "001-001-000123" && jl.length === 4);
  comprobar("el regalo confirmado VIAJA en el jsonb: gratis_despachado_qq = 1.5, tal cual",
    li("ITEM-DEMO-01").gratis_despachado_qq === 1.5 && li("ITEM-DEMO-01").despachado_qq === 100);
  comprobar("la línea sin regalo no lleva la clave: no se inventa un regalo que no existe",
    !("gratis_despachado_qq" in li("ITEM-DEMO-02")));
  comprobar("confirmar CERO viaja como 0: «no salió regalo» es pronunciarse, no callar",
    ("gratis_despachado_qq" in li("ITEM-DEMO-03")) && li("ITEM-DEMO-03").gratis_despachado_qq === 0);
  comprobar("si nadie se pronunció, la clave NO viaja: que la base deje su fallo urgente, no un cero falso",
    !("gratis_despachado_qq" in li("ITEM-DEMO-04")));
  comprobar("lo despachado viaja como número en todas las líneas",
    jl.every(l => typeof l.despachado_qq === "number"));

  /* ── B · EL TOPE LO DICE LA BASE · gratis_tope_al_despachar por RPC ── */
  corre(`
    globalThis.__rpc = [];
    window.SB = { rpc: async function(fn, args){
      globalThis.__rpc.push({ fn: fn, args: args });
      return { data: 1.00, error:null };   /* respuesta del doble sintético */
    }};`);
  let tope;
  try { tope = await corre(`topeRegaloAlDespachar({ prodId:"PROD-DEMO-01", provCod:"PROV-DEMO",
    cantidadQq:100, despachadoQq:50, gratisQq:2, esDemo:false })`); }
  catch (e) { tope = "reventó: " + e.message; }
  const pregunta = plano(corre("globalThis.__rpc"))[0] || { args:{} };
  comprobar("el tope se le pregunta a `gratis_tope_al_despachar` con producto, piladora, pedido, salido y prometido",
    pregunta.fn === "gratis_tope_al_despachar" && pregunta.args.p_prod_id === "PROD-DEMO-01" &&
    pregunta.args.p_prov_cod === "PROV-DEMO" && pregunta.args.p_cantidad_qq === 100 &&
    pregunta.args.p_despachado_qq === 50 && pregunta.args.p_gratis_qq === 2);
  comprobar("y se obedece tal cual: pidieron 100, salen 50, prometidos 2 → tope 1.00 (el caso medido en la base)",
    tope === 1);
  corre(`window.SB = null;`);
  let sinSenal;
  try { sinSenal = await corre(`topeRegaloAlDespachar({ prodId:"PROD-DEMO-01", provCod:"PROV-DEMO",
    cantidadQq:100, despachadoQq:50, gratisQq:2, esDemo:false })`); }
  catch (e) { sinSenal = "reventó: " + e.message; }
  comprobar("sin señal: no se inventa un tope ni se bloquea a ciegas (manda el cerrojo de la base)",
    sinSenal === undefined);
  corre(`window.SB = { rpc: async function(){ return { data:null, error:{ message:"se cayó" } }; } };`);
  let conError;
  try { conError = await corre(`topeRegaloAlDespachar({ prodId:"PROD-DEMO-01", provCod:"PROV-DEMO",
    cantidadQq:100, despachadoQq:50, gratisQq:2, esDemo:false })`); }
  catch (e) { conError = "reventó: " + e.message; }
  comprobar("si la base contesta con error, tampoco se inventa: el tope queda sin conocerse",
    conError === undefined);

  /* ── C · DE QUIÉN ES EL COSTO · los tres tipos, en criollo ── */
  let t3, t4, t6, tNulo;
  try {
    t3 = String(corre(`quienAsumeRegalo("P3")`) || "");
    t4 = String(corre(`quienAsumeRegalo("P4")`) || "");
    t6 = String(corre(`quienAsumeRegalo("P6")`) || "");
    tNulo = String(corre(`quienAsumeRegalo(null)`) || "");
  } catch (e) { t3 = t4 = t6 = tNulo = ""; }
  comprobar("P3 · promoción vendedor: dice que lo paga el VENDEDOR con su comisión",
    /vendedor/i.test(t3) && /comisi/i.test(t3));
  comprobar("P4 · promoción freelance: dice que lo paga el FREELANCE",
    /freelance/i.test(t4) && !/vendedor/i.test(t4));
  comprobar("P6 · promoción proveedor: le dice a la piladora que ese regalo lo asume ELLA",
    /(lo asumes|tuya|tu promoci)/i.test(t6) && !/vendedor|freelance/i.test(t6));
  comprobar("tipo desconocido: dice que NO CONSTA quién lo paga, en vez de adivinar un bolsillo",
    /no consta/i.test(tNulo) && !/vendedor|freelance|tu promoci/i.test(tNulo));
  comprobar("los tres textos son distintos entre sí: cada bolsillo con su letrero",
    new Set([t3, t4, t6]).size === 3);

  /* ── D · LA PANTALLA RECIBE LO QUE NECESITA · vivoDecidir ──
     El SB falso RESPETA el select: solo devuelve las columnas pedidas. Así,
     si la app deja de pedir una columna, aquí se nota (igual que en la base,
     donde lo no pedido no llega). */
  corre(`
    var FILAS = ${JSON.stringify(FILAS)};
    function recorta(filas, cols){
      if(!cols || cols.indexOf("*") >= 0) return filas;
      var lista = cols.split(",").map(function(c){ return c.trim(); });
      return filas.map(function(f){
        var o = {}; lista.forEach(function(c){ o[c] = (c in f) ? f[c] : undefined; });
        return o;
      });
    }
    function tabla(nombre){
      var cols = null;
      var api = {
        select: function(c){ cols = c; return api; },
        eq: function(){ return api; }, order: function(){ return api; },
        like: function(){ return api; }, in: function(){ return api; },
        limit: function(){ return Promise.resolve({ data: recorta(FILAS[nombre]||[], cols), error:null }); },
        maybeSingle: function(){ var d = recorta(FILAS[nombre]||[], cols); return Promise.resolve({ data:d[0]||null, error:null }); },
      };
      api.single = api.maybeSingle;
      return api;
    }
    window.SB = {
      auth: { getSession: async function(){ return { data:{ session:{ user:{ id:"auth-demo", email:"proveedor@example.invalid" } } } }; } },
      from: tabla,
      rpc: async function(){ return { data:null, error:null }; },
    };`);
  let decidir;
  try { decidir = plano(await corre(`vivoDecidir()`)); }
  catch (e) { decidir = null; }
  const fac1 = (decidir && decidir.facturar && decidir.facturar[0]) || {};
  const lns = fac1.lineas || [];
  const ln = id => lns.find(l => l && l.itemId === id) || {};
  comprobar("cada línea llega con su regalo prometido: la de P6 trae 2 qq",
    ln("ITEM-DEMO-01").gratis === 2);
  comprobar("y con su tipo (P3/P4/P6): sin él no se sabe de quién es el costo",
    ln("ITEM-DEMO-01").tipo === "P6" && ln("ITEM-DEMO-02").tipo === "P4" && ln("ITEM-DEMO-03").tipo === "P3");
  comprobar("y con su producto, que es con lo que se le pregunta el tope a la base",
    ln("ITEM-DEMO-01").prodId === "PROD-DEMO-01");
  comprobar("el pedido trae la piladora (prov_cod): la otra mitad de la pregunta del tope",
    fac1.provCod === "PROV-DEMO");
  comprobar("un regalo de 0,25 qq (la arroba) llega tal cual, sin redondear ni adivinar por el texto",
    ln("ITEM-DEMO-02").gratis === 0.25);
  comprobar("un regalo de 0,1 qq («10 libras») también llega tal cual",
    ln("ITEM-DEMO-03").gratis === 0.1);
  comprobar("el regalo SIN confirmar llega como null, que no es lo mismo que 0",
    ln("ITEM-DEMO-01").gratisDespachado === null);

  /* ── E · DÓNDE VIVE LA REGLA · se lee del fuente ── */
  comprobar("la pantalla pregunta el tope por RPC (`gratis_tope_al_despachar`), no lo recalcula en JavaScript",
    /rpc\(\s*["']gratis_tope_al_despachar["']/.test(fuenteJsx));
  comprobar("el botón de facturar se frena cuando el regalo pasa el tope conocido (aviso ANTES de mandar)",
    (fuenteJsx.split("sobreRegalo(p)").length - 1) >= 2);

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  /* tontas y directas: si estas no tumban la prueba, la prueba no mide nada */
  ["TONTA · le suma 1 a los quintales de regalo que viajan a la base",
   `fila.gratis_despachado_qq = Number(l.gratisDesp);`,
   `fila.gratis_despachado_qq = Number(l.gratisDesp)+1;`],
  ["TONTA · le suma 1 al tope que devuelve la base",
   `    return (data===null || data===undefined) ? undefined : Number(data);`,
   `    return (data===null || data===undefined) ? undefined : Number(data)+1;`],
  /* el corazón del encargo: el dato deja de viajar */
  ["el regalo deja de viajar en el jsonb (vuelve el fallo urgente de siempre)",
   `if(l.gratisDesp!==undefined && l.gratisDesp!==null) fila.gratis_despachado_qq = Number(l.gratisDesp);`,
   `if(false) fila.gratis_despachado_qq = Number(l.gratisDesp);`],
  ["confirmar CERO se vuelve silencio (el cero es un pronunciamiento)",
   `if(l.gratisDesp!==undefined && l.gratisDesp!==null) fila.gratis_despachado_qq = Number(l.gratisDesp);`,
   `if(l.gratisDesp) fila.gratis_despachado_qq = Number(l.gratisDesp);`],
  /* sin señal se inventa un tope */
  ["sin señal la app inventa tope 0 y bloquearía a ciegas",
   `  if(!window.SB || !window.SB.rpc) return undefined;`,
   `  if(!window.SB || !window.SB.rpc) return 0;`],
  /* la pantalla se queda ciega de quién paga */
  ["vivoDecidir deja de pedir el tipo: ya no se sabe de quién es el costo",
   `,tipo_precio,prod_id,pres_cod,promo_id,condicion,comision_usd,es_demo`,
   `,prod_id,pres_cod,promo_id,condicion,comision_usd,es_demo`],
  ["P3 pierde su letrero: el regalo del vendedor se muestra como si no constara quién lo paga",
   `if(tipo==="P3")`,
   `if(false)`],
];

(async function () {
  console.log("═══ La piladora confirma el regalo al despachar · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const r = await bateria(jsx, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
      (ok + mal - 1) + ". Alguna se perdió o se agregó sin declararla.");
  }

  console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
  if (MUTANTES.length !== MUTANTES_ESPERADOS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + MUTANTES_ESPERADOS + " mutantes y hay " + MUTANTES.length + ".");
  }
  for (const [nombre, dee, a] of MUTANTES) {
    const veces = jsx.split(dee).length - 1;
    if (veces !== 1) {
      mal++;
      console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
      continue;
    }
    let res;
    try { res = await bateria(jsx.replace(dee, a), false); }
    catch (e) { res = { mal:1, fallos:["reventó: " + e.message] }; }
    if (res.mal > 0) {
      ok++;
      console.log(`  ✓ «${nombre}» → la prueba se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
    } else {
      mal++;
      console.log(`  ✗ «${nombre}» → la prueba PASA IGUAL: no está midiendo nada`);
    }
  }

  console.log("Resultado del regalo en la piladora: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
