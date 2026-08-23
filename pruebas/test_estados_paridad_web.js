/* PED_ESTADOS_PARIDAD */
/* ═══════════════════════════════════════════════════════════════════════
   TANDA 2C · EL SISTEMA WEB EDITA EN LOS MISMOS ESTADOS QUE LA APP Y QUE EL
   RPC editar_pedido_atomico: ingresado, esperando_aprobacion y también
   enviado_proveedor. Desde 'facturado' (y posteriores) YA NO se edita.

   Anclas del código (sistema-web.html): PED_ESTADOS_PARIDAD.

   QUÉ SE AMARRA AQUÍ (montando la pantalla de verdad en JSDOM, sin modo demo,
   como la ve el usuario del Sistema Web):

   PARTE A · paridad de estados en la lista de pedidos:
     · En la fila de un pedido «enviado_proveedor» SÍ sale el lápiz «Editar
       pedido» (se puede editar, igual que en la app).
     · En la fila de un pedido «facturado» NO sale el lápiz (a partir de
       facturado ya no se edita).

   PARTE B · el guardado tiene UNA sola vía y se comporta bien:
     · Guardar los cambios llama SIEMPRE al RPC editar_pedido_atomico (no hay
       otra puerta trasera de escritura).
     · Si el guardado SALE BIEN, la pantalla RECARGA la lista desde la base
       (vuelve a consultar «pedidos»): lo que se ve es lo que quedó guardado.
     · Si el guardado FALLA, NO recarga, el pedido sigue en pantalla y sale el
       aviso «No se pudo guardar»: no se pierde ni se pisa nada.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Los mutantes tocan
   justo el origen del comportamiento (la lista de estados editables y la
   recarga tras éxito).

   NO SE ESCRIBE EN LA BASE DE VERDAD: los dobles de Supabase de aquí no tocan
   nada real. El RPC está simulado.

   Uso: node test_estados_paridad_web.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const rutaWeb = R.app("sistema-web");
const htmlWeb = fs.readFileSync(rutaWeb, "utf-8");
const jsxWeb = htmlWeb.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones y mutantes se esperan. Se declara ANTES de correr
      para que una prueba borrada sin querer no pase inadvertida. ── */
const ESPERADAS = 10;          // Parte A (3) + Parte B (7)
const MUTANTES_ESPERADOS = 3;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

/* ══════════════════════════════════════════════════════════════════════
   FIXTURE · dos pedidos vivos: uno «enviado_proveedor» (editable) y uno
   «facturado» (ya no editable). Cada uno con al menos un ítem (si «pedidos» o
   «pedido_items» vinieran vacíos, cargarPedidosVivos deja la lista vacía).
   ══════════════════════════════════════════════════════════════════════ */
const PEDIDOS_WEB_BD = [
  { ped_id:"PED-ENV", cli_id:"CLI-1", sub_id:"USR-1", prov_cod:"PROV-1", ciudad:"Machala",
    estado:"enviado_proveedor", estado_comercial:"enviado_proveedor", estado_logistico:null,
    factura:null, condicion:"credito", creado:"2026-08-20T10:00:00Z", es_demo:false,
    clientes:{ nombre:"Cliente Uno", razon_social:"Cliente Uno S.A.", tipo:"Jurídica" },
    proveedores:{ nombre:"Piladora Uno" } },
  { ped_id:"PED-FAC", cli_id:"CLI-2", sub_id:"USR-1", prov_cod:"PROV-1", ciudad:"Machala",
    estado:"facturado", estado_comercial:"facturado", estado_logistico:null,
    factura:"F-001", condicion:"credito", creado:"2026-08-19T10:00:00Z", es_demo:false,
    clientes:{ nombre:"Cliente Dos", razon_social:"Cliente Dos S.A.", tipo:"Jurídica" },
    proveedores:{ nombre:"Piladora Uno" } },
];
const PEDIDO_ITEMS_WEB_BD = [
  { item_id:"IT-1", ped_id:"PED-ENV", prod_id:"P-1", pres_cod:"QQ", promo_id:null, condicion:"credito",
    descripcion:"Arroz Uno", cantidad_qq:10, precio_usd:20, tipo_precio:"P1", gratis_qq:0, comision_usd:0 },
  { item_id:"IT-2", ped_id:"PED-FAC", prod_id:"P-1", pres_cod:"QQ", promo_id:null, condicion:"credito",
    descripcion:"Arroz Uno", cantidad_qq:8, precio_usd:20, tipo_precio:"P1", gratis_qq:0, comision_usd:0 },
];
/* Las demás tablas se mantienen como en test_paridad_cupo_app.js para que el
   componente monte sin romper (clientes/cartera/proveedores/productos/ofertas). */
