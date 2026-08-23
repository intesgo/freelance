/* ═══════════════════════════════════════════════════════════════════════
   PED_NUMERO_Y_MODAL · sistema-web (módulo Pedidos, vista lista)

   Qué mide, con la pantalla montada de verdad (JSDOM + React):
   (a) la cabecera de la tabla dice «Pedido N.º» y ya NO «Productos».
   (b) un pedido real muestra su numero_pedido en la fila.
   (c) al hacer clic en la fila se abre el MODAL (role="dialog") con ESE pedido
       (su número y su detalle de productos).
   (d) el modal cierra con Escape, con «Cerrar» y con la X.
   (e) el lápiz (editar) NO abre el modal: lleva a la pantalla de edición (armar).

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE.

   NO SE ESCRIBE EN LA BASE: el `supa` de aquí es un doble que devuelve datos con
   la forma de producción y anota lo que se le mande.
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
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 60));

/* ══ Base de prueba (forma de producción, snake_case). Un pedido REAL con su
      numero_pedido, editable y no demo, con DOS líneas. ══ */
const CLIENTES_BD = [
  { cli_id:"CLI-036", nombre:"Supermercado Castillo", razon_social:"Pedro Rodrigo Castillo Rosero",
    tipo:"Natural", ruc:"1712345678001", condicion_pago:"Contado", cupo:30000, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-7", estado_cliente:"ACTIVO" },
];
const PEDIDOS_BD = [
  { ped_id:"PD-0042", cli_id:"CLI-036", sub_id:"USR-7", prov_cod:"PROV-1", ciudad:"Quito",
    estado:"esperando_aprobacion", estado_comercial:"esperando_aprobacion", estado_logistico:null, factura:null,
    condicion:"contado", creado:"2026-08-10T10:00:00", es_demo:false,
    numero_pedido:"PED-2026-000042", fecha_entrega:"2026-08-12", nota_chofer:"Entregar en la mañana",
    retiro_bodega:false, asume_flete:"cliente", asume_estibada:"freelance",
    flete_cobro_qq:0.5, estibada_cobro_qq:0,
    clientes:{ nombre:"Supermercado Castillo", razon_social:"Pedro Rodrigo Castillo Rosero", tipo:"Natural" },
    proveedores:{ nombre:"Piladora Uno" } },
];
const PEDIDO_ITEMS_BD = [
  { item_id:"IT-1", ped_id:"PD-0042", prod_id:"P-ARROCILLO", descripcion:"Arrocillo Especial · qq",
    cantidad_qq:250, precio_usd:20.5, tipo_precio:"P2", gratis_qq:0, condicion:"contado" },
  { item_id:"IT-2", ped_id:"PD-0042", prod_id:"P-FLOR", descripcion:"Arroz Flor · qq",
    cantidad_qq:100, precio_usd:20, tipo_precio:"P2", gratis_qq:0, condicion:"contado" },
];
function datosDe(t){
  if (t==="clientes") return CLIENTES_BD;
  if (t==="pedidos") return PEDIDOS_BD;
  if (t==="pedido_items") return PEDIDO_ITEMS_BD;
  return [];
}

function montar(js){
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied"; w.XLSX = null;

  const escrituras = [];
  function consulta(tabla, filtros){
    const resolver = () => {
      let filas = datosDe(tabla).slice();
      filtros.forEach(f => {
        if (f[0]==="eq")  filas = filas.filter(r => r[f[1]]===f[2]);
        if (f[0]==="neq") filas = filas.filter(r => r[f[1]]!==f[2]);
        if (f[0]==="in")  filas = filas.filter(r => (f[2]||[]).indexOf(r[f[1]])>=0);
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
      insert:(x)=>{ escrituras.push({op:"insert",tabla}); return Promise.resolve({ error:null }); },
      upsert:(x)=>{ escrituras.push({op:"upsert",tabla}); return Promise.resolve({ error:null }); },
      update:(x)=>{ const r=Promise.resolve({error:null}); r.eq=()=>{ escrituras.push({op:"update",tabla}); return Promise.resolve({error:null}); }; return r; },
      delete:()=>({ eq:()=>{ escrituras.push({op:"delete",tabla}); return Promise.resolve({error:null}); } }),
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
    window.__txt = function(){ return (window.__c && window.__c.textContent) || ""; };
    window.__hayDialog = function(){ return document.querySelectorAll('[role="dialog"]').length; };
    window.__dialogTxt = function(){ var d=document.querySelector('[role="dialog"]'); return d?(d.textContent||""):""; };
    window.__cabeceraTxt = function(){
      var h = window.__c.querySelector('[style*="grid"]'); return h ? (h.textContent||"") : "";
    };
    window.__clickFila = function(sub){
      var cs = window.__c.querySelectorAll(".ped-cabecera");
      for (var i=0;i<cs.length;i++){ if ((cs[i].textContent||"").indexOf(sub)>=0){
        cs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } }
      return false;
    };
    window.__clickLapiz = function(){
      var b = window.__c.querySelector('button[title="Editar pedido"]');
      if(!b) return false; b.dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true;
    };
    window.__clickBtnTexto = function(txt){
      var bs = document.querySelectorAll('[role="dialog"] button');
      for (var i=0;i<bs.length;i++){ if ((bs[i].textContent||"").indexOf(txt)>=0){
        bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } }
      return false;
    };
    window.__clickX = function(){
      var b = document.querySelector('[role="dialog"] button[aria-label="Cerrar"]');
      if(!b) return false; b.dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true;
    };
    window.__escape = function(){
      document.dispatchEvent(new window.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
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

async function bateria(js, ruidoso){
  let ok=0, mal=0; const fallos=[];
  const comprobar = (t,c)=>{ if(c){ ok++; if(ruidoso) console.log("  ✓ "+t); } else { mal++; fallos.push(t); if(ruidoso) console.log("  ✗ "+t); } };

  const m = montar(js);
  corre(m, `window.__pintar()`);
  await esperar(220);
  corre(m, `ReactDOM.flushSync(function(){})`);

  const cab = corre(m, `window.__cabeceraTxt()`);
  const txt = corre(m, `window.__txt()`);

  /* (a) cabecera «Pedido N.º», ya no «Productos» */
  comprobar("(a) la cabecera dice «Pedido N.º» y ya no «Productos»",
    cab.indexOf("Pedido N.º")>=0 && txt.indexOf("Productos")<0);

  /* (b) el pedido real muestra su numero_pedido */
  comprobar("(b) la fila muestra el número real del pedido (PED-2026-000042)",
    txt.indexOf("PED-2026-000042")>=0);

  /* con el modal cerrado, no hay dialog */
  comprobar("al inicio no hay ningún modal abierto",
    corre(m, `window.__hayDialog()`)===0);

  /* (c) clic en la fila abre el modal con ese pedido */
  corre(m, `window.__clickFila("PED-2026-000042")`);
  corre(m, `ReactDOM.flushSync(function(){})`);
  const dlg = corre(m, `window.__dialogTxt()`);
  comprobar("(c) al tocar la fila se abre el modal con ese pedido (número + productos)",
    corre(m, `window.__hayDialog()`)===1 && dlg.indexOf("PED-2026-000042")>=0 &&
    dlg.indexOf("Arrocillo Especial")>=0 && dlg.indexOf("Arroz Flor")>=0);

  /* (d1) cierra con Escape */
  corre(m, `window.__escape()`);
  corre(m, `ReactDOM.flushSync(function(){})`);
  comprobar("(d) el modal cierra con la tecla Escape",
    corre(m, `window.__hayDialog()`)===0);

  /* (d2) reabrir y cerrar con «Cerrar» */
  corre(m, `window.__clickFila("PED-2026-000042")`);
  corre(m, `ReactDOM.flushSync(function(){})`);
  corre(m, `window.__clickBtnTexto("Cerrar")`);
  corre(m, `ReactDOM.flushSync(function(){})`);
  comprobar("(d) el modal cierra con el botón «Cerrar»",
    corre(m, `window.__hayDialog()`)===0);

  /* (d3) reabrir y cerrar con la X */
  corre(m, `window.__clickFila("PED-2026-000042")`);
  corre(m, `ReactDOM.flushSync(function(){})`);
  corre(m, `window.__clickX()`);
  corre(m, `ReactDOM.flushSync(function(){})`);
  comprobar("(d) el modal cierra con la X",
    corre(m, `window.__hayDialog()`)===0);

  /* (e) el lápiz NO abre el modal: lleva a la edición (vista armar) */
  corre(m, `window.__clickLapiz()`);
  corre(m, `ReactDOM.flushSync(function(){})`);
  const trasLapiz = corre(m, `window.__txt()`);
  comprobar("(e) el lápiz no abre el modal y lleva a la edición (Detalles del pedido / Subir pedido)",
    corre(m, `window.__hayDialog()`)===0 &&
    (trasLapiz.indexOf("Detalles del pedido")>=0 || trasLapiz.indexOf("Guardar cambios")>=0 || trasLapiz.indexOf("Resumen del pedido")>=0));

  /* la lista/modal solo LEEN: nada debió escribirse en la base */
  if (m.escrituras.length>0){ mal++; fallos.push("la lista/modal intentó escribir en la base"); }
  return { ok, mal, fallos };
}

const MUTANTES = [
  ["la cabecera vuelve a decir «Productos» (rompe (a))",
   `th("numero","Pedido N.º")`, `th("numero","Productos")`],
  ["el clic en la fila ya no abre el modal (rompe (c))",
   `onClick={(e)=>{ e.currentTarget.focus(); setPedModal(p); }}`,
   `onClick={(e)=>{ e.currentTarget.focus(); }}`],
  ["Escape ya no cierra el modal (rompe (d))",
   `if(e.key==="Escape"){ e.preventDefault(); onCerrar(); return; }`,
   `if(e.key==="Escape"){ e.preventDefault(); return; }`],
];

(async () => {
  console.log("═══ Pedido N.º + modal de solo lectura · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);
  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok=r.ok, mal=r.mal;
  if (ok+mal !== ESPERADAS){ mal++; console.log("  ✗ AVISO: se declararon "+ESPERADAS+" y corrieron "+(ok+mal-1)); }

  console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
  if (MUTANTES.length !== MUTANTES_ESPERADOS){ mal++; console.log("  ✗ AVISO: se declararon "+MUTANTES_ESPERADOS+" mutantes y hay "+MUTANTES.length); }
  for (const [nombre, de, a] of MUTANTES){
    const veces = jsx.split(de).length - 1;
    if (veces !== 1){ mal++; console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`); continue; }
    const mutado = jsx.replace(de, a);
    let res;
    try { res = await bateria(R.Babel.transform(mutado, { presets:["react"] }).code, false); }
    catch (e){ res = { mal:1, fallos:["reventó: "+e.message] }; }
    if (res.mal > 0){ ok++; console.log(`  ✓ «${nombre}» → la prueba se cae (${res.mal} fallo(s))`); }
    else { mal++; console.log(`  ✗ «${nombre}» → la prueba PASA IGUAL: no mide nada`); }
  }

  console.log("Resultado de pedido-numero-modal: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
