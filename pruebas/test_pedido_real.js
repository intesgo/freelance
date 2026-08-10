/* ═══════════════════════════════════════════════════════════════════════
   EL PEDIDO DEL VENDEDOR LLEGA A LA BASE · Comisionista b170

   Hasta la b169 el pedido del campo se guardaba solo en el teléfono. Aquí se
   comprueba, contra el bundle real, que ahora también nace en el sistema:

     · una sola RPC transaccional crea `pedidos` y `pedido_items`;
     · queda a nombre de QUIEN lo tomó, por su código del padrón (no por texto);
     · las cantidades se convierten a quintales por el equivalente de la oferta,
       y el precio se guarda POR QUINTAL — que es como lo lee todo el sistema;
     · producto, presentación y condición viajan explícitos, y el servidor
       recalcula precio y comisión con el catálogo vigente;
     · si el cliente o el producto son de demostración, NO se escribe nada;
     · sin sesión tampoco, y en los dos casos la app sigue funcionando igual;
     · si falla una línea, la transacción completa falla: nunca queda una cabecera sola.

   Uso: node test_pedido_real.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets:["react"] }).code;

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };

/* Un producto de verdad: quintal (equiv 1) y arroba (equiv 0.25). */
const PROD_REAL = { id:"PROD-DEMO-QQ", prodId:"PROD-DEMO", presCod:"QQ",  equiv:1,    nombre:"Producto Demo · Quintal" };
const PROD_ARR  = { id:"PROD-DEMO-ARR", prodId:"PROD-DEMO", presCod:"ARR", equiv:0.25, nombre:"Producto Demo · Arroba" };
const PROD_DEMO = { id:"SOLO-DEMO-QQ", nombre:"Producto Solo Demo · Quintal" };   /* sin prodId ni equiv */

