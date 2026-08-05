/* ═══════════════════════════════════════════════════════════════════════
   EL CATÁLOGO SALE DE LAS OFERTAS, YA NO DE `precios` · Comisionista

   Qué se rompía: el sistema web dejó de escribir en `precios`. Un producto
   creado hoy nace con sus ofertas en `ofertas_piladora` y CERO filas en
   `precios`. La app del vendedor leía `precios`, así que ese producto no
   existía en el celular. Medido contra producción el 05/08/2026:
   59 productos activos · 58 con fila en `precios` · el que faltaba era
   P-00197 «Arroz Crecedor», con 2 ofertas activas y sin marca.

   Lo que fija esta prueba:
     · un producto con oferta y SIN fila en `precios` aparece igual;
     · el mismo producto NO se duplica aunque tenga varias presentaciones
       y varias piladoras;
     · el precio se lleva a quintales (precio ÷ equiv_qq) y se ofrece el
       más barato, que es el "desde" que el vendedor puede sostener;
     · lo vencido, lo inactivo y lo que aún no rige NO se ofrecen;
     · un producto dado de baja no se ofrece aunque tenga oferta;
     · un producto SIN MARCA sale con su nombre, nunca en blanco;
     · el buscador encuentra por nombre del producto y por piladora, y el
       texto de ayuda dice la verdad;
     · si la base contesta con error, supabase-js lo devuelve en `.error`
       (no lo lanza): la app cae a la demostración y no se rompe.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente,
   una rotura a la vez, y se comprueba que la prueba SE CAE. Si un mutante
   pasa entero, esta prueba no está midiendo nada y lo dice a gritos.

   Uso: node test_catalogo_ofertas.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const react = R.reactDev(), reactDom = R.reactDomDev();

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una prueba que se borra sin querer no pase inadvertida. ── */
const ESPERADAS = 24;
const MUTANTES_ESPERADOS = 8;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 200));
const dia = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const HOY = dia(0), AYER = dia(-1), MANANA = dia(1);

/* ══ La base de prueba, con la forma de producción ══ */
const CLIENTES_BD = [
  { cli_id:"CLI-A", nombre:"ROCELUMA CIA LTDA", razon_social:"ROCELUMA CIA LTDA", ruc:"19347672001",
    tel:"967897120", tel2:null, plazo:30, condicion_pago:"Crédito", activo:true },
];
const UBIC_BD = [{ cli_id:"CLI-A", ciudad:"Cuenca", direccion:"Mariscal Lamar 2-59", principal:true }];

const PRODUCTOS_BD = [
  { prod_id:"P-00001", nombre:"Arrocillo Envejecido", marca:"Arrocillo Envejecido",
    linea:"Arroz", proveedor:"POR ASIGNAR", estado:"activo" },
  /* el huérfano de verdad: sin marca y sin una sola fila en `precios` */
  { prod_id:"P-00197", nombre:"Arroz Crecedor", marca:null,
    linea:"Arroz", proveedor:null, estado:"activo" },
  /* dado de baja: aunque tenga oferta, no se vende */
  { prod_id:"P-BAJA", nombre:"Arroz Retirado", marca:"Retirado",
    linea:"Arroz", proveedor:"POR ASIGNAR", estado:"inactivo" },
];

