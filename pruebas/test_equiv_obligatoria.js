/* PED_EQUIV_OBLIGATORIA */
/* ═══════════════════════════════════════════════════════════════════════
   TANDA 2D · SISTEMA WEB (PedidosWeb) · TRES REGLAS AL GUARDAR UN PEDIDO

   Ancla del código (sistema-web.html): PED_EQUIV_OBLIGATORIA.

   Se monta PedidosWeb DE VERDAD en JSDOM (sin modo demo, url intesgo.app/home),
   se maneja la pantalla como el usuario y se ESPÍA el RPC para ver SI se llamó y
   con qué carga (payload). NO se escribe en la base real: el RPC está simulado.

   Lo que amarra esta prueba:

   PARTE 1 · EQUIVALENCIA OBLIGATORIA. Una presentación que NO es Quintal y cuya
     equivalencia en quintales no es > 0 IMPIDE guardar: al pulsar «Subir pedido»
     sale un aviso que NOMBRA el producto y la presentación, y el RPC
     registrar_pedido_atomico NO se llama. Control: un producto en Quintal
     (equiv 1) SÍ se guarda (el RPC sí se llama).

   PARTE 2 · TIPO DE PRECIO POR CONDICIÓN al abrir una edición. Un ítem guardado
     como CONTADO sin tipo_precio se carga en el armador como P2 (Contado), no
     como P1. Al guardar los cambios, el payload de editar_pedido_atomico lleva
     tipo_precio "P2" en esa línea (canon P1=Crédito / P2=Contado).

   PARTE 3 · CANTIDAD DECIMAL. El quintal admite fracciones: una cantidad 12,5 se
     conserva (12,5, no 12) y viaja así en cantidad_presentacion del payload de
     registrar_pedido_atomico.

   NACE ROJA a propósito: al final se rompe cada regla en el fuente, una a la vez,
   y se comprueba que la batería SE CAE (los cuatro mutantes).

   NOTA (arreglado en 2D): antes el catálogo del armador saneaba `equiv_qq || 1`, así
   que una equivalencia 0/null quedaba en 1 ANTES de llegar al guard y el bloqueo nunca
   disparaba en el pedido nuevo. Ahora el catálogo usa `equivDePresentacionWeb`, que
   conserva el equiv real (0 para una presentación no-Quintal sin equivalencia) y solo
   da 1 al Quintal. Por eso aquí se siembra el producto malo con `equiv_qq:null` (el caso
   real de un dato faltante) y debe BLOQUEAR el guardado. El guard se mide por su
   comportamiento observable: bloquea, nombra producto y presentación, y no llama al RPC.

   Uso: node test_equiv_obligatoria.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const rutaWeb = R.app("sistema-web");
const htmlWeb = fs.readFileSync(rutaWeb, "utf-8");
const jsxWeb = htmlWeb.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones y mutantes se esperan (se declara ANTES de correr,
      para que una prueba borrada sin querer no pase inadvertida). ── */
const ESPERADAS = 6;            // P1 block (3) + P1 control (1) + P2 (1) + P3 (1)
const MUTANTES_ESPERADOS = 4;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

/* ══════════════════════════════════════════════════════════════════════
   SEED · un cliente de crédito válido (cupo alto, no bloqueado), un proveedor,
   dos productos:
     · «Arroz Malo»  en presentación Arroba con equivalencia INVÁLIDA (no > 0)
       → Parte 1 (debe bloquear).
     · «Arroz Bueno» en presentación Quintal con equiv 1
       → Parte 1 (control, no bloquea) y Parte 3 (decimales).
   Y un pedido editable (esperando_aprobacion) con una línea CONTADO sin
   tipo_precio → Parte 2.
   ══════════════════════════════════════════════════════════════════════ */
