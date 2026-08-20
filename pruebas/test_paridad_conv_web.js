/* PED_TESTS_PARIDAD */
/* ═══════════════════════════════════════════════════════════════════════
   PARIDAD WEB · LA CONVERSIÓN A QUINTALES AL EDITAR UN PEDIDO EN LA OFICINA
   · sistema-web (módulo PedidosWeb, botón ✏️ · guardarCambiosPedido)

   Qué mide: cuando en el Sistema Web se edita un pedido y se agrega una línea
   en una presentación distinta al quintal (una ARROBA, equiv 0,25), lo que se
   manda a la base tiene que ir CONVERTIDO a quintales, igual que en la app:
     cantidad_qq = cantidad × equiv   ·   precio_qq = precio ÷ equiv
   Una arroba son 0,25 qq: 50 arrobas a $10 son 12,5 qq a $40/qq. Si se mandaran
   los números crudos (50 y 10), la base los tomaría como quintales y el pedido
   quedaría mal grabado.

   Cómo mide: renderiza PedidosWeb de VERDAD (React en JSDOM), con un doble de
   Supabase que trae UN pedido editable, no-demo, con su cliente, su piladora y
   un catálogo de ofertas (v_ofertas_vigentes) que incluye una oferta en ARROBA
   (equiv_qq 0,25) y otra en QUINTAL. Luego MANEJA la pantalla como un usuario:
   toca ✏️ (abrirEdicionArmar), elige la piladora, elige el producto en ARROBA
   (buscador predictivo: escribir + mousedown en la opción), pone cantidad 50 y
   precio 10, toca «Agregar al pedido» y «Guardar cambios». El doble atrapa el
   rpc editar_pedido_atomico y se revisa la línea de la arroba en p_items.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una a
   la vez, y se comprueba que la prueba SE CAE. Hay una rotura TONTA (multiplicar
   la cantidad por 2) además de la semántica (mandar los valores crudos).

   NO SE ESCRIBE EN LA BASE DE VERDAD: el `supa` de aquí es un doble.

   Uso: node test_paridad_conv_web.js [ruta.html]
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

/* ══ Datos de prueba, con la forma de producción (snake_case) ══ */
const CLIENTES_BD = [
  { cli_id:"CLI-A1", nombre:"Comercial Paridad", razon_social:"Comercial Paridad S.A.",
    tipo:"Jurídica", ruc:"1790000123001", condicion_pago:"Crédito", cupo:100000, usado:0,
    bloqueado:false, activo:true, sub_id:"USR-1", estado_cliente:"ACTIVO" },
];
const PROVEEDORES_BD = [
  { prov_cod:"PROV-A1", nombre:"Piladora Paridad", es_demo:false },
];
const PRODUCTOS_BD = [
  { prod_id:"P-ARROZ", nombre:"Arroz Prueba", linea:"Arroz", estado:"activo" },
];
/* Catálogo de ofertas vigentes: una en Quintal (equiv 1) y una en Arroba (equiv 0,25).
   La base de crédito de la arroba (9) queda por debajo de 10 para que el precio 10 sea válido. */
const OFERTAS_BD = [
  { prod_id:"P-ARROZ", prov_cod:"PROV-A1", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,
    costo:34, costo_contado:33, margen_min:8, precio_contado:37, precio_credito:38 },
  { prod_id:"P-ARROZ", prov_cod:"PROV-A1", pres_cod:"ARR", presentacion:"Arroba",  equiv_qq:0.25,
    costo:8.5, costo_contado:8.25, margen_min:8, precio_contado:9, precio_credito:9 },
];
/* Un pedido editable (ingresado), NO demo, con su cliente y su piladora anidados. */
const PEDIDOS_BD = [
  { ped_id:"PD-A1", cli_id:"CLI-A1", sub_id:"USR-1", prov_cod:"PROV-A1", ciudad:"Quito",
    estado:"ingresado", estado_comercial:"ingresado", estado_logistico:null, factura:null,
    condicion:"credito", creado:"2026-08-10T10:00:00", es_demo:false,
    clientes:{ nombre:"Comercial Paridad", razon_social:"Comercial Paridad S.A.", tipo:"Jurídica" },
    proveedores:{ nombre:"Piladora Paridad" } },
];
/* La línea que ya trae el pedido: un quintal (equiv 1), para que el editor abra con carrito. */
const PEDIDO_ITEMS_BD = [
  { item_id:"IT-A1", ped_id:"PD-A1", prod_id:"P-ARROZ", pres_cod:"QQ",
    descripcion:"Arroz Prueba · Quintal", cantidad_qq:100, precio_usd:20,
    tipo_precio:"P1", gratis_qq:0, condicion:"credito" },
];

function datosDe(t) {
  if (t === "clientes")            return CLIENTES_BD;
  if (t === "proveedores")         return PROVEEDORES_BD;
  if (t === "productos")           return PRODUCTOS_BD;
  if (t === "v_ofertas_vigentes")  return OFERTAS_BD;
  if (t === "pedidos")             return PEDIDOS_BD;
  if (t === "pedido_items")        return PEDIDO_ITEMS_BD;
  return [];   // presentaciones, tarifas_fe, zonas, ubicaciones… → vacío
}

