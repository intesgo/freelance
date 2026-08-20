/* PED_TESTS_PARIDAD */
/* ═══════════════════════════════════════════════════════════════════════
   PARIDAD WEB · EL CUPO DE CRÉDITO NO BLOQUEA, SOLO MANDA A AUTORIZAR
   · sistema-web (módulo PedidosWeb · cupo de crédito)

   Qué mide (igual que la app): cuando una línea a CRÉDITO pasa el cupo del
   cliente, el pedido NO se bloquea: se puede armar y la línea queda «por
   autorizar» (requiere:true). Y el cupo cuenta SOLO las líneas a crédito: una
   línea a CONTADO no consume ni dispara el cupo.

   La lógica real:
     excedeCupo = cliente y no bloqueado y ES CRÉDITO y no P5 y cupo>0
                  y (usado + crédito-en-carrito + esta-línea > cupo)
     · el crédito-en-carrito solo suma las líneas a crédito (contado excluido)
     · «valido» NO incluye !excedeCupo → el exceso NO impide agregar

   Cómo mide: renderiza PedidosWeb de VERDAD (React en JSDOM) y MANEJA la
   pantalla como el usuario: elige cliente/piladora/producto, arma líneas y
   observa (1) que la línea a crédito por encima del cupo se puede agregar y
   sale «por autorizar», y (2) que un contado grande en el carrito no hace que
   un crédito chico dispare el aviso de cupo.

   NACE ROJA a propósito: al final se rompe la regla en el código, una a la vez.
   Nota de diseño: el mutante «el contado consume cupo» se hace sobre el filtro
   de crédito-en-carrito (contar TODAS las líneas), porque es el único punto que
   se puede observar en pantalla con un solo cambio; mutar solo `exponeCupo` no
   cambia nada visible (excedeCupo sigue con la guarda `esCredito`). El otro
   mutante hace que el exceso BLOQUEE (añade !excedeCupo a «valido»).

   NO SE ESCRIBE EN LA BASE DE VERDAD: el `supa` de aquí es un doble.

   Uso: node test_paridad_cupo_web.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

const ESPERADAS = 4;
const MUTANTES_ESPERADOS = 2;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

/* ══ Datos de prueba: cliente a crédito con cupo 1000 y sin deuda ══ */
const CLIENTES_BD = [
  { cli_id:"CLI-C1", nombre:"Cupo Prueba", razon_social:"Cupo Prueba S.A.",
    tipo:"Jurídica", ruc:"1790000789001", condicion_pago:"Crédito", cupo:1000, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-1", estado_cliente:"ACTIVO" },
];
const PROVEEDORES_BD = [
  { prov_cod:"PROV-C1", nombre:"Piladora Cupo", es_demo:false },
];
const PRODUCTOS_BD = [
  { prod_id:"P-CUPO", nombre:"Arroz Cupo", linea:"Arroz", estado:"activo" },
];
const OFERTAS_BD = [
  { prod_id:"P-CUPO", prov_cod:"PROV-C1", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
    costo:9, costo_contado:9, margen_min:0, precio_contado:10, precio_credito:10 },
];

function datosDe(t) {
  if (t === "clientes")            return CLIENTES_BD;
  if (t === "proveedores")         return PROVEEDORES_BD;
  if (t === "productos")           return PRODUCTOS_BD;
  if (t === "v_ofertas_vigentes")  return OFERTAS_BD;
  return [];
}

function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.XLSX = null;

  function consulta(tabla, filtros) {
    const resolver = () => {
      let filas = datosDe(tabla).slice();
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

    var setV = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
    window.__escribir = function(inp, txt){
      if(!inp) return false;
      setV.call(inp, txt);
      inp.dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
    window.__inp = function(phSub){
      var ins = window.__c.querySelectorAll("input");
      for(var i=0;i<ins.length;i++){
        var ph=(ins[i].getAttribute("placeholder")||"").toLowerCase();
        if(ph.indexOf(phSub.toLowerCase())>=0) return ins[i];
      }
      return null;
    };
    window.__buscarEscribir = function(phSub, texto){
      var inp = window.__inp(phSub);
      if(!inp) return "no está el buscador ("+phSub+")";
      window.__escribir(inp, texto);
      return null;
    };
    window.__buscarOpcion = function(phSub, opcSub){
      var inp = window.__inp(phSub);
      if(!inp) return "no está el buscador ("+phSub+")";
      var wrap = inp.parentNode, dd = null;
      for(var i=0;i<wrap.children.length;i++){
        var c = wrap.children[i];
        if(c.tagName==="DIV" && c.style && c.style.maxHeight==="220px"){ dd=c; break; }
      }
      if(!dd) return "no se abrió el desplegable ("+phSub+")";
      var ops = dd.children;
      for(var j=0;j<ops.length;j++){
        if((ops[j].textContent||"").toLowerCase().indexOf(opcSub.toLowerCase())>=0){
          ops[j].dispatchEvent(new window.MouseEvent("mousedown",{bubbles:true}));
          return null;
        }
      }
      return "no apareció la opción «"+opcSub+"» en "+phSub;
    };
    window.__rowab = function(i, val){
      var row = window.__c.querySelector(".ped-rowab");
      if(!row) return "no está la fila cantidad/precio";
      var nums = row.querySelectorAll("input[type=number]");
      if(nums.length<2) return "faltan las casillas de la fila ("+nums.length+")";
      window.__escribir(nums[i], String(val));
      return null;
    };
    window.__botonPorTexto = function(sub){
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
    window.__estadoBoton = function(sub){
      var bs = window.__c.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){
        if((bs[i].textContent||"").indexOf(sub)>=0) return bs[i].disabled?"disabled":"ok";
      }
      return "no-existe";
    };
    window.__overlay = function(){
      var ds = window.__c.querySelectorAll("div");
      for(var i=0;i<ds.length;i++){ if(ds[i].style && ds[i].style.zIndex==="120") return ds[i]; }
      return null;
    };
    window.__modalBoton = function(sub){
      var ov = window.__overlay(); if(!ov) return "no-modal";
      var bs = ov.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){
        if((bs[i].textContent||"").indexOf(sub)>=0){
          if(bs[i].disabled) return "disabled";
          bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
          return "ok";
        }
      }
      return "no-existe";
    };
  `, ctx);
  return { ctx, w };
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);

async function elegirCliente(m) {
  corre(m, `window.__buscarEscribir("cliente", "Cupo")`);
  await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("cliente", "Cupo")`);
  await esperar(160); corre(m, `window.__flush()`);
}
async function elegirProvProd(m) {
  corre(m, `window.__buscarEscribir("proveedor", "Piladora")`);
  await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("proveedor", "Piladora Cupo")`);
  await esperar(160); corre(m, `window.__flush()`);
  corre(m, `window.__buscarEscribir("catálogo", "Arroz Cupo")`);
  await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("catálogo", "Arroz Cupo")`);
  await esperar(160); corre(m, `window.__flush()`);
}
async function nuevoPedido(m) {
  corre(m, `window.__render()`);
  await esperar(300); corre(m, `window.__flush()`);
  corre(m, `window.__botonPorTexto("+ Nuevo pedido")`);
  await esperar(160); corre(m, `window.__flush()`);
}
async function setCantPrecio(m, c, p) {
  corre(m, `window.__rowab(0, ${JSON.stringify(String(c))})`);
  await esperar(100); corre(m, `window.__flush()`);
  corre(m, `window.__rowab(1, ${JSON.stringify(String(p))})`);
  await esperar(100); corre(m, `window.__flush()`);
}