const CLIENTES_WEB_BD = [
  { cli_id:"CLI-1", nombre:"Cliente Uno", razon_social:"Cliente Uno S.A.", tipo:"Jurídica",
    ruc:"1790001234001", condicion_pago:"Crédito", cupo:3000, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-1", canal:"Mayorista", estado_cliente:"ACTIVO" },
];
const CARTERA_BD = [
  { cli_id:"CLI-1", monto:1200, estado:"pendiente", es_demo:false },
];
const PROVEEDORES_WEB_BD = [ { prov_cod:"PROV-1", nombre:"Piladora Uno", es_demo:false } ];
const PRODUCTOS_WEB_BD = [ { prod_id:"P-1", nombre:"Arroz Uno", linea:"Arroz", estado:"activo" } ];
const OFERTAS_WEB_BD = [
  { prod_id:"P-1", prov_cod:"PROV-1", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
    costo:9, costo_contado:9, margen_min:0, precio_contado:10, precio_credito:10 },
];
function datosWeb(t) {
  if (t === "pedidos")            return PEDIDOS_WEB_BD;
  if (t === "pedido_items")       return PEDIDO_ITEMS_WEB_BD;
  if (t === "clientes")           return CLIENTES_WEB_BD;
  if (t === "cartera_cliente")    return CARTERA_BD;
  if (t === "proveedores")        return PROVEEDORES_WEB_BD;
  if (t === "productos")          return PRODUCTOS_WEB_BD;
  if (t === "v_ofertas_vigentes") return OFERTAS_WEB_BD;
  return [];
}

function montarWeb(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.XLSX = null;

  /* Instrumentación observable: cuántas veces se LEE la tabla «pedidos» (para
     medir la recarga) y qué RPC se llamaron. `rpcResp` es la respuesta que el
     doble del RPC devuelve, y se cambia entre el caso ÉXITO y el caso FALLO. */
  const estado = { lecturasPedidos:0, rpc:[], rpcResp:{ data:null, error:null } };

  function consulta(tabla, filtros) {
    const resolver = () => {
      let filas = datosWeb(tabla).slice();
      filtros.forEach(f => {
        if (f[0] === "eq")  filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq") filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "in")  filas = filas.filter(r => (f[2]||[]).indexOf(r[f[1]]) >= 0);
      });
      return Promise.resolve({ data:filas, error:null });
    };
    const con = (t,c,v) => consulta(tabla, filtros.concat([[t,c,v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, is:()=>enc, range:()=>enc, filter:()=>enc,
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), in:(c,v)=>con("in",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      insert:()=>Promise.resolve({ error:null }),
      upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => Promise.resolve({ error:null }); return r; },
      delete:()=>({ eq:()=>Promise.resolve({ error:null }) }),
    };
    return enc;
  }
  w.supa = {
    auth: { getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } }),
            onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
            getUser: async () => ({ data:{ user:{ id:"u1" } } }), signOut: async () => ({}) },
    from: (t) => { if (t === "pedidos") estado.lecturasPedidos++; return consulta(t, []); },
    rpc: async (nombre, args) => { estado.rpc.push({ nombre, args }); return estado.rpcResp; },
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx);
  vm.runInContext(R.reactDomDev(), ctx);
  vm.runInContext(js, ctx);

  vm.runInContext(`
    window.__render = function(){
      window.__c = document.createElement("div");
      document.body.appendChild(window.__c);
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__c).render(React.createElement(PedidosWeb, {
          usuario: { usuario:"richard", nombre:"Richard Ramírez", cargo:"freelance",
                     rol:"Freelance", empresaId:"ORG-001", secciones:[] } }));
      });
    };
    window.__flush = function(){ ReactDOM.flushSync(function(){}); };
    window.__txt = function(){ return (window.__c && window.__c.textContent) || ""; };

    /* La lista de pedidos es una tabla en CSS grid: cada fila es un <div> con 8
       columnas (Fecha·Cliente·Producto·Cant·Total·Cond·Estado·Editar). La fila
       que contiene el nombre del cliente es la del pedido de ese cliente. */
    window.__filaDe = function(nombre){
      var divs = window.__c.querySelectorAll("div");
      for(var i=0;i<divs.length;i++){
        var d = divs[i];
        if(d.children.length===8 && (d.textContent||"").indexOf(nombre)>=0) return d;
      }
      return null;
    };
    /* "si"/"no"/"sin-fila": ¿la fila de ese cliente tiene el lápiz «Editar pedido»? */
    window.__botonEditar = function(nombre){
      var fila = window.__filaDe(nombre);
      if(!fila) return "sin-fila";
      return fila.querySelector('button[title="Editar pedido"]') ? "si" : "no";
    };
    window.__nBotonesEditar = function(){
      return window.__c.querySelectorAll('button[title="Editar pedido"]').length;
    };
    /* Click en el lápiz «Editar pedido» de la fila de ese cliente. */
    window.__clickEditar = function(nombre){
      var fila = window.__filaDe(nombre);
      if(!fila) return "sin-fila";
      var b = fila.querySelector('button[title="Editar pedido"]');
      if(!b) return "sin-boton";
      b.dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
      return "ok";
    };
    /* Click en el primer botón cuyo texto contenga 'sub'. */
    window.__clickTexto = function(sub){
      var bs = window.__c.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){
        if((bs[i].textContent||"").indexOf(sub)>=0){
          if(bs[i].disabled) return "disabled";
          bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
          return "ok";
        }
      }
      return "no-existe";
    };
    window.__hayBoton = function(sub){
      var bs = window.__c.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0) return true; }
      return false;
    };
  `, ctx);
  return { ctx, w, estado };
}
const correW = (m, expr) => vm.runInContext(expr, m.ctx);

