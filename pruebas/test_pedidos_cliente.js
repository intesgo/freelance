/* ═══════════════════════════════════════════════════════════════════════
   CADA PEDIDO, A NOMBRE DE SU CLIENTE · sistema-web (módulo Pedidos)

   Qué mide: la lista de Pedidos. La columna Cliente tiene que salir del
   pedido —del cruce en vivo por `cli_id`— y NO de la posición de la fila.

   El defecto (b138): dentro de PedidosWeb, el efecto que carga el maestro de
   clientes, justo después de `setClientesReales(reales)`, recorría los pedidos
   con su ÍNDICE y le pegaba a cada fila el nombre de `reales[i]`. Nació para
   adornar los pedidos de demostración con los primeros clientes del maestro,
   pero pisaba también los reales. PD-0011 (de CLI-036, Supermercado Castillo /
   Pedro Rodrigo Castillo Rosero) terminaba a nombre de «ABAD MENDIETA CIA.
   LTDA.», el primer cliente del maestro en orden alfabético. Qué nombre ganaba
   dependía de cuál de las dos cargas llegaba última: una lotería sobre quién
   es el dueño del pedido, la comisión y la cartera.

   EL ORDEN DE LLEGADA ES LA MITAD DE LA PRUEBA: el doble responde la consulta
   de `clientes` (el maestro) CON DEMORA, para que llegue DESPUÉS de los
   pedidos. Sin esa demora el mutante que repone el defecto no tumba la prueba
   y el arnés no mide nada.

   Los datos están armados para que la trampa se note: los DOS PRIMEROS
   clientes del maestro en orden alfabético (Abad Mendieta y Alba Donoso) NO
   son de ningún pedido. Si el nombre saliera de la posición, aparecerían
   ellos; si sale del pedido, no aparecen jamás.

   NO SE ESCRIBE EN LA BASE DE VERDAD: el `supa` de aquí es un doble que
   devuelve datos con la forma de producción y anota lo que se le mande.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Hay una rotura TONTA
   (sumar 1 a la cantidad) además de las semánticas.

   Uso: node test_pedidos_cliente.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una que se borre sin querer no pase inadvertida. ── */
const ESPERADAS = 10;
const MUTANTES_ESPERADOS = 4;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 60));
const cuenta  = (s, sub) => s.split(sub).length - 1;

/* ══ La base de prueba, con la forma exacta de producción (snake_case) ══

   El MAESTRO de clientes en orden alfabético. Los dos primeros NO son de
   ningún pedido: son la trampa para el defecto por posición. */
