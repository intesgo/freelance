/* PED_FE_002 */
/* ═══════════════════════════════════════════════════════════════════════
   PEDIDOS (Sistema Web) DICE LA VERDAD DE LA CARGA · sistema-web · PedidosWeb

   Qué mide, montando la pantalla de verdad (React en JSDOM, sin ?demo=1 →
   modo vivo), con un doble de Supabase parametrizado por escenario:

   (1) ERROR de conexión/permiso al leer «pedidos» → la pantalla NO se muestra
       como un falso «0 pedidos / Aún no hay pedidos»: sale un aviso claro y un
       botón «Reintentar».
   (2) FIX DEL VACIADO · un pedido SIN líneas SIGUE siendo un pedido y se
       muestra (antes, si venía sin ítems, desaparecía de la lista).
   (3) CONTEOS REALES + «Ver más» DE SERVIDOR · con 150 pedidos y una página de
       100: el número de la pestaña dice el TOTAL real (150, no lo cargado), y
       «Ver más» pide la SIGUIENTE página al servidor y la agrega (aparece un
       pedido que estaba en la página 2 y no en la 1).

   El doble HONRA `.range(desde,hasta)` (para simular la página del servidor) y
   `.in("ped_id", …)` (para las líneas por pedido). La consulta de conteo NO
   lleva range → devuelve el total.

   NACE ROJA a propósito: al final se rompe cada regla en el código fuente, una
   a la vez, y se comprueba que la batería SE CAE.

   NO SE ESCRIBE EN LA BASE DE VERDAD: el `supa` de aquí es un doble.

   Uso: node test_pedidos_carga_web.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

const ESPERADAS = 8;
const MUTANTES_ESPERADOS = 3;
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

/* ── 150 pedidos «esperando_aprobacion» (todos caen en Pendientes), en orden de
      llegada PED-001…PED-150. Con página de 100, «Ver más» trae PED-101…150. ── */
const MUCHOS = [];
for (let i = 1; i <= 150; i++) {
  const n = String(i).padStart(3, "0");
  MUCHOS.push({ ped_id:"PED-"+n, cli_id:"CLI-1", sub_id:"USR-1", prov_cod:"PROV-1", ciudad:"Machala",
    estado:"esperando_aprobacion", estado_comercial:"esperando_aprobacion", estado_logistico:null,
    factura:null, condicion:"credito", creado:"2026-08-"+String((i%28)+1).padStart(2,"0")+"T10:00:00Z",
    es_demo:false, numero_pedido:"N-"+n,
    clientes:{ nombre:"Cliente Uno", razon_social:"Cliente Uno S.A.", tipo:"Jurídica" },
    proveedores:{ nombre:"Piladora Uno" } });
}
const MUCHOS_ITEMS = MUCHOS.map((p, idx) => ({ item_id:"IT-"+idx, ped_id:p.ped_id, prod_id:"P-1", pres_cod:"QQ",
  descripcion:"Arroz Uno", cantidad_qq:10, precio_usd:20, tipo_precio:"P1", gratis_qq:0, condicion:"credito" }));

/* ── Un pedido SIN líneas: debe mostrarse igual. ── */
const UNO_SIN = [{ ped_id:"PED-SIN", cli_id:"CLI-1", sub_id:"USR-1", prov_cod:"PROV-1", ciudad:"Machala",
  estado:"esperando_aprobacion", estado_comercial:"esperando_aprobacion", estado_logistico:null,
  factura:null, condicion:"credito", creado:"2026-08-20T10:00:00Z", es_demo:false, numero_pedido:"N-SIN",
  clientes:{ nombre:"Cliente Solo", razon_social:"Cliente Solo S.A.", tipo:"Jurídica" },
  proveedores:{ nombre:"Piladora Uno" } }];

const CLIENTES_BD = [{ cli_id:"CLI-1", nombre:"Cliente Uno", razon_social:"Cliente Uno S.A.", tipo:"Jurídica",
  ruc:"1790001234001", condicion_pago:"Crédito", cupo:3000, usado:0, bloqueado:false, activo:true,
  sub_id:"USR-1", canal:"Mayorista", estado_cliente:"ACTIVO" }];
const CARTERA_BD = [];
const PROVEEDORES_BD = [{ prov_cod:"PROV-1", nombre:"Piladora Uno", es_demo:false }];
const PRODUCTOS_BD = [{ prod_id:"P-1", nombre:"Arroz Uno", linea:"Arroz", estado:"activo" }];
const OFERTAS_BD = [{ prod_id:"P-1", prov_cod:"PROV-1", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
  costo:9, costo_contado:9, margen_min:0, precio_contado:10, precio_credito:10 }];