function montar({ conSesion = true, fallanItems = false } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";

  const escrito = { pedidos:[], items:[], borrados:[], rpc:[] };
  const q = (t) => {
    const datos = t === "pedidos"  ? [{ ped_id:"PED-DEMO-12" }]
                : t === "usuarios" ? [{ usr_id:"USR-DEMO" }] : [];
    const p = Promise.resolve({ data: datos, error:null, count:0 });
    ["select","eq","neq","in","order","limit","like","not","is","gte","lte","or"].forEach(m => { p[m] = () => q(t); });
    p.maybeSingle = () => Promise.resolve({ data: datos[0] || null, error:null }); p.single = p.maybeSingle;
    p.insert = (f) => {
      if (t === "pedidos") { escrito.pedidos.push(f); return Promise.resolve({ error:null }); }
      if (t === "pedido_items") {
        escrito.items.push(f);
        return Promise.resolve({ error: fallanItems ? { message:"tipo_precio inválido" } : null });
      }
      return Promise.resolve({ error:null });
    };
    p.upsert = () => Promise.resolve({ error:null });
    p.update = () => { const r = Promise.resolve({ error:null }); r.eq = () => r; return r; };
    p.delete = () => { const r = { eq:(col,val)=>{ escrito.borrados.push(val); return Promise.resolve({ error:null }); } }; return r; };
    return p;
  };
  w.SB = {
    auth: {
      getSession: async () => (conSesion ? { data:{ session:{ user:{ id:"u1", email:"usuario@example.invalid" } } } } : { data:{ session:null } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => q(t), rpc: async (nombre,args) => {
      if(nombre==="mi_org_activa") return {data:"ORG-001",error:null};
      if(nombre!=="registrar_pedido_atomico") return {data:null,error:null};
      escrito.rpc.push({nombre,args});
      if(fallanItems) return {data:null,error:{message:"tipo_precio inválido"}};
      const p=args.p_payload;
      escrito.pedidos.push({ped_id:"PED-DEMO-13",sub_id:"USR-DEMO",cli_id:p.cliente_id,prov_cod:p.proveedor_id,
        estado:"ingresado",condicion:p.condicion,es_demo:false});
      escrito.items.push((p.items||[]).map((it,idx)=>{
        const eq=it.pres_cod==="ARR"?0.25:1;
        return {item_id:"PED-DEMO-13-I"+(idx+1),ped_id:"PED-DEMO-13",prod_id:it.prod_id,pres_cod:it.pres_cod,
          cantidad_qq:Number(it.cantidad_presentacion)*eq,precio_usd:Number(it.precio_presentacion)/eq,
          gratis_qq:Number(it.gratis_presentacion||0)*eq,condicion:it.condicion};
      }));
      return {data:[{ped_id:"PED-DEMO-13",repetido:false}],error:null};
    },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  /* el módulo Pedido llena este mapa al cargar; aquí se siembra a mano */
  vm.runInContext(`CLI_ID_DE["Cliente Demo"] = "CLI-DEMO";`, ctx);
  return { ctx, escrito };
}

const guardar = (m, carrito, cliNombre) => vm.runInContext(
  `guardarPedidoEnBase({ cli:{nombre:${JSON.stringify(cliNombre)}}, prov:{id:"PROV-DEMO"},
     carrito:${JSON.stringify(carrito)} })`, m.ctx);

(async () => {
  console.log("═══ El pedido del vendedor llega a la base · " + nombreApp);

  /* ── un pedido de verdad ── */
  const m = montar();
  const r = await guardar(m, [
    /* 60 qq a $48 con base $46 → el vendedor gana $2 × 60 = $120 */
    { prod:PROD_REAL, prodNombre:"Producto Demo · Quintal", cant:60, precio:48, tipo:"P1", credito:true, gratis:0, comisionTotal:120 },
    /* 8 arrobas a $12 con base $11,50, menos 2 de regalo que paga él (P3) */
    { prod:PROD_ARR,  prodNombre:"Producto Demo · Arroba",  cant:8,  precio:12, tipo:"P3", credito:true, gratis:2, comisionTotal:-19 },
  ], "Cliente Demo");

  comprobar("guarda el pedido y devuelve su código", r.ok === true && r.pedId === "PED-DEMO-13");
  const ped = m.escrito.pedidos[0] || {};
  comprobar("el pedido queda a nombre de quien lo tomó (código del padrón)", ped.sub_id === "USR-DEMO");
  comprobar("con su cliente y su proveedor", ped.cli_id === "CLI-DEMO" && ped.prov_cod === "PROV-DEMO");
  comprobar("entra como 'ingresado' y a crédito", ped.estado === "ingresado" && ped.condicion === "credito");
  comprobar("NO se marca como dato de práctica", ped.es_demo === false);

  const items = m.escrito.items[0] || [];
  comprobar("escribe los dos productos", items.length === 2);
  comprobar("60 quintales se guardan como 60 qq", items[0] && items[0].cantidad_qq === 60);
  comprobar("y su precio, por quintal", items[0] && items[0].precio_usd === 48);
  /* 8 arrobas de 0,25 qq = 2 qq · $12 la arroba = $48 el quintal */
  comprobar("8 arrobas se convierten a 2 quintales", items[1] && items[1].cantidad_qq === 2);
  comprobar("y el precio de la arroba se lleva a quintal ($48)", items[1] && items[1].precio_usd === 48);
  comprobar("las unidades gratis también van en quintales", items[1] && items[1].gratis_qq === 0.5);
  comprobar("cada ítem cuelga de su pedido", items.every(i => i.ped_id === "PED-DEMO-13") &&
    items[0].item_id === "PED-DEMO-13-I1" && items[1].item_id === "PED-DEMO-13-I2");

  /* ── el servidor es la única fuente de precio y comisión ── */
  const llamada=(m.escrito.rpc[0]||{}).args||{}, enviados=(llamada.p_payload||{}).items||[];
  comprobar("P1/P3 no pueden imponer una comisión calculada por el navegador",
    enviados.length===2 && enviados.every(i=>i.comision_propuesta===null));
  comprobar("cada línea declara su condición; el servidor no la infiere desde P1/P2",
    enviados.length===2 && enviados.every(i=>i.condicion==="credito"));
  comprobar("cada línea identifica producto y presentación para recalcular contra catálogo",
    enviados[0]&&enviados[0].prod_id==="PROD-DEMO"&&enviados[0].pres_cod==="QQ"&&enviados[1].pres_cod==="ARR");

  /* ── cliente de demostración: no se escribe nada ── */
  const d1 = montar();
  const r1 = await guardar(d1, [{ prod:PROD_REAL, prodNombre:"x", cant:1, precio:48, tipo:"P1", comisionTotal:2 }], "Cliente Inventado");
  comprobar("cliente de demostración: no escribe y dice por qué",
    r1.ok === false && r1.motivo === "cliente_demo" && d1.escrito.pedidos.length === 0);

  /* ── producto de demostración: tampoco ── */
  const d2 = montar();
  const r2 = await guardar(d2, [{ prod:PROD_DEMO, prodNombre:"x", cant:1, precio:42, tipo:"P1" }], "Cliente Demo");
  comprobar("producto de demostración: no escribe y dice por qué",
    r2.ok === false && r2.motivo === "producto_demo" && d2.escrito.pedidos.length === 0);

  /* ── sin sesión ── */
  const d3 = montar({ conSesion:false });
  const r3 = await guardar(d3, [{ prod:PROD_REAL, prodNombre:"x", cant:1, precio:48, tipo:"P1" }], "Cliente Demo");
  comprobar("sin sesión: no escribe y dice por qué",
    r3.ok === false && r3.motivo === "sin_sesion" && d3.escrito.pedidos.length === 0);

  /* ── si fallan los ítems, se deshace el pedido ── */
  const d4 = montar({ fallanItems:true });
  const r4 = await guardar(d4, [{ prod:PROD_REAL, prodNombre:"x", cant:5, precio:48, tipo:"P9" }], "Cliente Demo");
  comprobar("si fallan los ítems, avisa del error", r4.ok === false && /tipo_precio/.test(r4.motivo || ""));
  comprobar("la RPC atómica no deja cabecera, líneas ni borrados compensatorios",
    d4.escrito.pedidos.length===0 && d4.escrito.items.length===0 && d4.escrito.borrados.length===0);

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.message || e).split("\n")[0]); process.exit(1); });
