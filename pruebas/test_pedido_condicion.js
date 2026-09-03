/* ═══════════════════════════════════════════════════════════════════════
   DISENO_PEDIDO_CONDICION · contado / crédito / mixto visibles (PedidosWeb)

   Renderiza PedidosWeb y arma pedidos como el usuario. Vigila que:
   · un pedido diga si es a contado, a crédito o mixto (chip);
   · el caso mixto se explique y se registre como CRÉDITO (informativo, no bloquea);
   · cada línea muestre su condición (Crédito/Contado) sin repetir «Crédito · Crédito»;
   · la tarjeta de cupo explique lo que va a contado (no toca el cupo) y el cupo
     consumido sea SOLO el de las líneas a crédito.

   NO SE ESCRIBE EN LA BASE: el `supa` de aquí es un doble.
   Uso: node test_pedido_condicion.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets:["react"] }).code;

const ESPERADAS = 13;
let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));
console.log("═══ DISENO_PEDIDO_CONDICION · " + nombreApp);

const CLIENTES_BD = [
  { cli_id:"CLI-C1", nombre:"Cond Prueba", razon_social:"Cond Prueba S.A.", tipo:"Jurídica", ruc:"1790000789001",
    condicion_pago:"Crédito", cupo:100000, usado:0, bloqueado:false, activo:true, sub_id:"USR-1", estado_cliente:"ACTIVO" },
];
const PROVEEDORES_BD = [ { prov_cod:"PROV-C1", nombre:"Piladora Cond", es_demo:false } ];
const PRODUCTOS_BD  = [ { prod_id:"P-CO", nombre:"Arroz Cond", linea:"Arroz", estado:"activo" } ];
const OFERTAS_BD = [
  { prod_id:"P-CO", prov_cod:"PROV-C1", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
    costo:9, costo_contado:9, margen_min:0, precio_contado:10, precio_credito:10 },
];
function datosDe(t) {
  if (t === "clientes")           return CLIENTES_BD;
  if (t === "proveedores")        return PROVEEDORES_BD;
  if (t === "productos")          return PRODUCTOS_BD;
  if (t === "v_ofertas_vigentes") return OFERTAS_BD;
  return [];
}
function montar() {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied"; w.XLSX = null;
  function consulta(tabla, filtros) {
    const resolver = () => { let filas = datosDe(tabla).slice();
      filtros.forEach(f => { if (f[0]==="eq") filas=filas.filter(r=>r[f[1]]===f[2]); if (f[0]==="neq") filas=filas.filter(r=>r[f[1]]!==f[2]); if (f[0]==="in") filas=filas.filter(r=>(f[2]||[]).indexOf(r[f[1]])>=0); });
      return Promise.resolve({ data:filas, error:null }); };
    const con = (t,c,v) => consulta(tabla, filtros.concat([[t,c,v]]));
    const enc = { select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, is:()=>enc, range:()=>enc, filter:()=>enc,
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), in:(c,v)=>con("in",c,v),
      then:(a,b)=>resolver().then(a,b), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:null })),
      insert:()=>Promise.resolve({ error:null }), upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => Promise.resolve({ error:null }); return r; },
      delete:()=>({ eq:()=>Promise.resolve({ error:null }) }) };
    return enc;
  }
  w.supa = { auth: { getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } }),
      onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }), getUser: async () => ({ data:{ user:{ id:"u1" } } }), signOut: async () => ({}) },
    from: (t) => consulta(t, []), rpc: async () => ({ data:null, error:null }),
    functions: { invoke: async () => ({ data:{}, error:null }) }, storage: { from: () => ({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) } };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__render = function(){ window.__c = document.createElement("div"); document.body.appendChild(window.__c);
      ReactDOM.flushSync(function(){ ReactDOM.createRoot(window.__c).render(React.createElement(PedidosWeb, {
        usuario:{ usuario:"richard", nombre:"Richard Ramírez", cargo:"freelance", rol:"Freelance", empresaId:"ORG-001", secciones:[] } })); }); };
    window.__flush = function(){ ReactDOM.flushSync(function(){}); };
    window.__txt = function(){ return (window.__c && window.__c.textContent) || ""; };
    var setV = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
    window.__escribir = function(inp, txt){ if(!inp) return false; setV.call(inp, txt); inp.dispatchEvent(new window.Event("input",{bubbles:true})); return true; };
    window.__inp = function(phSub){ var ins=window.__c.querySelectorAll("input"); for(var i=0;i<ins.length;i++){ var ph=(ins[i].getAttribute("placeholder")||"").toLowerCase(); if(ph.indexOf(phSub.toLowerCase())>=0) return ins[i]; } return null; };
    window.__buscarEscribir = function(phSub, texto){ var inp=window.__inp(phSub); if(!inp) return "no está ("+phSub+")"; window.__escribir(inp, texto); return null; };
    window.__buscarOpcion = function(phSub, opcSub){ var inp=window.__inp(phSub); if(!inp) return "no está ("+phSub+")"; var wrap=inp.parentNode, dd=null;
      for(var i=0;i<wrap.children.length;i++){ var c=wrap.children[i]; if(c.tagName==="DIV" && c.style && c.style.maxHeight==="220px"){ dd=c; break; } }
      if(!dd) return "no dd"; var ops=dd.children; for(var j=0;j<ops.length;j++){ if((ops[j].textContent||"").toLowerCase().indexOf(opcSub.toLowerCase())>=0){ ops[j].dispatchEvent(new window.MouseEvent("mousedown",{bubbles:true})); return null; } } return "no opc"; };
    window.__rowab = function(i, val){ var row=window.__c.querySelector(".ped-rowab"); if(!row) return "no row"; var nums=row.querySelectorAll("input[type=number]"); if(nums.length<2) return "no nums"; window.__escribir(nums[i], String(val)); return null; };
    window.__boton = function(sub){ var bs=window.__c.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0){ if(bs[i].disabled) return "disabled"; bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return "ok"; } } return "no-existe"; };
    window.__estadoBoton = function(sub){ var bs=window.__c.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0) return bs[i].disabled?"disabled":"ok"; } return "no-existe"; };
    window.__overlay = function(){ var ds=window.__c.querySelectorAll("div"); for(var i=0;i<ds.length;i++){ if(ds[i].style && ds[i].style.zIndex==="120") return ds[i]; } return null; };
    window.__modalBoton = function(sub){ var ov=window.__overlay(); if(!ov) return "no-modal"; var bs=ov.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0){ if(bs[i].disabled) return "disabled"; bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return "ok"; } } return "no-existe"; };
    window.__cuenta = function(sub){ var t=window.__txt(); return t.split(sub).length-1; };
  `, ctx);
  return { ctx };
}
const corre = (m, e) => vm.runInContext(e, m.ctx);
const txt = (m) => corre(m, `window.__txt()`);
async function nuevoPedido(m) { corre(m, `window.__render()`); await esperar(300); corre(m, `window.__flush()`); corre(m, `window.__boton("+ Nuevo pedido")`); await esperar(160); corre(m, `window.__flush()`); }
async function elegirCliente(m) { corre(m, `window.__buscarEscribir("cliente", "Cond Prueba")`); await esperar(140); corre(m, `window.__flush()`); corre(m, `window.__buscarOpcion("cliente", "Cond Prueba")`); await esperar(160); corre(m, `window.__flush()`); }
async function elegirProvProd(m) {
  corre(m, `window.__buscarEscribir("proveedor", "Piladora")`); await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("proveedor", "Piladora Cond")`); await esperar(160); corre(m, `window.__flush()`);
  corre(m, `window.__buscarEscribir("catálogo", "Arroz Cond")`); await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("catálogo", "Arroz Cond")`); await esperar(160); corre(m, `window.__flush()`);
}
async function setCP(m, c, p) { corre(m, `window.__rowab(0, ${JSON.stringify(String(c))})`); await esperar(90); corre(m, `window.__flush()`); corre(m, `window.__rowab(1, ${JSON.stringify(String(p))})`); await esperar(90); corre(m, `window.__flush()`); }
async function aContado(m) { corre(m, `window.__boton("Tipo de precio")`); await esperar(150); corre(m, `window.__flush()`); corre(m, `window.__modalBoton("Contado")`); await esperar(120); corre(m, `window.__flush()`); corre(m, `window.__modalBoton("Listo")`); await esperar(140); corre(m, `window.__flush()`); }
async function agregarCredito(m, c, p) { await elegirProvProd(m); await setCP(m, c, p); corre(m, `window.__boton("Agregar al pedido")`); await esperar(160); corre(m, `window.__flush()`); }
async function agregarContado(m, c, p) { await elegirProvProd(m); await aContado(m); await setCP(m, c, p); corre(m, `window.__boton("Agregar al pedido")`); await esperar(160); corre(m, `window.__flush()`); }

(async () => {
  /* carrito vacío → no hay chip de condición */
  let m = montar(); await nuevoPedido(m); await elegirCliente(m);
  let t = txt(m);
  comprobar("carrito vacío: no se pinta chip de condición", t.indexOf("Pedido a crédito")<0 && t.indexOf("Pedido a contado")<0 && t.indexOf("Mixto ·")<0);

  /* solo crédito */
  await agregarCredito(m, 100, 10);
  t = txt(m);
  comprobar("solo líneas a crédito → chip «Pedido a crédito»", t.indexOf("Pedido a crédito")>=0);
  comprobar("la línea a crédito NO repite «Crédito · Crédito»", t.indexOf("Crédito · Crédito")<0);
  comprobar("en NO mixto, NO aparece el recuadro «se registrará como pedido a CRÉDITO»", t.indexOf("registrará como pedido a CRÉDITO")<0);
  comprobar("sin líneas a contado, la tarjeta de cupo NO muestra el renglón «A contado»", t.indexOf("A contado (no toca el cupo)")<0);

  /* solo contado */
  m = montar(); await nuevoPedido(m); await elegirCliente(m); await agregarContado(m, 100, 10);
  t = txt(m);
  comprobar("solo líneas a contado → chip «Pedido a contado»", t.indexOf("Pedido a contado")>=0);
  comprobar("una línea a contado muestra «Contado» en el resumen", /· Contado/.test(t));
  comprobar("con líneas a contado (cliente con cupo), la tarjeta muestra «A contado (no toca el cupo)»", t.indexOf("A contado (no toca el cupo)")>=0);

  /* mixto: una a crédito + una a contado */
  m = montar(); await nuevoPedido(m); await elegirCliente(m);
  await agregarCredito(m, 100, 10);   // crédito 1.000
  await agregarContado(m, 200, 10);   // contado 2.000
  t = txt(m);
  comprobar("crédito + contado → chip «Mixto · 1 a crédito, 1 a contado»", t.indexOf("Mixto · 1 a crédito, 1 a contado")>=0);
  comprobar("en mixto sale el recuadro «se registrará como pedido a CRÉDITO»", /registrará como pedido a CRÉDITO/.test(t));
  comprobar("en mixto la tarjeta de cupo muestra «A contado (no toca el cupo)» $2.000,00", t.indexOf("A contado (no toca el cupo)")>=0 && t.indexOf("$2.000,00")>=0);
  comprobar("el cupo consumido es SOLO el crédito (queda $99.000,00, no descuenta el contado)", t.indexOf("Queda $99.000,00")>=0);
  comprobar("mezclar líneas NO bloquea «Subir pedido»", corre(m, `window.__estadoBoton("Subir pedido")`) === "ok");

  console.log("Resultado de pedido-condicion: " + ok + " ✓ · " + mal + " ✗ · " + (ok+mal) + " comprobaciones (esperadas " + ESPERADAS + ")");
  if (ok + mal !== ESPERADAS) { console.log("  ✗ AVISO: corrieron " + (ok+mal) + " y se esperaban " + ESPERADAS); process.exit(1); }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.stack || e).split("\n").slice(0,4).join("\n")); process.exit(1); });