/* Monta PedidosWeb y espera a que cargarPedidosVivos (y los efectos de arranque)
   terminen, dejando la vista lista pintada con sus filas. */
async function montarLista(js) {
  const m = montarWeb(js);
  correW(m, `window.__render()`);
  await esperar(320); correW(m, `window.__flush()`);
  await esperar(160); correW(m, `window.__flush()`);
  return m;
}

/* ══ La batería (Parte A + Parte B). Se corre igual contra el código bueno y
      contra cada mutante. ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ─────────────── PARTE A · paridad de estados en la lista ─────────────── */
  const mA = await montarLista(js);
  /* PED_PESTANAS_ESTADO · la lista se reparte en pestañas por estado. «enviado_proveedor»
     está en Pendientes (la pestaña por defecto); «facturado» está en «En camino». */
  const editEnv  = correW(mA, `window.__botonEditar("CLIENTE UNO")`);
  const nBotones = correW(mA, `window.__nBotonesEditar()`);   // en Pendientes: solo el lápiz del pedido editable
  correW(mA, `window.__clickTexto("En camino")`);             // el facturado vive en «En camino»
  await esperar(160); correW(mA, `window.__flush()`);
  const editFac  = correW(mA, `window.__botonEditar("CLIENTE DOS")`);
  correW(mA, `window.__clickTexto("Pendientes")`);            // se vuelve a Pendientes para el resto
  await esperar(160); correW(mA, `window.__flush()`);

  comprobar("A · pedido «enviado_proveedor» (Cliente Uno): SÍ sale el lápiz «Editar pedido»"
    + " (fue: " + editEnv + ")", editEnv === "si");
  comprobar("A · pedido «facturado» (Cliente Dos): NO sale el lápiz «Editar pedido»"
    + " (fue: " + editFac + ")", editFac === "no");
  comprobar("A · en la pestaña Pendientes hay exactamente 1 lápiz «Editar pedido»"
    + " (fue: " + nBotones + ")", nBotones === 1);

  /* ─────────────── PARTE B · una sola vía de guardado, recarga en éxito ───── */

  /* Caso ÉXITO: el RPC editar_pedido_atomico responde {data:null,error:null}. */
  const mOk = await montarLista(js);
  const baseOk = mOk.estado.lecturasPedidos;
  comprobar("B · el montaje lee «pedidos» una vez (fue: " + baseOk + ")", baseOk === 1);

  mOk.estado.rpcResp = { data:null, error:null };
  correW(mOk, `window.__clickEditar("CLIENTE UNO")`);   // → abre la vista Armar con el carrito cargado
  await esperar(220); correW(mOk, `window.__flush()`);
  const antesOk = mOk.estado.lecturasPedidos;           // lecturas justo antes de guardar
  const clkOk = correW(mOk, `window.__clickTexto("Guardar cambios")`);
  await esperar(220); correW(mOk, `window.__flush()`);

  const rpcEditar = mOk.estado.rpc.filter(r => r.nombre === "editar_pedido_atomico");
  comprobar("B · guardar en edición llama al RPC editar_pedido_atomico"
    + " (click=" + clkOk + ")", rpcEditar.length >= 1);
  comprobar("B · el guardado tiene UNA sola vía: todo RPC disparado en la edición es editar_pedido_atomico",
    mOk.estado.rpc.length >= 1 && mOk.estado.rpc.every(r => r.nombre === "editar_pedido_atomico"));
  comprobar("B · tras un guardado EXITOSO se RECARGA la lista (vuelve a leer «pedidos»)"
    + " (antes=" + antesOk + " · después=" + mOk.estado.lecturasPedidos + ")",
    mOk.estado.lecturasPedidos > antesOk);

  /* Caso FALLO: el RPC responde error → no debe recargar ni perder el pedido. */
  const mFail = await montarLista(js);
  mFail.estado.rpcResp = { data:null, error:{ message:"rls denegado" } };
  correW(mFail, `window.__clickEditar("CLIENTE UNO")`);
  await esperar(220); correW(mFail, `window.__flush()`);
  const antesFail = mFail.estado.lecturasPedidos;
  correW(mFail, `window.__clickTexto("Guardar cambios")`);
  await esperar(220); correW(mFail, `window.__flush()`);
  const txtFail = correW(mFail, `window.__txt()`);
  const sigueArmando = correW(mFail, `window.__hayBoton("Guardar cambios")`);

  comprobar("B · un guardado FALLIDO muestra el aviso «No se pudo guardar»",
    /No se pudo guardar/.test(txtFail || ""));
  comprobar("B · un guardado FALLIDO NO recarga la lista (no vuelve a leer «pedidos»)"
    + " (antes=" + antesFail + " · después=" + mFail.estado.lecturasPedidos + ")",
    mFail.estado.lecturasPedidos === antesFail);
  comprobar("B · un guardado FALLIDO deja el pedido en pantalla (sigue en la edición)",
    sigueArmando === true);

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══
   Cada mutante toca el ORIGEN del comportamiento. Se verifica que el trozo
   aparezca UNA sola vez antes de reemplazarlo. ══ */
