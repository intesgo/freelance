/* ═══════════════════════════════════════════════════════════════════════════
   EL REGALO NO PASA DE LO QUE CONCEDE LA PROMOCIÓN
   · Comisionista · socio-comercial · freelance-completo

   Qué se rompía. `pedido_items.gratis_qq` no estaba atado a NINGUNA
   promoción. El tope real era lo que tecleara o calculara la app: si el
   vendedor mandaba 5 qq de regalo donde la promoción daba 2, pasaba, se
   guardaba y esa mercadería salía de bodega sin que nadie la autorizara.

   La decisión del Product Owner (06/08/2026): se BLOQUEA. El pedido no se
   guarda —ni en el teléfono— y se le muestra al vendedor el número exacto que
   sí concede la promoción.

   Lo que mide esta prueba, y por qué así:

   1) Que el número lo dé LA BASE. La app no puede tener su propia fórmula del
      regalo: el mismo hecho calculado en dos lugares termina contradiciéndose
      y el día que se contradiga sale grano regalado. Aquí se comprueba que
      `revisarRegaloDePromo` le pregunta a `gratis_que_concede` y obedece la
      respuesta, sea cual sea.

   2) Que la pregunta viaje EN QUINTALES. Es la trampa que este proyecto ya
      pagó dos veces: la arroba son 0,25 qq y «10 libras» son 0,1 qq, y quien
      lo adivina por el texto de la presentación regala diez veces más grano
      del que la piladora despacha.

   3) Que el mensaje se entienda con el celular en la mano: dice cuánto puso,
      cuánto concede la promoción y qué hacer. Sin nombres de columnas.

   4) Que el pedido NO se guarde: ni la cabecera, ni las líneas.

   NACE ROJA a propósito: al final se rompe la regla en el fuente, una rotura a
   la vez, y se comprueba que la prueba SE CAE. Hay DOS roturas TONTAS y
   directas (sumar 1 al tope que da la base, sumar 1 al regalo que se compara)
   además de las semánticas: una rotura "inteligente" puede quedar
   neutralizada por los datos de prueba y hacer creer que la prueba no mide,
   cuando el malo es el mutante.

   Uso: node test_regalo_promo.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una prueba que se borra sin querer no pase inadvertida. ── */
const ESPERADAS = 22;
const MUTANTES_ESPERADOS = 8;

/* ══ La base de prueba: lo que responde `gratis_que_concede` por producto ══
   null = no hay promoción vigente · número = quintales que concede.
   Los valores son los que devolvería la base para las cantidades de abajo. */
const RESPUESTAS = {
  "P-00197": 2,      /* «compra 100 lleva 2» sobre 100 qq */
  "P-00056": 3,      /* 100 arrobas = 25 qq → concede 3 qq */
  "P-00311": 2,      /* 200 × «10 libras» = 20 qq → concede 2 qq */
  "P-SINPRO": null,  /* sin promoción, o vencida, o inactiva: la base dice null */
};

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

