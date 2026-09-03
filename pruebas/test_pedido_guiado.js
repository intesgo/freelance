/* ═══════════════════════════════════════════════════════════════════════
   DISENO_PEDIDO_GUIADO · guía gráfica paso a paso (PedidosWeb · armar)

   Renderiza PedidosWeb y comprueba la guía visual: la barra de pasos derivada,
   los recuadros-guía (en vez de texto gris), el resaltado del paso activo (sin
   pointerEvents), el destello de «Agregar», y el momento clave de después de
   agregar un ítem (acuse que se apaga solo, «Agrega otro producto», el chip
   «Fija · un pedido = una piladora»).

   NO SE ESCRIBE EN LA BASE: el `supa` de aquí es un doble.
   Uso: node test_pedido_guiado.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets:["react"] }).code;

const ESPERADAS = 20;
let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));
console.log("═══ DISENO_PEDIDO_GUIADO · " + nombreApp);

const CLIENTES_BD = [
  { cli_id:"CLI-G1", nombre:"Guia Prueba", razon_social:"Guia Prueba S.A.", tipo:"Jurídica", ruc:"1790000789001",
    condicion_pago:"Crédito", cupo:100000, usado:0, bloqueado:false, activo:true, sub_id:"USR-1", estado_cliente:"ACTIVO" },
];
const PROVEEDORES_BD = [ { prov_cod:"PROV-G1", nombre:"Piladora Guia", es_demo:false } ];
const PRODUCTOS_BD  = [ { prod_id:"P-G", nombre:"Arroz Guia", linea:"Arroz", estado:"activo" } ];
const OFERTAS_BD = [
  { prod_id:"P-G", prov_cod:"PROV-G1", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
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
    window.__btnClass = function(sub){ var bs=window.__c.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0) return bs[i].className||""; } return ""; };
    /* la barra de pasos: el div .ped-pasos */
    window.__barra = function(){ return window.__c.querySelector(".ped-pasos"); };
    /* número del círculo ACTUAL (el que lleva el aro boxShadow) dentro de la barra */
    window.__ringNums = function(){ var b=window.__barra(); if(!b) return []; var sp=b.querySelectorAll("span"); var out=[];
      for(var i=0;i<sp.length;i++){ var bs=(sp[i].style&&sp[i].style.boxShadow)||""; if(bs.indexOf("5px")>=0) out.push((sp[i].textContent||"").trim()); } return out; };
    /* cuántos ✓ hay en la barra (pasos cumplidos) */
    window.__cumplidosBarra = function(){ var b=window.__barra(); if(!b) return 0; return (b.textContent||"").split("✓").length-1; };
    /* acuse: el ✓ que marca la línea recién agregada (span aria-hidden, fuera de la barra) */
    window.__acuseCount = function(){ return window.__c.querySelectorAll("span[data-acuse='1']").length; };
    window.__rowabHtml = function(){ var r=window.__c.querySelector(".ped-rowab"); return r?r.outerHTML:""; };
  `, ctx);
  return { ctx };
}
const corre = (m, e) => vm.runInContext(e, m.ctx);
const txt = (m) => corre(m, `window.__txt()`);
async function nuevoPedido(m) { corre(m, `window.__render()`); await esperar(300); corre(m, `window.__flush()`); corre(m, `window.__boton("+ Nuevo pedido")`); await esperar(160); corre(m, `window.__flush()`); }
async function elegirCliente(m) { corre(m, `window.__buscarEscribir("cliente", "Guia Prueba")`); await esperar(140); corre(m, `window.__flush()`); corre(m, `window.__buscarOpcion("cliente", "Guia Prueba")`); await esperar(160); corre(m, `window.__flush()`); }
async function elegirProvProd(m) {
  corre(m, `window.__buscarEscribir("proveedor", "Piladora")`); await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("proveedor", "Piladora Guia")`); await esperar(160); corre(m, `window.__flush()`);
  corre(m, `window.__buscarEscribir("catálogo", "Arroz Guia")`); await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("catálogo", "Arroz Guia")`); await esperar(160); corre(m, `window.__flush()`);
}
async function setCP(m, c, p) { corre(m, `window.__rowab(0, ${JSON.stringify(String(c))})`); await esperar(90); corre(m, `window.__flush()`); corre(m, `window.__rowab(1, ${JSON.stringify(String(p))})`); await esperar(90); corre(m, `window.__flush()`); }
const ring = (m) => corre(m, `window.__ringNums()`);

(async () => {
  const m = montar(); await nuevoPedido(m);
  /* ── SIN CLIENTE ── */
  let t = txt(m); let r = ring(m);
  comprobar("sin cliente, el paso activo es «Cliente» (círculo 1 con aro)", r.length===1 && r[0]==="1");
  comprobar("sin cliente, sale el recuadro-guía «Empieza por el cliente»", t.indexOf("Empieza por el cliente")>=0);
  comprobar("ya NO aparece el texto gris «Elige un cliente arriba»", t.indexOf("Elige un cliente arriba")<0);
  comprobar("nunca hay dos pasos marcados como ACTIVOS a la vez (sin cliente)", r.length===1);

  /* ── CON CLIENTE, SIN PROVEEDOR ── */
  await elegirCliente(m); t = txt(m); r = ring(m);
  comprobar("con cliente y sin proveedor, el paso activo es «Proveedor» (2)", r.length===1 && r[0]==="2");
  comprobar("una vez elegido, el nombre del cliente NO se atenúa (se sigue leyendo)", t.indexOf("Guia Prueba")>=0);
  comprobar("con cliente, sale el recuadro-guía «Ahora el proveedor»", t.indexOf("Ahora el proveedor")>=0);

  /* ── CON PRODUCTO, CANTIDAD VACÍA ── */
  await elegirProvProd(m); r = ring(m);
  comprobar("con producto y cantidad vacía, el paso activo es «Cantidad y precio» (4)", r.length===1 && r[0]==="4");
  comprobar("los pasos ya cumplidos se pintan con ✓ (al menos cliente, proveedor y producto)", corre(m, `window.__cumplidosBarra()`) >= 3);
  comprobar("lo atenuado usa opacity, NUNCA pointerEvents:none", corre(m, `window.__rowabHtml()`).indexOf("pointer-events: none") < 0);
  comprobar("«Agregar al pedido» NO lleva anim-pulso cuando aún no es válido", corre(m, `window.__btnClass("Agregar al pedido")`).indexOf("anim-pulso") < 0);
  comprobar("al abrir el armador no hay acuse (no se dispara solo)", corre(m, `window.__acuseCount()`) === 0);

  /* ── LÍNEA VÁLIDA ── */
  await setCP(m, 100, 10);
  comprobar("«Agregar al pedido» lleva anim-pulso cuando la línea es válida", corre(m, `window.__btnClass("Agregar al pedido")`).indexOf("anim-pulso") >= 0);

  /* ── DESPUÉS DE AGREGAR ── */
  corre(m, `window.__boton("Agregar al pedido")`); await esperar(160); corre(m, `window.__flush()`);
  t = txt(m);
  comprobar("con el carrito lleno, «Subir pedido» queda habilitado", corre(m, `window.__estadoBoton("Subir pedido")`) === "ok");
  comprobar("tras agregar, el rótulo del paso 3 dice «Agrega otro producto»", t.indexOf("Agrega otro producto")>=0);
  comprobar("tras agregar, sale el recuadro «Agrega otro producto de Piladora Guia» con el conteo", t.indexOf("Agrega otro producto de Piladora Guia")>=0 && t.indexOf("con los 1 que ya tienes")>=0);
  comprobar("la piladora sigue elegida tras agregar (no se pierde provSel)", t.indexOf("Piladora Guia")>=0);
  comprobar("con líneas en el carrito aparece el chip «Fija · un pedido = una piladora»", t.indexOf("Fija · un pedido = una piladora")>=0);
  comprobar("tras agregar, la línea nueva se marca con acuse (✓) y luego se apaga sola",
    corre(m, `window.__acuseCount()`) === 1);
  await esperar(1700); corre(m, `window.__flush()`);
  comprobar("el acuse desaparece solo a los ~1,5 s", corre(m, `window.__acuseCount()`) === 0);

  console.log("Resultado de pedido-guiado: " + ok + " ✓ · " + mal + " ✗ · " + (ok+mal) + " comprobaciones (esperadas " + ESPERADAS + ")");
  if (ok + mal !== ESPERADAS) { console.log("  ✗ AVISO: corrieron " + (ok+mal) + " y se esperaban " + ESPERADAS); process.exit(1); }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.stack || e).split("\n").slice(0,4).join("\n")); process.exit(1); });
