/* PED_TESTS_PARIDAD */
/* ═══════════════════════════════════════════════════════════════════════
   PARIDAD WEB · EL PISO DEL PRECIO ESPECIAL (P5) EN LA OFICINA
   · sistema-web (módulo PedidosWeb · precio especial)

   Qué mide: cuando el freelance arma un pedido con PRECIO ESPECIAL (P5) en el
   Sistema Web, el precio no puede bajar del PISO = costo de la piladora según
   la condición × (1 + margen_min/100). Si el precio queda por debajo, el botón
   «Agregar al pedido» tiene que quedar DESHABILITADO y salir el aviso rojo del
   piso; si el precio llega al piso o lo pasa, se habilita.

   El piso depende de la CONDICIÓN elegida:
     · contado → costo_contado × (1 + margen_min/100)
     · crédito → costo         × (1 + margen_min/100)
   Con costo_contado=17, costo=18 y margen_min=8:
     · piso contado = 17 × 1,08 = 18,36
     · piso crédito = 18 × 1,08 = 19,44

   Cómo mide: renderiza PedidosWeb de VERDAD (React en JSDOM), como Freelance
   (el piso solo lo exige el freelance), y MANEJA la pantalla: nuevo pedido,
   elige cliente/piladora/producto, abre el cuadro de precio, toca «Precio
   especial», elige la condición, llena comisión y motivo, y prueba precios por
   debajo y por encima del piso, leyendo si «Agregar al pedido» queda
   habilitado o no.

   NACE ROJA a propósito: al final se rompe la regla en el código, una a la vez,
   y se comprueba que la prueba SE CAE. Hay una rotura TONTA (marcar SIEMPRE por
   debajo del piso) además de la semántica (quitar el piso).

   NO SE ESCRIBE EN LA BASE DE VERDAD: el `supa` de aquí es un doble.

   Uso: node test_paridad_piso_web.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

const ESPERADAS = 5;
const MUTANTES_ESPERADOS = 2;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

/* ══ Datos de prueba ══ */
const CLIENTES_BD = [
  { cli_id:"CLI-P1", nombre:"Piso Prueba", razon_social:"Piso Prueba S.A.",
    tipo:"Jurídica", ruc:"1790000456001", condicion_pago:"Contado", cupo:0, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-1", estado_cliente:"ACTIVO" },
];
const PROVEEDORES_BD = [
  { prov_cod:"PROV-P1", nombre:"Piladora Piso", es_demo:false },
];
const PRODUCTOS_BD = [
  { prod_id:"P-PISO", nombre:"Arroz Piso", linea:"Arroz", estado:"activo" },
];
/* Costos conocidos para el piso: contado 17, crédito 18, margen 8%. */
const OFERTAS_BD = [
  { prod_id:"P-PISO", prov_cod:"PROV-P1", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
    costo:18, costo_contado:17, margen_min:8, precio_contado:24, precio_credito:25 },
];

function datosDe(t) {
  if (t === "clientes")            return CLIENTES_BD;
  if (t === "proveedores")         return PROVEEDORES_BD;
  if (t === "productos")           return PRODUCTOS_BD;
  if (t === "v_ofertas_vigentes")  return OFERTAS_BD;
  return [];   // pedidos/pedido_items vacíos → arranca en pedido nuevo
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
    // El cuadro modal de detalles (overlay con zIndex 120)
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
    window.__modalInput = function(phSub, val){
      var ov = window.__overlay(); if(!ov) return "no-modal";
      var ins = ov.querySelectorAll("input");
      for(var i=0;i<ins.length;i++){
        if((ins[i].getAttribute("placeholder")||"").toLowerCase().indexOf(phSub.toLowerCase())>=0){
          window.__escribir(ins[i], val); return null;
        }
      }
      return "no-input "+phSub;
    };
  `, ctx);
  return { ctx, w };
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* Elige cliente → proveedor → producto en la vista Armar */
async function elegirBase(m) {
  corre(m, `window.__buscarEscribir("cliente", "Piso")`);
  await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("cliente", "Piso")`);
  await esperar(160); corre(m, `window.__flush()`);
  corre(m, `window.__buscarEscribir("proveedor", "Piladora")`);
  await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("proveedor", "Piladora Piso")`);
  await esperar(160); corre(m, `window.__flush()`);
  corre(m, `window.__buscarEscribir("catálogo", "Arroz Piso")`);
  await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("catálogo", "Arroz Piso")`);
  await esperar(160); corre(m, `window.__flush()`);
}