const OFERTAS_BD = [
  /* Arrocillo: dos presentaciones × dos piladoras = 4 filas, un solo producto.
     La arroba de $4,75 con equiv 0,25 es exactamente $19 el quintal. */
  { prod_id:"P-00001", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"AGU", precio_contado:19.00, precio_credito:20.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"ARR", presentacion:"Arroba",  equiv_qq:0.25, prov_cod:"AGU", precio_contado:4.75,  precio_credito:5.00,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"COR", precio_contado:19.00, precio_credito:20.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"ARR", presentacion:"Arroba",  equiv_qq:0.25, prov_cod:"COR", precio_contado:4.75,  precio_credito:5.00,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* tres trampas baratas: si alguna entra, el precio se desploma y se nota */
  { prod_id:"P-00001", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", precio_contado:1.00, precio_credito:1.00, activo:true,  vigente_desde:"2026-01-01", vigente_hasta:AYER },
  { prod_id:"P-00001", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", precio_contado:2.00, precio_credito:2.00, activo:false, vigente_desde:AYER,         vigente_hasta:null },
  { prod_id:"P-00001", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", precio_contado:3.00, precio_credito:3.00, activo:true,  vigente_desde:MANANA,       vigente_hasta:null },
  /* Arroz Crecedor: una sola piladora, dos presentaciones. CERO filas en `precios`. */
  { prod_id:"P-00197", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"AGU", precio_contado:37.00, precio_credito:38.00, activo:true, vigente_desde:HOY, vigente_hasta:null },
  { prod_id:"P-00197", pres_cod:"ARR", presentacion:"Arroba",  equiv_qq:0.25, prov_cod:"AGU", precio_contado:9.25,  precio_credito:9.50,  activo:true, vigente_desde:HOY, vigente_hasta:null },
  /* el dado de baja sí tiene oferta viva: lo que lo saca es el producto */
  { prod_id:"P-BAJA", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"AGU", precio_contado:10.00, precio_credito:10.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
];

const PROVEEDORES_BD = [
  { prov_cod:"AGU", nombre:"Piladora San Agustín" },
  { prov_cod:"COR", nombre:"Piladora Cordero" },
];
const ORG_BD = [{ nombre:"Richard Ramírez Salazar", ruc:"0919927533001", tel:"0997521936", correo:"intesgo@gmail.com" }];

/* `precios` VACÍA: es el estado real de un producto nuevo del sistema web.
   Si la app volviera a depender de ella, aquí no habría catálogo. */
const PRECIOS_BD = [];

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
  const datosDe = (t) => {
    if (t === "clientes")            return CLIENTES_BD;
    if (t === "ubicaciones_cliente") return UBIC_BD;
    if (t === "productos")           return PRODUCTOS_BD;
    if (t === "ofertas_piladora")    return OFERTAS_BD;
    if (t === "v_ofertas_vigentes")  return OFERTAS_BD.filter(o => o.activo && !o.vigente_hasta && o.vigente_desde <= HOY);
    if (t === "proveedores")         return PROVEEDORES_BD;
    if (t === "organizaciones")      return ORG_BD;
    if (t === "precios")             return PRECIOS_BD;
    if (t === "usuarios")            return [{ usr_id:"SC1", nombre:"Carlos Andrade", rol:"comisionista", activo:true }];
    return [];
  };
  /* supabase-js NO lanza cuando la base falla: devuelve el fallo en `.error`
     y `data` en null. Por eso se simula así y no con un throw. */
  const q = (t) => {
    const rota = op.tablaRota === t;
    const filas = rota ? null : datosDe(t);
    const err   = rota ? { message:"permission denied for table " + t, code:"42501" } : null;
    const p = Promise.resolve({ data: filas, error: err, count:0 });
    ["select","eq","neq","in","order","limit","like","not","is","gte","lte","or"].forEach(m => { p[m] = () => q(t); });
    p.maybeSingle = () => Promise.resolve({ data: (filas || [])[0] || null, error: err }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error:null }); p.upsert = () => Promise.resolve({ error:null });
    p.update = () => { const r = Promise.resolve({ error:null }); r.eq = () => r; return r; };
    p.delete = () => { const r = Promise.resolve({ error:null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: {
      getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"carlos@ejemplo.com" } } } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => { pedidas.push(t); return q(t); },
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
      ReactDOM.createRoot(window.__cont).render(React.createElement(Cotizacion, { toast: function(){} }));
    });
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__ayudas = function(){
      var ins = window.__cont.querySelectorAll("input"), r = [];
      for (var i=0;i<ins.length;i++) r.push(ins[i].placeholder || "");
      return r.join(" ｜ ");
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
const txt   = (m) => vm.runInContext("window.__txt()", m.ctx);
const ayudas= (m) => vm.runInContext("window.__ayudas()", m.ctx);
const buscar= (m, k, v) => vm.runInContext(`window.__escribir(${JSON.stringify(k)}, ${JSON.stringify(v)})`, m.ctx);

/* ══ La batería. Se corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ── 1) La carga, mirada por dentro ── */
  const m = montar(js);
  let base = null, reventó = false;
  try { base = await vm.runInContext("cargarBaseCotiza()", m.ctx); }
  catch (e) { reventó = true; }
  const prods = (base && base.productos) ? Array.from(base.productos) : [];
  const buscarProd = (n) => prods.find(p => (p.nombre||"") === n) || null;
  const arrocillo = buscarProd("Arrocillo Envejecido");
  const crecedor  = buscarProd("Arroz Crecedor");

  comprobar("la lista trae los 2 productos activos con oferta vigente", prods.length === 2);
  comprobar("«Arroz Crecedor» aparece aunque no tiene NI UNA fila en `precios`", !!crecedor);
  const ids = prods.map(p => p.id);
  comprobar("no se duplica: cada producto aparece una sola vez",
    new Set(ids).size === ids.length && ids.length > 0);
  comprobar("«Arrocillo Envejecido» sale UNA vez pese a sus 4 ofertas vigentes",
    prods.filter(p => p.nombre === "Arrocillo Envejecido").length === 1);
  comprobar("el producto SIN MARCA sale con su nombre, nunca en blanco",
    !!crecedor && crecedor.nombre === "Arroz Crecedor");
  comprobar("Arrocillo: $19,00 el quintal de contado (la arroba se convierte)",
    !!arrocillo && arrocillo.contado === 19);
  comprobar("Arrocillo: $20,00 el quintal a crédito",
    !!arrocillo && arrocillo.credito === 20);
  comprobar("Crecedor: $37,00 el quintal de contado",
    !!crecedor && crecedor.contado === 37);
  comprobar("Crecedor: $38,00 el quintal a crédito",
    !!crecedor && crecedor.credito === 38);
  comprobar("la oferta VENCIDA no se ofrece (nadie queda en $1)",
    prods.every(p => p.contado !== 1));
  comprobar("la oferta INACTIVA no se ofrece (nadie queda en $2)",
    prods.every(p => p.contado !== 2));
  comprobar("la oferta que aún NO rige no se ofrece (nadie queda en $3)",
    prods.every(p => p.contado !== 3));
  comprobar("el producto dado de baja no se ofrece aunque tenga oferta viva",
    !prods.some(p => p.id === "P-BAJA" || (p.nombre||"").indexOf("Retirado") >= 0));
  comprobar("Arrocillo dice «2 piladoras lo tienen», no escoge una al azar",
    !!arrocillo && /2 piladoras lo tienen/.test(arrocillo.piladora || ""));
  comprobar("Crecedor nombra a su única piladora",
    !!crecedor && crecedor.piladora === "Piladora San Agustín");
  comprobar("la carga consulta `ofertas_piladora`", m.pedidas.indexOf("ofertas_piladora") >= 0);
  comprobar("la carga YA NO consulta la tabla `precios`", m.pedidas.indexOf("precios") < 0);
  comprobar("la lista viene VIVA aunque `precios` esté vacía",
    !!base && base.viva === true && !reventó);

  /* ── 2) La pantalla ── */
  pintar(m);
  await esperar(300);
  buscar(m, "producto", "crecedor");
  await esperar(200);
  comprobar("en pantalla: se encuentra por NOMBRE del producto («crecedor»)",
    /Arroz Crecedor/.test(txt(m)));

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
    /Ningún producto coincide/.test(txt(m)));

  /* ── 3) La base contesta con error: viene en `.error`, no lanzado ── */
  const r = montar(js, { tablaRota:"ofertas_piladora" });
  let baseRota = "no-corrió", tumbó = false;
  try { baseRota = await vm.runInContext("cargarBaseCotiza()", r.ctx); }
  catch (e) { tumbó = true; }
  comprobar("con error de la base (en `.error`, no lanzado) la carga no revienta",
    !tumbó && baseRota === null);
  pintar(r);
  await esperar(300);
  comprobar("y la pantalla queda de pie con la demostración", /Demostración/.test(txt(r)));

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  ["vuelve a leer la tabla `precios`",
    `window.SB.from("ofertas_piladora")`, `window.SB.from("precios")`],
  ["se le olvida mirar si la oferta sigue activa",
    `o.activo !== false &&`, `true &&`],
  ["se le olvida la fecha en que la oferta deja de regir",
    `(!o.vigente_hasta || String(o.vigente_hasta).slice(0,10) >  hoyISO)`, `true`],
  ["no agrupa: una línea por cada oferta",
    `const g = porProd[o.prod_id] || (porProd[o.prod_id] = { contado:c, credito:k, provs:new Set() });`,
    `const g = (porProd[o.prod_id+"|"+o.pres_cod+"|"+o.prov_cod] = { contado:c, credito:k, provs:new Set() });`],
  ["el producto sin marca se queda en blanco",
    `return { id, nombre: d.nombre || d.marca || id,`, `return { id, nombre: d.marca || "",`],
  ["el buscador deja de mirar el nombre del producto",
    `(p.nombre||"").toLowerCase().includes(t)`, `false`],
  ["el buscador deja de mirar la piladora",
    `((p.piladoras||p.piladora||"")).toLowerCase().includes(t)`, `false`],
  ["se pierden los nombres de las piladoras cuando son varias",
    `linea:d.linea || "", piladora, piladoras:suyas.join(" "),`,
    `linea:d.linea || "", piladora,`],
];

(async () => {
  console.log("═══ Catálogo desde las ofertas · " + nombreApp);
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

  console.log("Resultado del catálogo: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
