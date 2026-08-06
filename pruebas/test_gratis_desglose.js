/* ═══════════════════════════════════════════════════════════════════════
   EL DESGLOSE DE LAS UNIDADES GRATIS SALE DE LA OFERTA Y DEL PRODUCTO
   · Comisionista · socio-comercial · freelance-completo

   Qué se rompía. En P4 y P6 la promoción regala unidades, y la pantalla dice
   en qué presentaciones salen de la bodega («Se entregan: 2 Quintal + 2
   Arroba»). Ese desglose se armaba con DOS datos adivinados:

   1) Los quintales regalados salían del TEXTO de la unidad (`qqDeTam`), no de
      la equivalencia real de la oferta (`equiv`). En la base viva hay una
      presentación «10 libras» con equiv_qq = 0,1 (tres productos de Piladora
      San Agustín). El conversor por texto no reconoce «libras» y devuelve 1:
      DIEZ VECES más grano regalado del que la piladora despacha.

   2) Las presentaciones hermanas se buscaban en la constante de DEMOSTRACIÓN
      `PRESENTACIONES`, filtrando por `marca`. Con datos vivos la marca del
      catálogo es el NOMBRE del producto (nombre||marca||id) y no calza con
      ninguna marca de la demostración: el desglose salía VACÍO y en pantalla
      quedaba solo el aviso naranja «No calza 3 qq en presentaciones: se
      redondea abajo». Medido, no supuesto.

   El antecedente que obliga a medir y no a leer: en la app del transportista
   los quintales salían del NOMBRE del producto y una parada de 65 qq se
   mostraba como «22 qq».

   Esta prueba EVALÚA LA LÍNEA DE VERDAD: saca del fuente la llamada que hace
   la pantalla (`? descomponerGratis(...) : null`) y la corre con un catálogo
   construido por `construirCatalogoPedido` a partir de filas con la forma de
   producción. Si alguien cambia esa línea para volver a adivinar, se cae.

   Cubre a propósito: un producto SIN MARCA (marca NULL, como P-00197 «Arroz
   Crecedor»), una presentación de ARROBAS (equiv 0,25), una presentación cuyo
   texto MIENTE («10 libras» = 0,1 qq) y una piladora que solo despacha
   quintales.

   NACE ROJA a propósito: al final se rompe la regla en el fuente, una rotura a
   la vez, y se comprueba que la prueba SE CAE. Hay dos roturas TONTAS (sumar 1
   a la cantidad de cada parte, sumar 1 al resto) además de las semánticas: una
   rotura "inteligente" puede quedar neutralizada por los datos de prueba y
   hacer creer que la prueba no mide, cuando el malo es el mutante.

   Uso: node test_gratis_desglose.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una prueba que se borra sin querer no pase inadvertida. ── */
const ESPERADAS = 15;
const MUTANTES_ESPERADOS = 6;