function montar(js, opts) {
  opts = opts || {};
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied"; w.XLSX = null;

  const PED = opts.pedidos || [];
  const ITE = opts.items || [];
  function datosDe(t) {
    if (t === "pedidos")            return PED;
    if (t === "pedido_items")       return ITE;
    if (t === "clientes")           return CLIENTES_BD;
    if (t === "cartera_cliente")    return CARTERA_BD;
    if (t === "proveedores")        return PROVEEDORES_BD;
    if (t === "productos")          return PRODUCTOS_BD;
    if (t === "v_ofertas_vigentes") return OFERTAS_BD;
    return [];
  }
  function consulta(tabla, filtros) {
    const resolver = () => {
      if (opts.errPedidos && tabla === "pedidos") return Promise.resolve({ data:null, error:{ message:"sin permiso (prueba)" } });
      let filas = datosDe(tabla).slice();
      let rango = null;
      filtros.forEach(f => {
        if (f[0] === "eq")    filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq")   filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "in")    filas = filas.filter(r => (f[2]||[]).indexOf(r[f[1]]) >= 0);
        if (f[0] === "range") rango = [f[1], f[2]];
      });
      if (rango) filas = filas.slice(rango[0], rango[1] + 1);   // el doble HONRA .range (la página del servidor)
      return Promise.resolve({ data:filas, error:null });
    };
    const con = (t,c,v) => consulta(tabla, filtros.concat([[t,c,v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, is:()=>enc, filter:()=>enc,
      range:(a,b)=>con("range",a,b),
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), in:(c,v)=>con("in",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error||null })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error||null })),
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
        usuario:{ usuario:"richard", nombre:"Richard Ramírez", cargo:"freelance", rol:"Freelance", empresaId:"ORG-001", secciones:[] } })); }); };
    window.__flush = function(){ ReactDOM.flushSync(function(){}); };
    window.__txt = function(){ return (window.__c && window.__c.textContent) || ""; };
    window.__hayBoton = function(sub){ var bs = window.__c.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0) return true; } return false; };
    window.__click = function(sub){ var bs = window.__c.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0){ if(bs[i].disabled) return "disabled"; bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return "ok"; } } return "no-existe"; };
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

  /* ───────── (1) ERROR de conexión → mensaje + «Reintentar» ───────── */
  {
    const m = await montarLista(js, { errPedidos:true, pedidos:[], items:[] });
    const txt = corre(m, `window.__txt()`);
    comprobar("(1) error de conexión: sale el aviso «No se pudieron cargar los pedidos»",
      /No se pudieron cargar los pedidos/.test(txt));
    comprobar("(1) error de conexión: hay botón «Reintentar»",
      corre(m, `window.__hayBoton("Reintentar")`) === true);
    comprobar("(1) error de conexión: NO se muestra el vacío «Aún no hay pedidos»",
      txt.indexOf("Aún no hay pedidos") < 0);
  }

  /* ───────── (2) FIX del vaciado · pedido SIN líneas se muestra ───────── */
  {
    const m = await montarLista(js, { pedidos:UNO_SIN, items:[] });
    const txt = corre(m, `window.__txt()`);
    comprobar("(2) un pedido sin líneas se muestra igual (aparece «N-SIN»)",
      txt.indexOf("N-SIN") >= 0);
  }

  /* ───────── (3) CONTEOS reales + «Ver más» de servidor ───────── */
  {
    const m = await montarLista(js, { pedidos:MUCHOS, items:MUCHOS_ITEMS });
    const txt1 = corre(m, `window.__txt()`);
    comprobar("(3) el conteo de la pestaña es el TOTAL real del servidor (150), no lo cargado (100)",
      txt1.indexOf("(150)") >= 0);
    comprobar("(3) con más en el servidor, sale «Ver más pedidos»",
      corre(m, `window.__hayBoton("Ver más pedidos")`) === true);
    comprobar("(3) antes de «Ver más» un pedido de la página 2 (N-150) NO está cargado",
      txt1.indexOf("N-150") < 0);
    const clic = corre(m, `window.__click("Ver más pedidos")`);
    await esperar(240); corre(m, `window.__flush()`);
    const txt2 = corre(m, `window.__txt()`);
    comprobar("(3) «Ver más» trae la siguiente página del servidor (aparece N-150)" + " (click=" + clic + ")",
      txt2.indexOf("N-150") >= 0);
  }

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la batería tiene que NACER ROJA ══ */
const MUTANTES = [
  /* (2) repone el vaciado por falta de ítems: un pedido sin líneas desaparece. */
  ["repone el vaciado: si no hay ítems, corta la carga (pedido sin líneas desaparece)",
   `setPagServidor(pagina);`,
   `setPagServidor(pagina); if (!it.length) return;`],
  /* (3) el conteo deja de ser el del servidor: cae a lo cargado (100, no 150). */
  ["el conteo deja de ser el real del servidor (setConteosPed(null))",
   `setConteosPed(c);`,
   `setConteosPed(null);`],
  /* (1) el error deja de mostrarse: vuelve el falso «0 pedidos». */
  ["el error de carga deja de mostrarse (no se marca errorPed)",
   `if (!MODO_DEMO_WEB) setErrorPed({ tipo:"conexion", msg:"No se pudieron cargar los pedidos. Revisa tu conexión e inténtalo de nuevo." });`,
   `if (false) setErrorPed({ tipo:"conexion", msg:"No se pudieron cargar los pedidos. Revisa tu conexión e inténtalo de nuevo." });`],
];

(async () => {
  console.log("═══ Pedidos web dice la verdad de la carga · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " + (ok + mal - 1) + ".");
  }

  console.log("  · rompiendo la regla a propósito (la batería debe caerse):");
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
      console.log(`  ✓ «${nombre}» → la batería se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
    } else {
      mal++;
      console.log(`  ✗ «${nombre}» → la batería PASA IGUAL: no está midiendo nada`);
    }
  }

  console.log("Resultado de pedidos-carga-web: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