const CLIENTES_WEB_BD = [
  { cli_id:"CLI-CRED", nombre:"Cliente Crédito", razon_social:"Cliente Crédito S.A.", tipo:"Jurídica",
    ruc:"1790000000001", condicion_pago:"Crédito", cupo:1000000, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-1", canal:"Mayorista", estado_cliente:"ACTIVO" },
];
const CARTERA_BD = [];   // sin deuda pendiente → usado 0, nunca excede el cupo alto
const PROVEEDORES_WEB_BD = [ { prov_cod:"PROV-1", nombre:"Piladora Uno", es_demo:false } ];
const PRODUCTOS_WEB_BD = [
  { prod_id:"P-MALO",  nombre:"Arroz Malo",  linea:"Arroz", estado:"activo" },
  { prod_id:"P-BUENO", nombre:"Arroz Bueno", linea:"Arroz", estado:"activo" },
];
/* Ofertas vigentes = catálogo del armador (PRODS_PED). El campo equiv_qq alimenta
   `equiv` (vía equivDePresentacionWeb) y `presentacion` alimenta `unidad`.
   · Arroz Malo · Arroba con equiv_qq FALTANTE (null): el caso real. Con el arreglo 2D
     el catálogo NO lo sanea a 1 (queda en 0 por ser no-Quintal) y el guardado lo RECHAZA.
   · Arroz Bueno · Quintal con equiv_qq 1 (línea sana de control). */
const OFERTAS_WEB_BD = [
  { prod_id:"P-MALO",  prov_cod:"PROV-1", pres_cod:"ARR", presentacion:"Arroba", equiv_qq:null,
    costo:5, costo_contado:5, margen_min:0, precio_contado:10, precio_credito:10 },
  { prod_id:"P-BUENO", prov_cod:"PROV-1", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,
    costo:5, costo_contado:5, margen_min:0, precio_contado:10, precio_credito:10 },
];
/* Pedido editable con una línea CONTADO sin tipo_precio (Parte 2). */
const PEDIDOS_WEB_BD = [
  { ped_id:"PED-EDI", cli_id:"CLI-CRED", sub_id:"USR-1", prov_cod:"PROV-1", ciudad:"Machala",
    estado:"esperando_aprobacion", estado_comercial:"esperando_aprobacion", estado_logistico:null,
    factura:null, condicion:"contado", creado:"2026-08-20T10:00:00Z", es_demo:false,
    clientes:{ nombre:"Cliente Crédito", razon_social:"Cliente Crédito S.A.", tipo:"Jurídica" },
    proveedores:{ nombre:"Piladora Uno" } },
];
const PEDIDO_ITEMS_WEB_BD = [
  { item_id:"IT-CTDO", ped_id:"PED-EDI", prod_id:"P-BUENO", pres_cod:"QQ", promo_id:null,
    condicion:"contado", descripcion:"Arroz Bueno · Quintal", cantidad_qq:8, precio_usd:10,
    tipo_precio:null, gratis_qq:0, comision_usd:0 },
];

function datosWeb(t) {
  if (t === "clientes")           return CLIENTES_WEB_BD;
  if (t === "cartera_cliente")    return CARTERA_BD;
  if (t === "proveedores")        return PROVEEDORES_WEB_BD;
  if (t === "productos")          return PRODUCTOS_WEB_BD;
  if (t === "v_ofertas_vigentes") return OFERTAS_WEB_BD;
  if (t === "pedidos")            return PEDIDOS_WEB_BD;
  if (t === "pedido_items")       return PEDIDO_ITEMS_WEB_BD;
  return [];
}

/* ══════════════════════════════════════════════════════════════════════
   Montaje JSDOM (duplicado a propósito de los arneses web existentes) con el
   RPC INSTRUMENTADO: cada llamada se registra en estado.rpc = [{fn, args}] y
   devuelve {data:[{ped_id:"PED-NEW"}]} para registrar_pedido_atomico y
   {data:null} para editar_pedido_atomico. Así se afirma SI se llamó y con qué.
   ══════════════════════════════════════════════════════════════════════ */
function montarWeb(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.XLSX = null;

  const estado = { rpc: [] };

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
    from: (t) => consulta(t, []),
    /* ESPÍA del RPC · registra {fn, args} y devuelve la respuesta esperada por cada RPC. */
    rpc: async (nombre, args) => {
      estado.rpc.push({ fn: nombre, args });
      if (nombre === "registrar_pedido_atomico") return { data:[{ ped_id:"PED-NEW" }], error:null };
      if (nombre === "editar_pedido_atomico")    return { data:null, error:null };
      return { data:null, error:null };
    },
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
    window.__dropdown = function(phSub){
      var inp = window.__inp(phSub);
      if(!inp) return null;
      var wrap = inp.parentNode;
      for(var i=0;i<wrap.children.length;i++){
        var c = wrap.children[i];
        if(c.tagName==="DIV" && c.style && c.style.maxHeight==="220px") return c;
      }
      return null;
    };
    window.__buscarOpcion = function(phSub, opcSub){
      var dd = window.__dropdown(phSub);
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
    /* Fila cantidad/precio del armador (.ped-rowab): dos input[type=number]. */
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
    /* Lista de pedidos: cada fila es un <div> con 8 columnas; el lápiz «Editar
       pedido» es el botón de la última. */
    window.__filaDe = function(nombre){
      var divs = window.__c.querySelectorAll("div");
      for(var i=0;i<divs.length;i++){
        var d = divs[i];
        if(d.children.length===8 && (d.textContent||"").indexOf(nombre)>=0) return d;
      }
      return null;
    };
    window.__clickEditar = function(nombre){
      var fila = window.__filaDe(nombre);
      if(!fila) return "sin-fila";
      var b = fila.querySelector('button[title="Editar pedido"]');
      if(!b) return "sin-boton";
      b.dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
      return "ok";
    };
  `, ctx);
  return { ctx, w, estado };
}
const correW = (m, expr) => vm.runInContext(expr, m.ctx);

/* ── Manejo de la pantalla ─────────────────────────────────────────────── */
async function montarListo(js) {
  const m = montarWeb(js);
  correW(m, `window.__render()`);
  await esperar(340); correW(m, `window.__flush()`);
  await esperar(160); correW(m, `window.__flush()`);
  return m;
}
async function nuevoPedido(m) {
  correW(m, `window.__botonPorTexto("+ Nuevo pedido")`);
  await esperar(160); correW(m, `window.__flush()`);
}
async function elegirCliente(m, sub) {
  correW(m, `window.__buscarEscribir("cliente", ${JSON.stringify(sub)})`);
  await esperar(150); correW(m, `window.__flush()`);
  correW(m, `window.__buscarOpcion("cliente", ${JSON.stringify(sub)})`);
  await esperar(160); correW(m, `window.__flush()`);
}
async function elegirProvProd(m, provSub, prodSub) {
  correW(m, `window.__buscarEscribir("proveedor", ${JSON.stringify(provSub)})`);
  await esperar(140); correW(m, `window.__flush()`);
  correW(m, `window.__buscarOpcion("proveedor", ${JSON.stringify(provSub)})`);
  await esperar(160); correW(m, `window.__flush()`);
  correW(m, `window.__buscarEscribir("catálogo", ${JSON.stringify(prodSub)})`);
  await esperar(140); correW(m, `window.__flush()`);
  correW(m, `window.__buscarOpcion("catálogo", ${JSON.stringify(prodSub)})`);
  await esperar(160); correW(m, `window.__flush()`);
}
async function setCantPrecio(m, c, p) {
  correW(m, `window.__rowab(0, ${JSON.stringify(String(c))})`);
  await esperar(100); correW(m, `window.__flush()`);
  correW(m, `window.__rowab(1, ${JSON.stringify(String(p))})`);
  await esperar(100); correW(m, `window.__flush()`);
}
/* Arma un pedido NUEVO con un producto y devuelve el estado tras «Subir pedido». */
async function armarYSubir(js, { prodSub, cant, precio }) {
  const m = await montarListo(js);
  await nuevoPedido(m);
  await elegirCliente(m, "Cliente Crédito");
  await elegirProvProd(m, "Piladora", prodSub);
  await setCantPrecio(m, cant, precio);
  const agrego = correW(m, `window.__botonPorTexto("Agregar al pedido")`);
  await esperar(150); correW(m, `window.__flush()`);
  const subio = correW(m, `window.__botonPorTexto("Subir pedido")`);
  await esperar(220); correW(m, `window.__flush()`);
  return {
    agrego, subio,
    txt: correW(m, `window.__txt()`),
    rpc: m.estado.rpc,
  };
}

/* ══ La batería (Partes 1–3). Se corre igual contra el código bueno y los
      mutantes. ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ─── PARTE 1 · equivalencia obligatoria BLOQUEA (Arroz Malo · Arroba) ─── */
  const p1 = await armarYSubir(js, { prodSub:"Arroz Malo", cant:10, precio:10 });
  const regMalo = p1.rpc.filter(r => r.fn === "registrar_pedido_atomico");
  comprobar("P1 · la línea de «Arroz Malo» se agregó al carrito (agregar=" + p1.agrego + ")",
    p1.agrego === "ok");
  comprobar("P1 · el aviso nombra el producto «Arroz Malo» y la presentación «Arroba»",
    /Arroz Malo/.test(p1.txt || "") && /Arroba/.test(p1.txt || "")
      && /no tiene equivalencia/.test(p1.txt || ""));
  comprobar("P1 · registrar_pedido_atomico NO se llamó (el guard detuvo el guardado)"
    + " (llamadas=" + regMalo.length + ")",
    regMalo.length === 0);

  /* ─── PARTE 1 (control) · Quintal equiv 1 SÍ guarda (Arroz Bueno) ─── */
  const p1c = await armarYSubir(js, { prodSub:"Arroz Bueno", cant:10, precio:10 });
  const regBueno = p1c.rpc.filter(r => r.fn === "registrar_pedido_atomico");
  comprobar("P1 control · «Arroz Bueno» (Quintal, equiv 1) SÍ llama registrar_pedido_atomico"
    + " (agregar=" + p1c.agrego + " · subir=" + p1c.subio + " · llamadas=" + regBueno.length + ")",
    regBueno.length === 1);

  /* ─── PARTE 3 · cantidad decimal 12,5 se conserva en el payload ─── */
  /* El input de cantidad es type=number: la coma la rechaza el saneo del
     navegador (→ ""), así que se escribe con PUNTO "12.5"; numDecWeb da 12.5. */
  const p3 = await armarYSubir(js, { prodSub:"Arroz Bueno", cant:"12.5", precio:10 });
  const regDec = p3.rpc.filter(r => r.fn === "registrar_pedido_atomico");
  const cantEnviada = regDec.length
    ? ((((regDec[0].args||{}).p_payload||{}).items||[])[0]||{}).cantidad_presentacion
    : undefined;
  comprobar("P3 · cantidad 12,5 viaja como 12.5 en cantidad_presentacion (no 12)"
    + " (enviada=" + cantEnviada + ")",
    cantEnviada === 12.5);

  /* ─── PARTE 2 · tipo_precio por condición al cargar la edición ─── */
  const m2 = await montarListo(js);
  correW(m2, `window.__clickEditar("Cliente Crédito")`);   // abre la edición en la vista Armar
  await esperar(220); correW(m2, `window.__flush()`);
  correW(m2, `window.__botonPorTexto("Guardar cambios")`);
  await esperar(240); correW(m2, `window.__flush()`);
  const edit = m2.estado.rpc.filter(r => r.fn === "editar_pedido_atomico");
  const items2 = edit.length ? ((edit[0].args||{}).p_items || []) : [];
  const tipoLinea = items2.length ? items2[0].tipo_precio : undefined;
  comprobar("P2 · la línea CONTADO sin tipo_precio se guarda como «P2» en el payload de editar_pedido_atomico"
    + " (editar=" + edit.length + " · tipo=" + tipoLinea + ")",
    edit.length >= 1 && tipoLinea === "P2");

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══
   Cada mutante toca el ORIGEN de una regla. Se verifica que el trozo aparezca
   UNA sola vez antes de reemplazarlo. ══ */
const MUTANTES = [
  /* (1) EQUIVALENCIA · el guard nunca bloquea → «Arroz Malo» se guarda y
         registrar_pedido_atomico se llama → cae la Parte 1. */
  ["equivInvalidaWeb nunca bloquea (return false)",
    `const equivInvalidaWeb = (l) => { const u=String((l&&l.unidad)||"").toLowerCase(); const esQuintal=u.includes("quintal")||u==="qq"; return !esQuintal && !(Number(l&&l.equiv)>0); };`,
    `const equivInvalidaWeb = (l) => { return false; };`],
  /* (2) TIPO DE PRECIO · vuelve al fijo "P1": la línea contado carga P1 y el
         payload lleva P1 → cae la Parte 2. */
  ["fallback de tipo_precio fijo a P1 (ignora la condición)",
    `const tipo = it.tipo_precio || (it.condicion==="contado" ? "P2" : "P1");`,
    `const tipo = it.tipo_precio || "P1";`],
  /* (3) DECIMALES · vuelve a parseInt: 12,5 se trunca a 12 → cae la Parte 3. */
  ["cantidad con parseInt (trunca los decimales)",
    `const cantNum = numDecWeb(cant);`,
    `const cantNum = parseInt(cant)||0;`],
  /* (4) SANEO DEL CATÁLOGO · vuelve al `Number(o.equiv_qq)||1`: el equiv null se
         convierte en 1 ANTES del guard, «Arroz Malo» ya no llega inválido y se guarda
         → cae la Parte 1 (el guard queda intacto pero nunca ve el equiv malo). */
  ["catálogo vuelve a enmascarar equiv_qq a 1 (Number(o.equiv_qq)||1)",
    `unidad: pres, equiv: equivDePresentacionWeb(o.equiv_qq, pres),`,
    `unidad: pres, equiv: Number(o.equiv_qq) || 1,`],
];

(async () => {
  console.log("═══ TANDA 2D · equivalencia obligatoria / tipo por condición / cantidad decimal · sistema-web");
  console.log("    Comprobaciones: " + ESPERADAS + " (P1: 3 · P1 control: 1 · P2: 1 · P3: 1) · mutantes: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsxWeb, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (r.ok + r.mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
      (r.ok + r.mal) + ". Alguna se perdió o se agregó sin declararla.");
  }

  console.log("  · rompiendo cada regla a propósito (la prueba debe caerse):");
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

  console.log("Resultado equiv-obligatoria: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