/* Reabre el cuadro de precio y elige la condición del P5 */
async function ponerCondicion(m, textoSeg) {
  corre(m, `window.__botonPorTexto("Tipo de precio")`);
  await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__modalBoton(${JSON.stringify(textoSeg)})`);
  await esperar(120); corre(m, `window.__flush()`);
  corre(m, `window.__modalBoton("Listo")`);
  await esperar(140); corre(m, `window.__flush()`);
}

async function ponerPrecio(m, val) {
  corre(m, `window.__rowab(1, ${JSON.stringify(String(val))})`);
  await esperar(110); corre(m, `window.__flush()`);
}

/* ══ La batería ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  const m = montar(js);
  corre(m, `window.__render()`);
  await esperar(320); corre(m, `window.__flush()`);

  /* Nuevo pedido */
  corre(m, `window.__botonPorTexto("+ Nuevo pedido")`);
  await esperar(160); corre(m, `window.__flush()`);
  await elegirBase(m);

  const hayFila = corre(m, `!!window.__c.querySelector(".ped-rowab")`);
  comprobar("se arma el pedido nuevo y aparece la fila de cantidad/precio", hayFila === true);

  /* Abre precio, elige P5, condición contado, comisión y motivo, cierra */
  corre(m, `window.__botonPorTexto("Tipo de precio")`);
  await esperar(150); corre(m, `window.__flush()`);
  corre(m, `window.__modalBoton("Precio especial")`);
  await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__modalBoton("Contado · piso")`);
  await esperar(120); corre(m, `window.__flush()`);
  corre(m, `window.__modalInput("0.00", "5")`);       // comisión propuesta
  await esperar(90); corre(m, `window.__flush()`);
  corre(m, `window.__modalInput("Ej:", "cliente mayorista volumen alto")`);  // motivo
  await esperar(90); corre(m, `window.__flush()`);
  corre(m, `window.__modalBoton("Listo")`);
  await esperar(150); corre(m, `window.__flush()`);

  /* Cantidad 10 (valido exige cantidad>0) */
  corre(m, `window.__rowab(0, "10")`);
  await esperar(110); corre(m, `window.__flush()`);

  /* Precio 18,00 (contado): por debajo del piso 18,36 → deshabilitado + aviso */
  await ponerPrecio(m, "18");
  let est = corre(m, `window.__estadoBoton("Agregar al pedido")`);
  let txt = corre(m, `window.__txt()`);
  comprobar("precio 18,00 (contado) por debajo del piso 18,36 → «Agregar» deshabilitado y sale el aviso del piso"
    + " (estado=" + est + ")",
    est === "disabled" && /debajo del piso/i.test(txt));

  /* Precio 18,36 (contado): en el piso → habilitado */
  await ponerPrecio(m, "18.36");
  est = corre(m, `window.__estadoBoton("Agregar al pedido")`);
  comprobar("precio 18,36 (contado) llega al piso → «Agregar» habilitado (estado=" + est + ")",
    est === "ok");

  /* Cambia a CRÉDITO: piso sube a 19,44 → 18,50 queda bloqueado */
  await ponerCondicion(m, "Crédito · piso");
  await ponerPrecio(m, "18.50");
  est = corre(m, `window.__estadoBoton("Agregar al pedido")`);
  comprobar("precio 18,50 en CRÉDITO (piso 19,44) → «Agregar» deshabilitado (estado=" + est + ")",
    est === "disabled");

  /* Vuelve a CONTADO: piso 18,36 → 18,50 se habilita */
  await ponerCondicion(m, "Contado · piso");
  await ponerPrecio(m, "18.50");
  est = corre(m, `window.__estadoBoton("Agregar al pedido")`);
  comprobar("precio 18,50 en CONTADO (piso 18,36) → «Agregar» habilitado (estado=" + est + ")",
    est === "ok");

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito ══ */
const MUTANTES = [
  ["quita el piso: compara contra 0 en vez del piso (el exceso ya no bloquea)",
   `precioNum < pisoUnidad`,
   `precioNum < 0`],
  ["TONTA · marca SIEMPRE por debajo del piso (bloquea todo)",
   `precioNum > 0 && precioNum < pisoUnidad`,
   `precioNum > 0`],
];

(async () => {
  console.log("═══ Paridad web · piso del precio especial (P5) · " + nombreApp);
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

  console.log("Resultado de paridad-piso-web: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