const MUTANTES = [
  /* (1) La web VUELVE a excluir enviado_proveedor (la divergencia vieja):
         desaparece el lápiz del pedido enviado_proveedor → cae la Parte A. */
  ["la web excluye enviado_proveedor (quita el estado editable nuevo)",
    `["ingresado","esperando_aprobacion","enviado_proveedor"].includes(pd.estado_comercial || pd.estado)`,
    `["ingresado","esperando_aprobacion"].includes(pd.estado_comercial || pd.estado)`],
  /* (2) La web deja editar hasta FACTURADO: aparece el lápiz en el pedido
         facturado (que no se debe editar) → cae la Parte A. */
  ["la web deja editar hasta facturado (agrega un estado que no debe)",
    `["ingresado","esperando_aprobacion","enviado_proveedor"].includes(pd.estado_comercial || pd.estado)`,
    `["ingresado","esperando_aprobacion","enviado_proveedor","facturado"].includes(pd.estado_comercial || pd.estado)`],
  /* (3) Tras guardar bien, NO recarga la lista: lo que ve el usuario deja de
         reflejar lo guardado → cae la Parte B (la recarga). */
  ["tras guardar con éxito NO recarga la lista (quita cargarPedidosVivos)",
    `setVista("lista");\n      await cargarPedidosVivos();`,
    `setVista("lista");`],
];

(async () => {
  console.log("═══ Paridad de estados del Sistema Web (editar en enviado_proveedor, no en facturado)");
  console.log("    Comprobaciones: " + ESPERADAS + " (Parte A: 3 · Parte B: 7) · mutantes: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsxWeb, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (r.ok + r.mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
      (r.ok + r.mal) + ". Alguna se perdió o se agregó sin declararla.");
  }

  console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
  if (MUTANTES.length !== MUTANTES_ESPERADOS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + MUTANTES_ESPERADOS + " mutantes y hay " + MUTANTES.length + ".");
  }
  for (const [nombre, dee, a] of MUTANTES) {
    const veces = jsxWeb.split(dee).length - 1;
    if (veces !== 1) {
      mal++;
      console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
      continue;
    }
    const mutado = jsxWeb.replace(dee, a);
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

  console.log("Resultado estados-paridad-web: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