/* ══ La batería ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ── ESCENARIO 1 · línea a CRÉDITO por encima del cupo ── */
  const m1 = montar(js);
  await nuevoPedido(m1);
  await elegirCliente(m1);
  await elegirProvProd(m1);   // tipo por defecto = P1 (Crédito)

  const hayFila = corre(m1, `!!window.__c.querySelector(".ped-rowab")`);
  comprobar("se arma el pedido y aparece la fila de cantidad/precio", hayFila === true);

  await setCantPrecio(m1, 100, 15);   // 100 × 15 = 1500 > cupo 1000
  let est = corre(m1, `window.__estadoBoton("Agregar al pedido")`);
  let txt = corre(m1, `window.__txt()`);
  comprobar("línea a crédito por encima del cupo: «Agregar» sigue HABILITADO y sale el aviso «Excede el cupo»"
    + " (estado=" + est + ")",
    est === "ok" && /Excede el cupo de crédito/i.test(txt));

  /* al agregarla, la línea queda «por autorizar» (requiere:true) */
  corre(m1, `window.__botonPorTexto("Agregar al pedido")`);
  await esperar(150); corre(m1, `window.__flush()`);
  txt = corre(m1, `window.__txt()`);
  comprobar("al agregar la línea a crédito excedida, queda «por autorizar» (va a autorización)",
    /por autorizar/i.test(txt));

  /* ── ESCENARIO 2 · un CONTADO grande en el carrito no consume el cupo ── */
  const m2 = montar(js);
  await nuevoPedido(m2);
  await elegirCliente(m2);
  await elegirProvProd(m2);
  /* pasa la primera línea a CONTADO (P2) */
  corre(m2, `window.__botonPorTexto("Tipo de precio")`);
  await esperar(150); corre(m2, `window.__flush()`);
  corre(m2, `window.__modalBoton("Contado")`);
  await esperar(120); corre(m2, `window.__flush()`);
  corre(m2, `window.__modalBoton("Listo")`);
  await esperar(140); corre(m2, `window.__flush()`);
  await setCantPrecio(m2, 200, 15);   // contado 200 × 15 = 3000 (bien por encima del cupo)
  corre(m2, `window.__botonPorTexto("Agregar al pedido")`);   // se agrega (contado no bloquea)
  await esperar(160); corre(m2, `window.__flush()`);
  /* segunda línea, a CRÉDITO chica (agregarLinea resetea a P1 y limpia prov/prod) */
  await elegirProvProd(m2);
  await setCantPrecio(m2, 10, 10);    // crédito 10 × 10 = 100 (muy por debajo del cupo)
  txt = corre(m2, `window.__txt()`);
  comprobar("un CONTADO grande en el carrito NO consume el cupo: al armar un crédito chico no sale el aviso «Excede el cupo»",
    !/Excede el cupo de crédito/i.test(txt));

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito ══ */
const MUTANTES = [
  ["hace que el CONTADO consuma cupo: cuenta TODAS las líneas del carrito",
   `carrito.filter(it=>it.credito && it.tipo!=="P5")`,
   `carrito.filter(it=>true)`],
  ["hace que el exceso de cupo BLOQUEE: añade !excedeCupo a «valido»",
   `const valido = cli && !cli.bloqueado && prod && cantNum>0 && baseLista && precioOk && p5Ok && !bajoPiso;`,
   `const valido = cli && !cli.bloqueado && prod && cantNum>0 && baseLista && precioOk && p5Ok && !bajoPiso && !excedeCupo;`],
];

(async () => {
  console.log("═══ Paridad web · el cupo no bloquea (va a autorización) · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " + (ok + mal - 1) + ".");
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

  console.log("Resultado de paridad-cupo-web: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
