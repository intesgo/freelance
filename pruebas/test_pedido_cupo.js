/* ═══════════════════════════════════════════════════════════════════════
   DISENO_PEDIDO_CUPO · la tarjeta de cupo del Sistema Web (PedidosWeb · armar)

   Renderiza PedidosWeb de verdad (React en JSDOM) y arma pedidos como el
   usuario. Vigila que la tarjeta de cupo:
   · cuente SOLO las líneas a crédito (contado y P5 no tocan el cupo);
   · siga visible aunque la línea en curso sea a contado;
   · no se pinte si el cliente no tiene cupo;
   · muestre el exceso en ÁMBAR («por autorizar»), nunca «Excedido» ni en rojo,
     sin bloquear el botón de agregar;
   · dé el MISMO disponible que el chip de la cabecera;
   · marque «POR AUTORIZAR» las líneas que lo requieren (aunque la comisión sea 0)
     y avise en el botón «Subir pedido».

   NO SE ESCRIBE EN LA BASE: el `supa` de aquí es un doble.
   Uso: node test_pedido_cupo.js [ruta.html]
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
console.log("═══ DISENO_PEDIDO_CUPO · " + nombreApp);

/* Cliente con cupo 3.000, sin deuda. Un segundo cliente con cupo 0. */
const CLIENTES_BD = [
  { cli_id:"CLI-C1", nombre:"Cupo Prueba", razon_social:"Cupo Prueba S.A.", tipo:"Jurídica", ruc:"1790000789001",
    condicion_pago:"Crédito", cupo:3000, usado:0, bloqueado:false, activo:true, sub_id:"USR-1", estado_cliente:"ACTIVO" },
  { cli_id:"CLI-Z0", nombre:"Sin Cupo", razon_social:"Sin Cupo S.A.", tipo:"Jurídica", ruc:"1790000000001",
    condicion_pago:"Contado", cupo:0, usado:0, bloqueado:false, activo:true, sub_id:"USR-1", estado_cliente:"ACTIVO" },
];
const PROVEEDORES_BD = [ { prov_cod:"PROV-C1", nombre:"Piladora Cupo", es_demo:false } ];
const PRODUCTOS_BD  = [ { prod_id:"P-CUPO", nombre:"Arroz Cupo", linea:"Arroz", estado:"activo" } ];
const OFERTAS_BD = [
  { prod_id:"P-CUPO", prov_cod:"PROV-C1", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
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
  w.supa = {
    auth: { getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } }),
            onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
            getUser: async () => ({ data:{ user:{ id:"u1" } } }), signOut: async () => ({}) },
    from: (t) => consulta(t, []), rpc: async () => ({ data:null, error:null }),
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) },
  };
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
    window.__buscarEscribir = function(phSub, texto){ var inp=window.__inp(phSub); if(!inp) return "no está el buscador ("+phSub+")"; window.__escribir(inp, texto); return null; };
    window.__buscarOpcion = function(phSub, opcSub){ var inp=window.__inp(phSub); if(!inp) return "no está el buscador ("+phSub+")"; var wrap=inp.parentNode, dd=null;
      for(var i=0;i<wrap.children.length;i++){ var c=wrap.children[i]; if(c.tagName==="DIV" && c.style && c.style.maxHeight==="220px"){ dd=c; break; } }
      if(!dd) return "no se abrió el desplegable ("+phSub+")"; var ops=dd.children;
      for(var j=0;j<ops.length;j++){ if((ops[j].textContent||"").toLowerCase().indexOf(opcSub.toLowerCase())>=0){ ops[j].dispatchEvent(new window.MouseEvent("mousedown",{bubbles:true})); return null; } } return "no apareció «"+opcSub+"»"; };
    window.__rowab = function(i, val){ var row=window.__c.querySelector(".ped-rowab"); if(!row) return "no está la fila cantidad/precio"; var nums=row.querySelectorAll("input[type=number]"); if(nums.length<2) return "faltan casillas"; window.__escribir(nums[i], String(val)); return null; };
    window.__boton = function(sub){ var bs=window.__c.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0){ if(bs[i].disabled) return "disabled"; bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return "ok"; } } return "no-existe"; };
    window.__estadoBoton = function(sub){ var bs=window.__c.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0) return bs[i].disabled?"disabled":"ok"; } return "no-existe"; };
    window.__overlay = function(){ var ds=window.__c.querySelectorAll("div"); for(var i=0;i<ds.length;i++){ if(ds[i].style && ds[i].style.zIndex==="120") return ds[i]; } return null; };
    window.__modalBoton = function(sub){ var ov=window.__overlay(); if(!ov) return "no-modal"; var bs=ov.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0){ if(bs[i].disabled) return "disabled"; bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return "ok"; } } return "no-existe"; };
    /* la tarjeta de cupo: el div que contiene el pie «Solo cuentan las líneas a crédito» */
    window.__cupo = function(){ var ds=window.__c.querySelectorAll("div"); var best=null;
      for(var i=0;i<ds.length;i++){ var t=ds[i].textContent||""; if(t.indexOf("Cupo de crédito")>=0 && t.indexOf("Solo cuentan las líneas")>=0){ if(!best||t.length<(best.textContent||"").length) best=ds[i]; } }
      return best ? { present:true, text:best.textContent||"" } : { present:false, text:"" }; };
    /* el chip de la cabecera del cliente elegido: «Cupo disponible $X» / «Cupo · se pasa por $Y» */
    window.__chipCupo = function(){ var sp=window.__c.querySelectorAll("span"); for(var i=0;i<sp.length;i++){ var t=sp[i].textContent||""; if(t.indexOf("Cupo disponible")===0 || t.indexOf("Cupo · se pasa")===0) return t; } return ""; };
  `, ctx);
  return { ctx };
}
const corre = (m, e) => vm.runInContext(e, m.ctx);
async function nuevoPedido(m) { corre(m, `window.__render()`); await esperar(300); corre(m, `window.__flush()`); corre(m, `window.__boton("+ Nuevo pedido")`); await esperar(160); corre(m, `window.__flush()`); }
async function elegirCliente(m, nombre) { corre(m, `window.__buscarEscribir("cliente", ${JSON.stringify(nombre)})`); await esperar(140); corre(m, `window.__flush()`); corre(m, `window.__buscarOpcion("cliente", ${JSON.stringify(nombre)})`); await esperar(160); corre(m, `window.__flush()`); }
async function elegirProvProd(m) {
  corre(m, `window.__buscarEscribir("proveedor", "Piladora")`); await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("proveedor", "Piladora Cupo")`); await esperar(160); corre(m, `window.__flush()`);
  corre(m, `window.__buscarEscribir("catálogo", "Arroz Cupo")`); await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("catálogo", "Arroz Cupo")`); await esperar(160); corre(m, `window.__flush()`);
}
async function setCP(m, c, p) { corre(m, `window.__rowab(0, ${JSON.stringify(String(c))})`); await esperar(90); corre(m, `window.__flush()`); corre(m, `window.__rowab(1, ${JSON.stringify(String(p))})`); await esperar(90); corre(m, `window.__flush()`); }
async function aContado(m) { corre(m, `window.__boton("Tipo de precio")`); await esperar(150); corre(m, `window.__flush()`); corre(m, `window.__modalBoton("Contado")`); await esperar(120); corre(m, `window.__flush()`); corre(m, `window.__modalBoton("Listo")`); await esperar(140); corre(m, `window.__flush()`); }
const cupo = (m) => corre(m, `window.__cupo()`);

(async () => {
  /* 1 · CONTADO en curso: no descuenta cupo (disponible entero) y la tarjeta sigue visible */
  let m = montar(); await nuevoPedido(m); await elegirCliente(m, "Cupo Prueba"); await elegirProvProd(m);
  await aContado(m); await setCP(m, 100, 10);   // contado 1.000
  let c = cupo(m);
  comprobar("con la línea EN CURSO a contado, la tarjeta de cupo SIGUE visible", c.present);
  comprobar("una línea a contado NO descuenta cupo (queda el cupo entero $3.000,00)", c.text.indexOf("Queda $3.000,00") >= 0);
  corre(m, `window.__boton("Agregar al pedido")`); await esperar(160); corre(m, `window.__flush()`);

  /* 2 · CRÉDITO descuenta por su importe exacto (crédito 1.000 → queda 2.000) */
  m = montar(); await nuevoPedido(m); await elegirCliente(m, "Cupo Prueba"); await elegirProvProd(m);
  await setCP(m, 100, 10);   // crédito 1.000
  c = cupo(m);
  comprobar("una línea a CRÉDITO descuenta el cupo por su importe (queda $2.000,00)", c.text.indexOf("Queda $2.000,00") >= 0);
  comprobar("estado «holgado» cuando sobra cupo", c.text.indexOf("Holgado") >= 0);
  comprobar("el chip de la cabecera y la tarjeta muestran el MISMO disponible",
    corre(m, `window.__chipCupo()`).indexOf("$2.000,00") >= 0 && c.text.indexOf("Queda $2.000,00") >= 0);

  /* 3 · exceso (crédito 3.500 > 3.000): ámbar «por autorizar», no «Excedido», no bloquea */
  m = montar(); await nuevoPedido(m); await elegirCliente(m, "Cupo Prueba"); await elegirProvProd(m);
  await setCP(m, 350, 10);   // crédito 3.500 → se pasa por 500
  c = cupo(m);
  comprobar("al pasarse, el sello dice «por autorizar» y NO «Excedido»", /por autorizar/i.test(c.text) && c.text.indexOf("Excedido") < 0);
  comprobar("al pasarse, la tarjeta muestra «Se pasa por $500,00»", c.text.indexOf("Se pasa por $500,00") >= 0);
  comprobar("al pasarse, el chip de la cabecera también dice «se pasa por $500,00»", /se pasa por \$500,00/i.test(corre(m, `window.__chipCupo()`)));
  comprobar("al pasarse, «Agregar al pedido» SIGUE habilitado", corre(m, `window.__estadoBoton("Agregar al pedido")`) === "ok");

  /* 4 · al agregar la línea excedida → chip POR AUTORIZAR y botón «queda por autorizar» */
  corre(m, `window.__boton("Agregar al pedido")`); await esperar(160); corre(m, `window.__flush()`);
  let t = corre(m, `window.__txt()`);
  comprobar("la línea excedida se marca «POR AUTORIZAR» en el resumen", /POR AUTORIZAR/.test(t));
  comprobar("con una línea por autorizar, «Subir pedido» dice «queda por autorizar»", /Subir pedido[^]*queda por autorizar/.test(t) || /queda por autorizar/.test(t));

  /* 5 · cliente sin cupo (0): la tarjeta NO se pinta */
  m = montar(); await nuevoPedido(m); await elegirCliente(m, "Sin Cupo"); await elegirProvProd(m);
  await aContado(m); await setCP(m, 50, 10);
  comprobar("con cliente sin cupo (0) la tarjeta de cupo NO se pinta", cupo(m).present === false);

  /* 6 · sin líneas por autorizar, «Subir pedido» normal (crédito dentro del cupo) */
  m = montar(); await nuevoPedido(m); await elegirCliente(m, "Cupo Prueba"); await elegirProvProd(m);
  await setCP(m, 100, 10); corre(m, `window.__boton("Agregar al pedido")`); await esperar(160); corre(m, `window.__flush()`);
  t = corre(m, `window.__txt()`);
  comprobar("sin líneas por autorizar, «Subir pedido» NO dice «queda por autorizar»", /Subir pedido/.test(t) && !/queda por autorizar/.test(t));

  console.log("Resultado de pedido-cupo: " + ok + " ✓ · " + mal + " ✗ · " + (ok+mal) + " comprobaciones (esperadas " + ESPERADAS + ")");
  if (ok + mal !== ESPERADAS) { console.log("  ✗ AVISO: corrieron " + (ok+mal) + " y se esperaban " + ESPERADAS); process.exit(1); }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.stack || e).split("\n").slice(0,4).join("\n")); process.exit(1); });