function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.XLSX = null;

  const capturado = { rpc:[] };
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
    rpc: async (nombre, args) => { capturado.rpc.push({ nombre, args }); return { data:null, error:null }; },
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
    // Paso 1 del buscador predictivo: escribir en su input.
    window.__buscarEscribir = function(phSub, texto){
      var inp = window.__inp(phSub);
      if(!inp) return "no está el buscador ("+phSub+")";
      window.__escribir(inp, texto);
      return null;
    };
    // Paso 2: tocar (mousedown) la opción que calza dentro del desplegable de ese buscador.
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
    // Las dos casillas numéricas de la fila producto (0 = cantidad, 1 = precio).
    window.__rowab = function(i, val){
      var row = window.__c.querySelector(".ped-rowab");
      if(!row) return "no está la fila cantidad/precio";
      var nums = row.querySelectorAll("input[type=number]");
      if(nums.length<2) return "faltan las casillas de la fila ("+nums.length+")";
      window.__escribir(nums[i], String(val));
      return null;
    };
    // Botón por su texto. Devuelve "disabled" | "ok" | "no-existe".
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
    window.__click = function(sel){
      var b = window.__c.querySelector(sel);
      if(!b || b.disabled) return false;
      b.dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
      return true;
    };
    // El botón ✏️ (title="Editar pedido").
    window.__editar = function(){
      var bs = window.__c.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){
        if((bs[i].getAttribute("title")||"")==="Editar pedido"){
          bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
  `, ctx);
  return { ctx, w, capturado };
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* ══ La batería. Corre igual contra el bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  const m = montar(js);
  corre(m, `window.__render()`);
  await esperar(380);                    // que carguen pedidos, clientes y catálogo
  corre(m, `window.__flush()`);

  /* Toca ✏️ para editar el pedido en la vista Armar */
  const hayEditar = corre(m, `window.__editar()`);
  await esperar(160); corre(m, `window.__flush()`);
  comprobar("aparece el pedido editable y su botón ✏️ abre la edición", hayEditar === true);

  /* Elige la piladora (resetLinea la deja en blanco al abrir la edición) */
  corre(m, `window.__buscarEscribir("proveedor", "Piladora")`);
  await esperar(140); corre(m, `window.__flush()`);
  corre(m, `window.__buscarOpcion("proveedor", "Piladora Paridad")`);
  await esperar(160); corre(m, `window.__flush()`);

  /* Elige el producto EN ARROBA */
  const escP = corre(m, `window.__buscarEscribir("catálogo", "Arroba")`);
  await esperar(140); corre(m, `window.__flush()`);
  const opP = corre(m, `window.__buscarOpcion("catálogo", "Arroba")`);
  await esperar(160); corre(m, `window.__flush()`);
  comprobar("se puede elegir el producto en ARROBA en el buscador"
    + (escP ? " → " + escP : "") + (opP ? " → " + opP : ""),
    !escP && !opP);

  /* Cantidad 50 · precio 10 */
  const eC = corre(m, `window.__rowab(0, 50)`);
  await esperar(90); corre(m, `window.__flush()`);
  const eP = corre(m, `window.__rowab(1, 10)`);
  await esperar(90); corre(m, `window.__flush()`);

  /* Agregar al pedido (disabled si !valido) */
  const agr = corre(m, `window.__botonPorTexto("Agregar al pedido")`);
  await esperar(120); corre(m, `window.__flush()`);
  comprobar("«Agregar al pedido» está habilitado y agrega la línea de arroba"
    + (eC?" → "+eC:"") + (eP?" → "+eP:"") + (agr!=="ok"?" → "+agr:""),
    !eC && !eP && agr === "ok");

  /* Guardar cambios → editar_pedido_atomico */
  const guard = corre(m, `window.__botonPorTexto("Guardar cambios")`);
  await esperar(220); corre(m, `window.__flush()`);

  const edic = m.capturado.rpc.find(r => r.nombre === "editar_pedido_atomico");
  const items = (edic && edic.args && edic.args.p_items) || [];
  const arroba = items.find(it => it.pres_cod === "ARR");
  comprobar("se llama a editar_pedido_atomico con la línea de arroba"
    + (guard!=="ok"?" → "+guard:""),
    guard === "ok" && !!edic && !!arroba);

  /* EL CORAZÓN: la arroba va convertida a quintales (50×0,25=12,5 · 10÷0,25=40) */
  comprobar("la arroba se graba en quintales: cantidad_qq=12,5 y precio_qq=40"
    + (arroba ? " (llegó cantidad_qq=" + arroba.cantidad_qq + " precio_qq=" + arroba.precio_qq + ")" : ""),
    !!arroba && arroba.cantidad_qq === 12.5 && arroba.precio_qq === 40);

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito ══ */
const MUTANTES = [
  ["manda cantidad/precio CRUDOS, sin convertir a quintales (el defecto)",
   `          cantidad_qq:Math.round((Number(l.cant)||0)*eq*100)/100,
          precio_qq:Math.round(((Number(l.precio)||0)/eq)*100)/100,`,
   `          cantidad_qq:Number(l.cant),
          precio_qq:Number(l.precio),`],
  ["TONTA · multiplica la cantidad convertida por 2",
   `cantidad_qq:Math.round((Number(l.cant)||0)*eq*100)/100,`,
   `cantidad_qq:Math.round((Number(l.cant)||0)*eq*100)/100*2,`],
];

(async () => {
  console.log("═══ Paridad web · conversión al editar el pedido · " + nombreApp);
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

  console.log("Resultado de paridad-conversión-web: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