const dia = (n) => { const d = new Date(Date.now() + n * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
const AYER = dia(-1);

/* ══ La base de prueba, con la forma de producción ══
   P-00197 «Arroz Crecedor» tiene la MARCA EN NULL, igual que en la base viva:
   ese es el producto con el que el desglose salía vacío. */
const PRODUCTOS_BD = [
  { prod_id:"P-00197", nombre:"Arroz Crecedor",    marca:null,         linea:"Arroz", foto:null, estado:"activo" },
  { prod_id:"P-00056", nombre:"Arroz Rosa Elvira", marca:"Rosa Elvira", linea:"Arroz", foto:null, estado:"activo" },
];

const OFERTAS_BD = [
  /* San Agustín despacha el Crecedor en tres presentaciones */
  { prod_id:"P-00197", pres_cod:"QQ",  presentacion:"Quintal",   equiv_qq:1,    prov_cod:"AGU", costo:34,   costo_contado:33,   precio_contado:37,   precio_credito:38,   activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00197", pres_cod:"ARR", presentacion:"Arroba",    equiv_qq:0.25, prov_cod:"AGU", costo:8.5,  costo_contado:8.25, precio_contado:9.25, precio_credito:9.5,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* la trampa REAL de la base: el texto no dice ni «quintal» ni «kg» ni «lb»,
     así que adivinar desde el texto da 1 qq cuando la oferta dice 0,1 */
  { prod_id:"P-00197", pres_cod:"L10", presentacion:"10 libras", equiv_qq:0.1,  prov_cod:"AGU", costo:3.7,  costo_contado:3.6,  precio_contado:4.1,  precio_credito:4.2,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* Rocafuerte despacha el MISMO producto, pero solo en quintales */
  { prod_id:"P-00197", pres_cod:"QQ",  presentacion:"Quintal",   equiv_qq:1,    prov_cod:"ROS", costo:34.5, costo_contado:33.5, precio_contado:37.5, precio_credito:38.5, activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* otro producto, este SÍ con marca: sirve para ver que no se mezclan */
  { prod_id:"P-00056", pres_cod:"QQ",  presentacion:"Quintal",     equiv_qq:1,    prov_cod:"AGU", costo:38, costo_contado:37, precio_contado:41,  precio_credito:42, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00056", pres_cod:"S25", presentacion:"Saco 25 kg",  equiv_qq:0.55, prov_cod:"AGU", costo:21, costo_contado:20, precio_contado:22.5, precio_credito:23, activo:true, vigente_desde:AYER, vigente_hasta:null },
];

const PROVEEDORES_BD = [
  { prov_cod:"AGU", nombre:"Piladora San Agustín", es_demo:false },
  { prov_cod:"ROS", nombre:"Piladora Rocafuerte",  es_demo:false },
];

/* ── La app montada en seco: solo hacen falta sus funciones de módulo ── */
function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
  w.SB = null;                                  /* sin sesión: nadie sale a la red */
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
  return ctx;
}
const plano = x => JSON.parse(JSON.stringify(x));

/* ══ La batería. Se corre igual contra el código bueno y contra los mutantes ══ */
function bateria(fuenteJsx, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* LA LÍNEA DE VERDAD: la que corre la pantalla, sacada del fuente */
  const m = fuenteJsx.match(/\?\s*(descomponerGratis\([^;]*?\))\s*:\s*null;/);
  if (!m) return { ok:0, mal:1, fallos:["no se encontró la llamada de la pantalla a descomponerGratis"] };
  const LLAMADA = m[1];

  const ctx = montar(R.Babel.transform(fuenteJsx, { presets:["react"] }).code);
  const corre = e => vm.runInContext(e, ctx);

  /* El catálogo del pedido, construido como lo construye la app con datos vivos */
  let cat = null;
  try {
    cat = corre(`construirCatalogoPedido(${JSON.stringify(PROVEEDORES_BD)}, ${JSON.stringify(OFERTAS_BD)}, ${JSON.stringify(PRODUCTOS_BD)}, [])`);
  } catch (e) { cat = null; }
  const PRES = cat && cat.pres ? plano(Array.from(cat.pres)) : [];
  const de = (pid, cod, prov) => PRES.find(p => p.prodId===pid && p.presCod===cod && p.provId===prov) || null;

  /* Corre la línea de la pantalla con este producto y estas unidades gratis */
  const desglose = (prod, gratisNum, lista) => {
    try {
      corre(`globalThis.prod = ${JSON.stringify(prod)};
             globalThis.gratisNum = ${JSON.stringify(gratisNum)};
             globalThis.PRES_PED = ${JSON.stringify(lista || PRES)};`);
      const d = plano(corre(LLAMADA));
      return { texto: corre(`textoDesglose(${JSON.stringify(d)})`), resto: d.resto, partes: d.partes };
    } catch (e) { return { texto:"reventó: " + e.message, resto:null, partes:[] }; }
  };

  const QQ  = de("P-00197","QQ","AGU");
  const ARR = de("P-00197","ARR","AGU");
  const L10 = de("P-00197","L10","AGU");
  const ROS = de("P-00197","QQ","ROS");
  const OTRO= de("P-00056","QQ","AGU");

  /* ── 1..4 · quintales del producto SIN MARCA ── */
  const d3   = desglose(QQ, 3);
  const d26  = desglose(QQ, 2.6);
  comprobar("3 quintales gratis se entregan como «3 Quintal» (hoy salía en blanco)",
    d3.texto === "3 Quintal");
  comprobar("y no queda nada suelto: resto 0",
    d3.resto === 0);
  comprobar("2,6 quintales gratis se reparten mayor→menor: «2 Quintal + 2 Arroba + 1 10 libras»",
    d26.texto === "2 Quintal + 2 Arroba + 1 10 libras");
  comprobar("y ahí no se pierde grano: resto 0",
    d26.resto === 0);

  /* ── 5 · ARROBAS: la equivalencia 0,25 sale de la oferta ── */
  const dArr = desglose(ARR, 12);
  comprobar("12 ARROBAS gratis (equiv 0,25) son 3 qq: «3 Quintal»",
    dArr.texto === "3 Quintal");

  /* ── 6..7 · el texto que MIENTE: «10 libras» son 0,1 qq, no 1 ── */
  const dL10 = desglose(L10, 20);
  comprobar("20 unidades de «10 libras» gratis (equiv 0,1) son 2 qq: «2 Quintal»",
    dL10.texto === "2 Quintal");
  comprobar("y NO «20 Quintal», que es lo que da adivinar 1 qq desde el texto «10 libras»",
    dL10.texto !== "20 Quintal" && !/^20 /.test(dL10.texto));

  /* ── 8..10 · producto SIN MARCA y sin mezclas ── */
  comprobar("el producto vivo SIN MARCA (marca NULL) arma desglose: ya no sale la lista vacía",
    d3.partes.length > 0);
  comprobar("y ya no aparece el aviso «No calza N qq» cuando sí calza",
    d3.resto === 0 && d26.resto === 0);
  comprobar("no arrastra presentaciones de OTRO producto: no aparece «Saco 25 kg»",
    !/Saco/.test(d3.texto) && !/Saco/.test(d26.texto));

  /* ── 11..12 · la piladora que solo despacha quintales ── */
  const dRos = desglose(ROS, 2.6);
  comprobar("piladora que solo despacha quintales: 2,6 qq gratis son «2 Quintal» (no se regala lo que no tiene)",
    dRos.texto === "2 Quintal");
  comprobar("y avisa lo que no calza: resto 0,6 qq",
    dRos.resto === 0.6);

  /* ── 13 · producto CON marca: funciona igual ── */
  const dOtro = desglose(OTRO, 4);
  comprobar("producto CON marca: 4 quintales gratis son «4 Quintal» (con marca o sin marca, da igual)",
    dOtro.texto === "4 Quintal");

  /* ── 14 · la demostración no se rompe ── */
  let demoQQ = null;
  try { demoQQ = plano(corre(`PRESENTACIONES.filter(p=>p.marca==="Arroz Gustadina" && p.unidad==="Quintal")`))[0] || null; }
  catch (e) { demoQQ = null; }
  const dDemo = demoQQ ? desglose(demoQQ, 2, []) : { texto:"no está el producto de demostración" };
  comprobar("DEMOSTRACIÓN (sin oferta ni prodId): «Arroz Gustadina», 2 gratis siguen siendo «2 Quintal»",
    dDemo.texto === "2 Quintal");

  /* ── 15 · el hueco YA SE CERRÓ (PROMO-04, 06/08/2026) ──
     Hasta ese día el catálogo dejaba `promosFreelance:[]` y `promosProveedor:[]`
     en todas las líneas: P4 y P6 salían grises y este desglose no se pintaba
     nunca en producción. Aquí quedaba escrito el hueco. Ahora las promociones
     vivas SÍ entran, así que lo que se vigila es lo contrario: que con una
     promoción cargada la línea la traiga, que es lo que hace que este desglose
     llegue a verse. El colador completo lo mide test_promos_catalogo.js.
     Nota: lo que se puede regalar de verdad lo sigue diciendo la base
     (`gratis_que_concede`); aquí solo se mira que la promoción llegue. */
  const PROMO_VIVA = { promos:[{ promo_id:"PM-X1", nombre:"Promo del arnés", detalle:null,
      modalidad:"compra_lleva", origen:"freelance", prov_cod:"AGU", prod_id:"P-00197",
      pres_cod:"QQ", base:36.00, estado:"activa", vigente_desde:AYER, vigente_hasta:null, es_demo:false }],
    tramos:[{ promo_id:"PM-X1", modalidad:"compra_lleva", desde_cant:50, gratis_cant:2, es_demo:false }] };
  let conPromo = null;
  try {
    conPromo = corre(`construirCatalogoPedido(${JSON.stringify(PROVEEDORES_BD)}, ${JSON.stringify(OFERTAS_BD)}, ${JSON.stringify(PRODUCTOS_BD)}, [], ${JSON.stringify(PROMO_VIVA)})`);
  } catch (e) { conPromo = null; }
  const conPres = conPromo && conPromo.pres ? plano(Array.from(conPromo.pres)) : [];
  const lineaQQ = conPres.find(p => p.prodId==="P-00197" && p.presCod==="QQ" && p.provId==="AGU") || null;
  comprobar("HUECO CERRADO (PROMO-04): con una promoción cargada, la línea del pedido YA la trae, " +
            "que es lo que hace que este desglose se pinte en producción",
    !!lineaQQ && (lineaQQ.promosFreelance||[]).length === 1 &&
    lineaQQ.promosFreelance[0].nombre === "Promo del arnés" &&
    PRES.length > 0 && PRES.every(p => (p.promosFreelance||[]).length === 0));

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  /* tontas y directas: si estas no tumban la prueba, la prueba no mide nada */
  ["TONTA · le suma 1 a la cantidad de cada parte",
   `if(n>0){ partes.push({tam:p.tam, n}); resto=`,
   `if(n>0){ partes.push({tam:p.tam, n:n+1}); resto=`],
  ["TONTA · le suma 1 a lo que no calza",
   `  return {partes, resto};\n};`,
   `  return {partes, resto: resto+1};\n};`],
  /* el defecto original, tal cual estaba: mira la constante de DEMOSTRACIÓN */
  ["vuelve a buscar las hermanas en la constante de demostración PRESENTACIONES (el defecto original)",
   `  const todas = (lista && lista.length) ? lista : PRESENTACIONES;`,
   `  const todas = PRESENTACIONES;`],
  /* el otro defecto original: empareja por marca en vez de producto+piladora */
  ["vuelve a emparejar por MARCA en vez de por producto y piladora",
   `  return todas.filter(p => (prod.prodId && p.prodId)
    ? (p.prodId===prod.prodId && (!prod.provId || !p.provId || p.provId===prod.provId))
    : (p.marca!=null && p.marca===prod.marca));`,
   `  return todas.filter(p => p.marca===prod.marca);`],
  /* la pantalla vuelve a adivinar los quintales desde el texto de la unidad */
  ["la PANTALLA vuelve a adivinar la equivalencia desde el texto de la unidad",
   `descomponerGratis(gratisNum*equivDe(prod), prod, PRES_PED)`,
   `descomponerGratis(gratisNum*qqDeTam(prod.unidad), prod, PRES_PED)`],
  /* las hermanas también dejan de leer la oferta */
  ["las presentaciones hermanas ignoran el `equiv` de la oferta y vuelven al texto",
   `const equivDe = p => (p && Number(p.equiv)>0) ? Number(p.equiv) : qqDeTam(p && p.unidad);`,
   `const equivDe = p => qqDeTam(p && p.unidad);`],
];

(function () {
  console.log("═══ El desglose de las unidades gratis · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const r = bateria(jsx, true);
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
    try { res = bateria(jsx.replace(dee, a), false); }
    catch (e) { res = { mal:1, fallos:["reventó: " + e.message] }; }
    if (res.mal > 0) {
      ok++;
      console.log(`  ✓ «${nombre}» → la prueba se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
    } else {
      mal++;
      console.log(`  ✗ «${nombre}» → la prueba PASA IGUAL: no está midiendo nada`);
    }
  }

  console.log("Resultado del desglose de gratis: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