/* Un ítem del carrito, con la forma con la que lo arma `construirItem` */
const item = (o) => ({
  prod: { prodId:o.prodId, presCod:o.presCod, equiv:o.equiv, nombre:o.nombre },
  prodNombre: o.nombre, tipo: o.tipo || "P4", cant: o.cant, gratis: o.gratis,
});

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

  /* La base falsa: anota cada pregunta y contesta lo de RESPUESTAS. Así se
     puede mirar QUÉ se preguntó, que es la mitad de lo que importa. */
  const enchufarBase = () => corre(`
    globalThis.__llamadas = [];
    window.SB = { rpc: async function(fn, args){
      globalThis.__llamadas.push({ fn: fn, args: args });
      var R = ${JSON.stringify(RESPUESTAS)};
      var v = Object.prototype.hasOwnProperty.call(R, args.p_prod_id) ? R[args.p_prod_id] : null;
      return { data: v, error: null };
    }};`);

  /* Corre la revisión de verdad de la app y devuelve {aviso, llamadas} */
  const revisar = async (items, prov) => {
    enchufarBase();
    let aviso;
    try {
      aviso = await corre(`revisarRegaloDePromo(${JSON.stringify(items)}, ${JSON.stringify(prov||null)})`);
    } catch (e) { aviso = "reventó: " + e.message; }
    return { aviso, llamadas: plano(corre("globalThis.__llamadas")) };
  };

  const QQ = { prodId:"P-00197", presCod:"QQ", equiv:1, nombre:"Arroz Crecedor · Quintal" };

  /* ── 1..4 · el exceso se bloquea y el mensaje dice el número ── */
  const exceso = await revisar([ item({ ...QQ, cant:100, gratis:5 }) ], "AGU");
  const av = String(exceso.aviso || "");
  comprobar("regalo de más (5 qq donde la promo da 2): el pedido se BLOQUEA",
    !!exceso.aviso);
  comprobar("y el aviso dice el número exacto que SÍ concede la promoción: 2",
    /(^|[^\d])2([^\d]|$)/.test(av));
  comprobar("y dice también lo que el vendedor puso: 5",
    /(^|[^\d])5([^\d]|$)/.test(av));
  comprobar("y está escrito para un vendedor, no para un programador (sin nombres de columnas ni jerga)",
    av.length > 0 && !/gratis_qq|pedido_items|null|undefined|rpc|p_prod_id|NaN/i.test(av));

  /* ── 5..6 · justo en el tope y por debajo: pasa ── */
  const justo = await revisar([ item({ ...QQ, cant:100, gratis:2 }) ], "AGU");
  const menos = await revisar([ item({ ...QQ, cant:100, gratis:1 }) ], "AGU");
  comprobar("justo lo que concede (2 y 2): pasa sin molestar",
    justo.aviso === null);
  comprobar("menos de lo que concede (1 de 2): pasa",
    menos.aviso === null);

  /* ── 7 · sin promoción vigente (vencida, inactiva o inexistente) ── */
  const sinPromo = await revisar([ item({ prodId:"P-SINPRO", presCod:"QQ", equiv:1,
    nombre:"Arroz sin promoción · Quintal", cant:100, gratis:1 }) ], "AGU");
  comprobar("producto sin promoción vigente (o vencida, o inactiva): no se puede regalar nada y se dice así",
    !!sinPromo.aviso && /no tiene promoci/i.test(String(sinPromo.aviso)));

  /* ── 8..10 · lo que NO se toca ── */
  const p3 = await revisar([ item({ ...QQ, cant:100, gratis:5, tipo:"P3" }) ], "AGU");
  comprobar("P3 «Promoción vendedor» no se bloquea ni se pregunta: ese regalo lo paga él con su comisión",
    p3.aviso === null && p3.llamadas.length === 0);
  const sinRegalo = await revisar([ item({ ...QQ, cant:100, gratis:0 }) ], "AGU");
  comprobar("línea sin regalo: ni se le pregunta a la base",
    sinRegalo.aviso === null && sinRegalo.llamadas.length === 0);
  corre(`window.SB = { auth:{} };`);   /* hay sesión pero no se puede llamar: sin señal */
  let sinSenal;
  try { sinSenal = await corre(`revisarRegaloDePromo(${JSON.stringify([item({...QQ, cant:100, gratis:5})])}, "AGU")`); }
  catch (e) { sinSenal = "reventó: " + e.message; }
  comprobar("sin señal para preguntar: la app no inventa un tope ni bloquea a ciegas (manda el cerrojo de la base)",
    sinSenal === null);

  /* ── 11..14 · LA PRESENTACIÓN, que ya engañó antes ── */
  const arroba = await revisar([ item({ prodId:"P-00056", presCod:"ARR", equiv:0.25,
    nombre:"Arroz Rosa Elvira · Arroba", cant:100, gratis:12 }) ], "AGU");
  const pregArr = arroba.llamadas[0] || {args:{}};
  comprobar("ARROBAS: por 100 arrobas se le pregunta a la base por 25 qq, no por 100",
    Number(pregArr.args.p_cantidad_qq) === 25);
  comprobar("ARROBAS: 12 arrobas de regalo son 3 qq, así que con 3 concedidos NO se bloquea",
    arroba.aviso === null);
  const libras = await revisar([ item({ prodId:"P-00311", presCod:"L10", equiv:0.1,
    nombre:"Arroz Gustadina · 10 libras", cant:200, gratis:20 }) ], "AGU");
  const pregL10 = libras.llamadas[0] || {args:{}};
  comprobar("«10 libras» (0,1 qq): por 200 unidades se pregunta por 20 qq, NO por 200",
    Number(pregL10.args.p_cantidad_qq) === 20);
  comprobar("«10 libras»: 20 unidades de regalo son 2 qq, así que con 2 concedidos NO se bloquea",
    libras.aviso === null);

  /* ── 15..16 · qué más viaja en la pregunta ── */
  const preg = exceso.llamadas[0] || {args:{}};
  comprobar("en la pregunta viajan la piladora y la presentación: sin eso, una promo de otra piladora concedería de más",
    preg.args.p_prov_cod === "AGU" && preg.args.p_pres_cod === "QQ" && preg.args.p_prod_id === "P-00197");
  const demo = await revisar([ item({ prodId:null, presCod:null, equiv:1,
    nombre:"Producto de demostración", cant:100, gratis:5 }) ], "AGU");
  comprobar("producto de DEMOSTRACIÓN (sin código real): no se pregunta ni se bloquea, nunca llega a la base",
    demo.aviso === null && demo.llamadas.length === 0);

  /* ── 17..19 · el pedido no se guarda ── */
  corre(`
    globalThis.__inserts = [];
    window.SB = {
      auth: { getSession: async () => ({ data:{ session:{ user:{ id:"U1" } } } }) },
      rpc: async function(fn, args){
        var R = ${JSON.stringify(RESPUESTAS)};
        var v = Object.prototype.hasOwnProperty.call(R, args.p_prod_id) ? R[args.p_prod_id] : null;
        return { data: v, error: null };
      },
      from: function(tabla){
        var api = {
          select: function(){ return api; }, like: function(){ return api; },
          eq: function(){ return api; }, order: function(){ return api; },
          limit: async function(){ return { data: [] }; },
          insert: async function(filas){ globalThis.__inserts.push(tabla); return { error:null }; },
          delete: function(){ return { eq: async function(){ return { error:null }; } }; }
        };
        return api;
      }
    };
    CLI_ID_DE["Comercial Mendoza"] = "CL-0001";
  `);
  let guardado;
  try {
    guardado = plano(await corre(`guardarPedidoEnBase({ cli:{nombre:"Comercial Mendoza"}, prov:{id:"AGU"},
      carrito:${JSON.stringify([ item({ ...QQ, cant:100, gratis:5 }) ])}, ubic:null, retiro:true })`));
  } catch (e) { guardado = { ok:null, motivo:"reventó: " + e.message }; }
  const insertados = plano(corre("globalThis.__inserts"));
  comprobar("guardarPedidoEnBase con regalo de más devuelve ok:false con el aviso del vendedor",
    guardado.ok === false && /regalo/i.test(String(guardado.motivo||"")));
  comprobar("y NO nace la cabecera del pedido en `pedidos`",
    !insertados.includes("pedidos"));
  comprobar("y NO nace ni una línea en `pedido_items`",
    !insertados.includes("pedido_items"));

  /* ── 20..22 · dónde vive la regla y quién la llama (se lee del fuente) ── */
  comprobar("el tope se le PREGUNTA a la base (`gratis_que_concede`), no lo calcula la app por su cuenta",
    /rpc\(\s*["']gratis_que_concede["']/.test(fuenteJsx));
  comprobar("`guardarPedidoEnBase` revisa el regalo ANTES de escribir en la base",
    /await revisarRegaloDePromo\(items,[\s\S]{0,80}\n\s*if\(avisoRegalo\) return \{ ok:false/.test(fuenteJsx));
  comprobar("y el botón de guardar también lo revisa: el pedido no queda ni en el teléfono",
    (fuenteJsx.split("await revisarRegaloDePromo(").length - 1) >= 2);

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  /* tontas y directas: si estas no tumban la prueba, la prueba no mide nada */
  ["TONTA · le suma 1 al tope que devuelve la base",
   `    return (data===null || data===undefined) ? null : Number(data);`,
   `    return (data===null || data===undefined) ? null : Number(data)+1;`],
  ["TONTA · le suma 1 al regalo que se compara",
   `    const regaloQq = r2((Number(it.gratis)||0)*eq);`,
   `    const regaloQq = r2((Number(it.gratis)||0)*eq)+1;`],
  /* la trampa de las presentaciones, las dos caras */
  ["pregunta la cantidad en unidades de la presentación en vez de en quintales",
   `      provId: provId, cantidadQq: cantQq });`,
   `      provId: provId, cantidadQq: Number(it.cant)||0 });`],
  ["deja de usar el `equiv` de la oferta: todo vale 1 qq",
   `    const eq = Number(it.prod.equiv)>0 ? Number(it.prod.equiv) : 1;`,
   `    const eq = 1;`],
  /* el cerrojo deja de cerrar */
  ["un producto SIN promoción vigente deja de bloquearse",
   `    if(tope === null)`,
   `    if(false)`],
  ["el regalo de más deja de bloquearse",
   `    if(regaloQq > tope + 0.005)`,
   `    if(false)`],
  ["P3 deja de estar exento y se bloquea al vendedor su propia promoción",
   `    if(it.tipo === "P3") continue;`,
   `    if(false) continue;`],
  ["el pedido se guarda igual aunque haya aviso",
   `    if(avisoRegalo) return { ok:false, motivo:avisoRegalo, regalo:true };`,
   `    if(false) return { ok:false, motivo:avisoRegalo, regalo:true };`],
];

(async function () {
  console.log("═══ El regalo no pasa de lo que concede la promoción · " + nombreApp);
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

  console.log("Resultado del regalo de la promoción: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