const CLIENTES_BD = [
  { cli_id:"CLI-001", nombre:"Abad Mendieta",          razon_social:"ABAD MENDIETA CIA. LTDA.",
    tipo:"Jurídica", ruc:"1790000001001", condicion_pago:"Crédito", cupo:10000, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-1", estado_cliente:"ACTIVO" },
  { cli_id:"CLI-002", nombre:"Alba Donoso",            razon_social:"Alba Donoso",
    tipo:"Natural",  ruc:"1710000002001", condicion_pago:"Contado", cupo:0, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-1", estado_cliente:"ACTIVO" },
  { cli_id:"CLI-036", nombre:"Supermercado Castillo",  razon_social:"Pedro Rodrigo Castillo Rosero",
    tipo:"Natural",  ruc:"1712345678001", condicion_pago:"Contado", cupo:30000, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-7", estado_cliente:"ACTIVO" },
  { cli_id:"CLI-D1", nombre:"Tienda Demo El Ensayo",   razon_social:"Tienda Demo El Ensayo S.A.",
    tipo:"Jurídica", ruc:"1790000099001", condicion_pago:"Crédito", cupo:5000, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-7", estado_cliente:"ACTIVO", es_demo:true },
];

/* Los PEDIDOS, con el cliente ANIDADO (como en producción). En orden de
   `creado` descendente: PD-0011 (04/08) primero, PED-D1 (24/07) después.
   PD-0011 · CLI-036 · natural · contado · esperando aprobación · TRES líneas
     (el caso obligatorio de P0-2: 3 productos → 1 cabecera, editable, no demo).
   PED-D1  · CLI-D1  · demo    · crédito · ingresado · DOS líneas, mismo cliente. */
const PEDIDOS_BD = [
  { ped_id:"PD-0011", cli_id:"CLI-036", sub_id:"USR-7", prov_cod:"PROV-1", ciudad:"Quito",
    estado:"esperando_aprobacion", estado_comercial:"esperando_aprobacion", estado_logistico:null, factura:null,
    condicion:"contado", creado:"2026-08-04T10:00:00", es_demo:false,
    clientes:{ nombre:"Supermercado Castillo", razon_social:"Pedro Rodrigo Castillo Rosero", tipo:"Natural" },
    proveedores:{ nombre:"Piladora Uno" } },
  { ped_id:"PED-D1", cli_id:"CLI-D1", sub_id:"USR-7", prov_cod:"PROV-2", ciudad:"Guayaquil",
    estado:"ingresado", estado_comercial:"ingresado", estado_logistico:null, factura:null,
    condicion:"credito", creado:"2026-07-24T10:00:00", es_demo:true,
    clientes:{ nombre:"Tienda Demo El Ensayo", razon_social:"Tienda Demo El Ensayo S.A.", tipo:"Jurídica" },
    proveedores:{ nombre:"Piladora Dos" } },
];

/* PD-0011 tiene TRES líneas (250·20,5 + 100·20 + 50·15 = 400 qq · $7.875,00). */
const PEDIDO_ITEMS_BD = [
  { item_id:"IT-1", ped_id:"PD-0011", prod_id:"P-ARROCILLO", descripcion:"Arrocillo Especial · qq",
    cantidad_qq:250, precio_usd:20.5, tipo_precio:"P2", gratis_qq:0 },
  { item_id:"IT-1b", ped_id:"PD-0011", prod_id:"P-FLOR", descripcion:"Arroz Flor · qq",
    cantidad_qq:100, precio_usd:20, tipo_precio:"P2", gratis_qq:0 },
  { item_id:"IT-1c", ped_id:"PD-0011", prod_id:"P-VITALOTA", descripcion:"Arroz Vitalota · qq",
    cantidad_qq:50, precio_usd:15, tipo_precio:"P2", gratis_qq:0 },
  { item_id:"IT-2", ped_id:"PED-D1",  prod_id:"P-CAPIRONA", descripcion:"Arroz Super Capirona · qq",
    cantidad_qq:10, precio_usd:40, tipo_precio:"P2", gratis_qq:0 },
  { item_id:"IT-3", ped_id:"PED-D1",  prod_id:"P-CHIFA", descripcion:"Arroz Chifa Economico · qq",
    cantidad_qq:5, precio_usd:22.5, tipo_precio:"P2", gratis_qq:0 },
];

function datosDe(t) {
  if (t === "clientes")      return CLIENTES_BD;
  if (t === "pedidos")       return PEDIDOS_BD;
  if (t === "pedido_items")  return PEDIDO_ITEMS_BD;
  return [];   // productos, ofertas, proveedores, presentaciones… → vacío (demo local)
}

/* ══ El doble de Supabase. La consulta de `clientes` (el maestro) responde con
      DEMORA (140 ms) para que llegue DESPUÉS de los pedidos: así el mutante que
      repone el defecto por posición alcanza a pisar los nombres buenos. ══ */
function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.XLSX = null;

  const escrituras = [];

  function consulta(tabla, filtros) {
    const DEMORA = (tabla === "clientes") ? 140 : 0;   // el maestro llega tarde, a propósito
    const resolver = () => {
      let filas = datosDe(tabla).slice();
      filtros.forEach(f => {
        if (f[0] === "eq")  filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq") filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "in")  filas = filas.filter(r => (f[2]||[]).indexOf(r[f[1]]) >= 0);
      });
      return new Promise(res => setTimeout(() => res({ data:filas, error:null }), DEMORA));
    };
    const con = (t,c,v) => consulta(tabla, filtros.concat([[t,c,v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, is:()=>enc, range:()=>enc, filter:()=>enc,
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), in:(c,v)=>con("in",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      insert:(x)=>{ escrituras.push({ op:"insert", tabla, filas:Array.isArray(x)?x:[x] }); return Promise.resolve({ error:null }); },
      upsert:(x)=>{ escrituras.push({ op:"upsert", tabla, filas:Array.isArray(x)?x:[x] }); return Promise.resolve({ error:null }); },
      update:(x)=>{ const r = Promise.resolve({ error:null });
                    r.eq = (c,v) => { escrituras.push({ op:"update", tabla, filas:[x], donde:[c,v] });
                                      return Promise.resolve({ error:null }); };
                    return r; },
      delete:()=>({ eq:(c,v)=>{ escrituras.push({ op:"delete", tabla, donde:[c,v] });
                                return Promise.resolve({ error:null }); } }),
    };
    return enc;
  }
  w.supa = {
    auth: { getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } }),
            onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
            getUser: async () => ({ data:{ user:{ id:"u1" } } }), signOut: async () => ({}) },
    from: (t) => consulta(t, []),
    rpc: async () => ({ data:null }),
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx);
  vm.runInContext(R.reactDomDev(), ctx);
  vm.runInContext(js, ctx);

  vm.runInContext(`
    window.__texto = function(){ return (window.__c && window.__c.textContent) || ""; };
    /* PED_P0_2_AGRUPAR_WEB · helpers del acordeón: contar cabeceras y botones editar,
       desplegar una cabecera por su texto, y leer el detalle desplegado. */
    window.__nCab = function(){ return window.__c.querySelectorAll(".ped-cabecera").length; };
    window.__nEditar = function(){ return window.__c.querySelectorAll('button[title="Editar pedido"]').length; };
    window.__clickCab = function(sub){
      var cs = window.__c.querySelectorAll(".ped-cabecera");
      for (var i=0;i<cs.length;i++){ if ((cs[i].textContent||"").indexOf(sub) >= 0){
        cs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } }
      return false;
    };
    /* PED_NUMERO_Y_MODAL · el detalle ya no vive en un acordeón inline sino en el modal
       de solo lectura (role="dialog"): se lee su texto tras hacer clic en la fila. */
    window.__detalleTxt = function(){
      var ds = document.querySelectorAll('[role="dialog"]'); var t = "";
      for (var i=0;i<ds.length;i++) t += (ds[i].textContent||"") + " | ";
      return t;
    };
    window.__pintar = function(){
      window.__c = document.createElement("div");
      document.body.appendChild(window.__c);
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__c).render(React.createElement(PedidosWeb, {
          usuario: { usuario:"richard", nombre:"Richard Ramírez", cargo:"freelance",
                     rol:"Freelance", empresaId:"ORG-001", secciones:[] } }));
      });
    };
  `, ctx);
  return { ctx, w, escrituras };
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* ══ La batería. Corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  const m = montar(js);
  corre(m, `window.__pintar()`);
  await esperar(320);                       // pasada la demora del maestro (140 ms) y ya asentado
  corre(m, `ReactDOM.flushSync(function(){})`);
  const txt = corre(m, `window.__texto()`);
  const bajo = txt.toLowerCase();
  const nCab = corre(m, `window.__nCab()`);
  const nEditar = corre(m, `window.__nEditar()`);

  /* 1 · PED_P0_2_AGRUPAR_WEB · UNA cabecera por pedido: 2 pedidos → 2 cabeceras
     (NO 5 renglones, uno por producto). */
  comprobar("hay una cabecera por pedido: 2 cabeceras (no 5 renglones por producto)",
    nCab === 2);

  /* 2 · el contador cuenta PEDIDOS, no productos: «2 pedidos · 1 por revisar»
     (PD-0011 espera aprobación; el demo está ingresado). */
  comprobar("el contador dice «2 pedidos» y «1 por revisar» (cuenta pedidos, no productos)",
    txt.indexOf("2 pedidos") >= 0 && txt.indexOf("1 por revisar") >= 0);

  /* 3 · UN solo botón editar (el pedido editable no-demo); el demo no ofrece editar */
  comprobar("hay un solo botón editar (1 pedido editable no-demo)",
    nEditar === 1);

  /* 4 · con el modal cerrado, los productos de PD-0011 NO se ven en la lista (la columna es
     el número de pedido, no la guía de productos) */
  comprobar("con el modal cerrado, «Arroz Vitalota» NO aparece en la lista (la columna es el número)",
    txt.indexOf("Arroz Vitalota") < 0);

  /* 5 · al hacer clic en la fila de PD-0011 se abre el modal con sus TRES líneas */
  corre(m, `window.__clickCab("PEDRO CASTILLO")`);
  corre(m, `ReactDOM.flushSync(function(){})`);
  const det = corre(m, `window.__detalleTxt()`);
  comprobar("al tocar la fila de PD-0011 el modal muestra sus 3 líneas (Arrocillo, Flor, Vitalota)",
    det.indexOf("Arrocillo Especial") >= 0 && det.indexOf("Arroz Flor") >= 0 && det.indexOf("Arroz Vitalota") >= 0);

  /* 6 · la cabecera del 04/08 sale a nombre de SU cliente: «Pedro Castillo» */
  comprobar("la cabecera del 04/08 dice «PEDRO CASTILLO» (su cliente, no la posición)",
    txt.indexOf("04/08/2026") >= 0 && txt.indexOf("PEDRO CASTILLO") >= 0);

  /* 7 · el primer cliente alfabético del maestro NO se cuela en ningún pedido */
  comprobar("«Abad Mendieta» no aparece en ninguna parte (no es cliente de ningún pedido)",
    bajo.indexOf("abad mendieta") < 0);

  /* 8 · el segundo cliente alfabético tampoco */
  comprobar("«Alba Donoso» no aparece en ninguna parte (no es cliente de ningún pedido)",
    bajo.indexOf("alba donoso") < 0);

  /* 9 · el total en quintales de PD-0011 en su cabecera: 250+100+50 = 400 qq */
  comprobar("la cabecera de PD-0011 muestra 400 qq (suma de sus 3 líneas)",
    txt.indexOf("400 qq") >= 0);

  /* 10 · el total en dinero de PD-0011: 250·20,5 + 100·20 + 50·15 = $7.875,00 */
  comprobar("la cabecera de PD-0011 muestra $7.875,00 (suma del importe de sus 3 líneas)",
    txt.indexOf("$7.875,00") >= 0);

  /* la lista solo LEE: nada debió intentar escribirse en la base */
  if (m.escrituras.length > 0) { mal++; fallos.push("la lista intentó escribir en la base"); }

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  ["repone el `setPedidos` por posición después de `setClientesReales(reales)`",
   `setClientesReales(reales);`,
   `setClientesReales(reales); setPedidos(prev => prev.map((ped, i) => reales[i] ? { ...ped, cli: reales[i].nombre, razon: reales[i].razonSocial || ped.razon } : ped));`],
  ["TONTA · le suma 1 al total de quintales del pedido",
   `its.reduce((s,x)=>s+(Number(x.cantidad_qq)||0),0)`,
   `its.reduce((s,x)=>s+(Number(x.cantidad_qq)||0),1)`],
  ["borra la razón social del pedido (const razon = null)",
   `const razon = (pd.clientes && pd.clientes.razon_social) || null;`,
   `const razon = null;`],
  ["PED_P0_2_AGRUPAR_WEB · vuelve a UNA FILA POR PRODUCTO (filas.push por ítem)",
`          filas.push({
            id: pd.ped_id, pedId: pd.ped_id,
            /* PED_NUMERO_Y_MODAL · número de pedido para la columna y el modal (null en demo) + datos del modal */
            numero: pd.numero_pedido || null,
            fechaEntrega: pd.fecha_entrega || null, notaChofer: pd.nota_chofer || null,
            retiroBodega: !!pd.retiro_bodega, asumeFlete: pd.asume_flete || null, asumeEstibada: pd.asume_estibada || null,
            fleteCobro: Number(pd.flete_cobro_qq)||0, estibadaCobro: Number(pd.estibada_cobro_qq)||0,
            cli: cliNom, razon: razon, tipoCli: (pd.clientes && pd.clientes.tipo) || null,
            /* PED_FE_001 · el CÓDIGO crudo del estado manda la clasificación (no la etiqueta linda) */
            estadoCod: pd.estado || null, estadoLog: pd.estado_logistico || null,
            /* PED_FE_003 · datos secundarios de la fila/modal + el vendedor (nombre por sub_id en render) */
            sub: pd.sub_id || null, provCod: pd.prov_cod || null, factura: pd.factura || null, ciudad: pd.ciudad || null, creadoRaw: pd.creado || null,
            prov: provNom, cond: condTxt, estado: estadoTxt, fecha: pd.creado ? hoyECWeb(new Date(pd.creado)) : "",
            demo: !!pd.es_demo, editable: editable(pd),
            totalQq, nLineas, prodGuia, importe,
            /* compat con el orden (valorOrden) y la trazabilidad, que leen prod/cant/unidad/precio */
            prod: prodGuia, cant: totalQq, unidad:"qq", precio: totalQq ? Math.round((importe/totalQq)*100)/100 : 0,
            lineas: its.map(x=>({ prod: x.descripcion || x.prod_id, presCod: x.pres_cod || null,
              qq: Number(x.cantidad_qq)||0, precio: Number(x.precio_usd)||0,
              cond: x.condicion==="contado"?"Contado":x.condicion==="credito"?"Crédito":condTxt,
              tipo: x.tipo_precio || null })),
          });`,
`          its.forEach((mx,mk)=>filas.push({
            id: pd.ped_id + (its.length>1?("·"+(mk+1)):""), pedId: pd.ped_id,
            cli: cliNom, razon: razon, tipoCli: (pd.clientes && pd.clientes.tipo) || null,
            prov: provNom, cond: condTxt, estado: estadoTxt, fecha: String(pd.creado||"").slice(0,10),
            demo: !!pd.es_demo, editable: editable(pd),
            totalQq: Number(mx.cantidad_qq)||0, nLineas:1, prodGuia: mx.descripcion||mx.prod_id, importe:(Number(mx.cantidad_qq)||0)*(Number(mx.precio_usd)||0),
            prod: mx.descripcion||mx.prod_id, cant: Number(mx.cantidad_qq)||0, unidad:"qq", precio: Number(mx.precio_usd)||0,
            lineas: [{ prod: mx.descripcion||mx.prod_id, presCod: mx.pres_cod||null, qq:Number(mx.cantidad_qq)||0, precio:Number(mx.precio_usd)||0, cond:condTxt, tipo:mx.tipo_precio||null }],
          }));`],
];

(async () => {
  console.log("═══ Cada pedido, a nombre de su cliente · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
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

  console.log("Resultado de pedidos-cliente: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
