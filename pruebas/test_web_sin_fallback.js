/* PED_TESTS_PARIDAD */
/* ═══════════════════════════════════════════════════════════════════════
   SIN RESPALDO DEMO NI PEDIDO FANTASMA · sistema-web (módulo PedidosWeb)

   Qué mide, en la pantalla de Pedidos de la OFICINA, en modo VIVO (sin
   ?demo=1), tres reglas que protegen la verdad de lo que se ve:

   (a) SIN SESIÓN, NO HAY PEDIDO APARENTE. Si al «Subir pedido» no hay sesión,
       la web (que NO tiene cola offline como la app del campo) NO puede
       aparentar que guardó: no pinta ninguna tarjeta y avisa «No se guardó».
       Antes se pintaba una tarjeta fantasma que nunca llegaba a la base.

   (b) SI LA CARGA REAL FALLA, NO SE CAE A DATOS DEMO. Con los clientes y las
       ofertas caídos, la pantalla NO muestra los clientes/productos de
       demostración: avisa cuál fuente falló, ofrece «Reintentar» y deja el
       botón «Subir pedido» deshabilitado. Los arreglos demo (CLIENTES_WEB /
       PRODUCTOS_WEB) solo se usan con ?demo=1.

   (c) AL GUARDAR BIEN, LA FECHA ES LA DE HOY, NO UNA FIJA. La tarjeta local
       nace con la fecha REAL de hoy (zona Ecuador), nunca con la vieja fecha
       fija «2026-06-13».

   Cómo mide, renderiza PedidosWeb de VERDAD (React en JSDOM, sin ?demo=1 →
   MODO_DEMO_WEB false → «modo vivo»), con un doble de Supabase que en cada
   escenario responde distinto (sin sesión / con las fuentes caídas / con la
   RPC en verde y un refresco DEMORADO). Luego MANEJA la pantalla como un
   usuario: abre «Nuevo pedido», elige cliente → piladora → producto en los
   buscadores predictivos, pone cantidad y precio y toca los botones.

   NACE ROJA a propósito, al final se rompe cada regla en el código fuente,
   una a la vez, y se comprueba que la batería SE CAE.

   NO SE ESCRIBE EN LA BASE DE VERDAD, el `supa` de aquí es un doble.

   Uso: node test_web_sin_fallback.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* Cuántas comprobaciones y mutantes se esperan. Se declaran ANTES de correr
   para que una que se borre sin querer no pase inadvertida. */
const ESPERADAS = 10;
const MUTANTES_ESPERADOS = 3;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

/* HOY en Ecuador, calculado igual que `hoyECWeb` del archivo, para poder
   comparar la fecha que pinta la tarjeta. La lista muestra la fecha como
   dd/mm/aaaa (fecha.split("-").reverse().join("/")). */
function hoyEC() {
  const p = {};
  new Intl.DateTimeFormat("en-CA", { timeZone:"America/Guayaquil", year:"numeric", month:"2-digit", day:"2-digit" })
    .formatToParts(new Date()).forEach(x => { if (x.type !== "literal") p[x.type] = x.value; });
  return `${p.year}-${p.month}-${p.day}`;
}
const HOY_ISO = hoyEC();                                   // 2026-08-21
const HOY_DMY = HOY_ISO.split("-").reverse().join("/");    // 21/08/2026

/* ══ Datos de prueba, con la forma exacta de producción (snake_case) ══
   Nombres BIEN distintos de los del demo, para no confundirlos. */
const CLIENTES_BD = [
  { cli_id:"CLI-SS", nombre:"Comercial Sin Sesion", razon_social:"Comercial Sin Sesion SA",
    ruc:"1790000777001", sub_id:"USR-1", condicion_pago:"Contado", cupo:50000, usado:0,
    bloqueado:false, canal:"Mayorista", estado_cliente:"ACTIVO", activo:true },
];
const PROVEEDORES_BD = [
  { prov_cod:"PROV-SS", nombre:"Piladora Sin Sesion", es_demo:false },
];
const PRODUCTOS_BD = [
  { prod_id:"P-SS", nombre:"Arroz Sin Sesion", linea:"Arroz", estado:"activo" },
];
/* Una oferta vigente en Quintal (equiv 1). La base de crédito (38) queda por
   debajo del precio de venta 40, para que la línea sea válida. */
const OFERTAS_BD = [
  { prod_id:"P-SS", prov_cod:"PROV-SS", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
    costo:34, costo_contado:33, margen_min:8, precio_contado:37, precio_credito:38 },
];
/* Escenario (c), lo que devuelve el refresco (cargarPedidosVivos) TRAS guardar,
   un pedido con fecha de HOY. Solo aparece una vez que la RPC se llamó. */
const PEDIDOS_BD_C = [
  { ped_id:"PED-NUEVO-1", cli_id:"CLI-SS", sub_id:"USR-1", prov_cod:"PROV-SS", ciudad:"Quito",
    estado:"ingresado", estado_comercial:"ingresado", estado_logistico:null, factura:null,
    condicion:"contado", creado:HOY_ISO+"T10:00:00", es_demo:false,
    clientes:{ nombre:"Comercial Sin Sesion", razon_social:"Comercial Sin Sesion SA", tipo:"Jurídica" },
    proveedores:{ nombre:"Piladora Sin Sesion" } },
];
const PEDIDO_ITEMS_BD_C = [
  { item_id:"IT-N1", ped_id:"PED-NUEVO-1", prod_id:"P-SS", pres_cod:"QQ",
    descripcion:"Arroz Sin Sesion · Quintal", cantidad_qq:10, precio_usd:40,
    tipo_precio:"P1", gratis_qq:0, condicion:"contado" },
];

/* ══ El doble de Supabase, parametrizado por escenario (opts) ══
   opts.sesion     → false: getSession sin sesión (escenario a)
   opts.errClientes→ true: la consulta de `clientes` responde con error (b)
   opts.errProds   → true: `productos` y `v_ofertas_vigentes` responden con error (b)
   opts.demoraPed  → ms de demora para `pedidos`/`pedido_items` (c: refresco lento)
   opts.escenarioC → true: `pedidos`/`pedido_items` traen la fila recién guardada (c)
   opts.rpcOk      → false: la RPC de guardar responde con error                    */
function montar(js, opts) {
  opts = opts || {};
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });   // SIN ?demo=1 → modo vivo
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.XLSX = null;

  const capturado = { rpc:[], pedidoRegistrado:false };
  const erroneas = {};
  if (opts.errClientes) erroneas["clientes"] = true;
  if (opts.errProds) { erroneas["productos"] = true; erroneas["v_ofertas_vigentes"] = true; }
  const demoraDe = (t) => {
    if (opts.demoraPed && (t === "pedidos" || t === "pedido_items")) return opts.demoraPed;
    if (opts.demoraClientes && t === "clientes") return opts.demoraClientes;   // clientes AÚN cargando (estado null)
    return 0;
  };

  function datosDe(t) {
    if (t === "clientes")           return CLIENTES_BD;
    if (t === "productos")          return PRODUCTOS_BD;
    if (t === "v_ofertas_vigentes") return OFERTAS_BD;
    if (t === "proveedores")        return PROVEEDORES_BD;
    if (t === "pedidos")            return (opts.escenarioC && capturado.pedidoRegistrado) ? PEDIDOS_BD_C : [];
    if (t === "pedido_items")       return (opts.escenarioC && capturado.pedidoRegistrado) ? PEDIDO_ITEMS_BD_C : [];
    return [];   // presentaciones, tarifas_fe, zonas, ubicaciones… → vacío
  }

  function consulta(tabla, filtros) {
    const resolver = () => {
      const hacer = () => {
        if (erroneas[tabla]) return { data:null, error:{ message:"sin permiso (prueba)" } };
        let filas = datosDe(tabla).slice();
        filtros.forEach(f => {
          if (f[0] === "eq")  filas = filas.filter(r => r[f[1]] === f[2]);
          if (f[0] === "neq") filas = filas.filter(r => r[f[1]] !== f[2]);
          if (f[0] === "in")  filas = filas.filter(r => (f[2]||[]).indexOf(r[f[1]]) >= 0);
        });
        return { data:filas, error:null };
      };
      return new Promise(res => setTimeout(() => res(hacer()), demoraDe(tabla)));
    };
    const con = (t,c,v) => consulta(tabla, filtros.concat([[t,c,v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, is:()=>enc, range:()=>enc, filter:()=>enc,
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), in:(c,v)=>con("in",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error||null })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error||null })),
      insert:()=>Promise.resolve({ error:null }),
      upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => Promise.resolve({ error:null }); return r; },
      delete:()=>({ eq:()=>Promise.resolve({ error:null }) }),
    };
    return enc;
  }
  w.supa = {
    auth: {
      getSession: async () => (opts.sesion === false)
        ? ({ data:{ session:null } })
        : ({ data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } }),
      onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
      getUser: async () => ({ data:{ user:{ id:"u1" } } }), signOut: async () => ({}),
    },
    from: (t) => consulta(t, []),
    rpc: async (nombre, args) => {
      capturado.rpc.push({ nombre, args });
      if (nombre === "registrar_pedido_atomico") {
        capturado.pedidoRegistrado = true;
        return (opts.rpcOk === false)
          ? { data:null, error:{ message:"rechazado (prueba)" } }
          : { data:[{ ped_id:"PED-NUEVO-1" }], error:null };
      }
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
    // Paso 1 del buscador predictivo: escribir en su input (abre el desplegable).
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
  `, ctx);
  return { ctx, w, capturado };
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* Arma un pedido normal (cliente → piladora → producto en Quintal · 10 qq · $40)
   dentro de la vista Armar. Devuelve la lista de tropiezos (vacía si todo salió). */
async function armarPedidoNormal(m) {
  const errs = [];
  const paso = (r) => { if (r) errs.push(r); };
  // Abrir «Nuevo pedido»
  if (corre(m, `window.__botonPorTexto("Nuevo pedido")`) !== "ok") errs.push("no se pudo abrir «Nuevo pedido»");
  await esperar(120); corre(m, `window.__flush()`);
  // Cliente
  paso(corre(m, `window.__buscarEscribir("cliente", "Sin Sesion")`));
  await esperar(120); corre(m, `window.__flush()`);
  paso(corre(m, `window.__buscarOpcion("cliente", "Sin Sesion")`));
  await esperar(140); corre(m, `window.__flush()`);
  // Piladora
  paso(corre(m, `window.__buscarEscribir("proveedor", "Piladora")`));
  await esperar(120); corre(m, `window.__flush()`);
  paso(corre(m, `window.__buscarOpcion("proveedor", "Piladora Sin Sesion")`));
  await esperar(140); corre(m, `window.__flush()`);
  // Producto en Quintal
  paso(corre(m, `window.__buscarEscribir("catálogo", "Arroz")`));
  await esperar(120); corre(m, `window.__flush()`);
  paso(corre(m, `window.__buscarOpcion("catálogo", "Arroz Sin Sesion")`));
  await esperar(140); corre(m, `window.__flush()`);
  // Cantidad 10 · precio 40 (sobre la base de crédito 38 → válido)
  paso(corre(m, `window.__rowab(0, 10)`));
  await esperar(80); corre(m, `window.__flush()`);
  paso(corre(m, `window.__rowab(1, 40)`));
  await esperar(80); corre(m, `window.__flush()`);
  // Agregar al pedido
  const agr = corre(m, `window.__botonPorTexto("Agregar al pedido")`);
  if (agr !== "ok") errs.push("«Agregar al pedido» no quedó habilitado (" + agr + ")");
  await esperar(120); corre(m, `window.__flush()`);
  return errs;
}

/* ══ La batería. Corre los tres escenarios y devuelve ok/mal. Idéntica contra
      el código bueno y contra cada mutante. ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ───────── (a) SIN SESIÓN → NO HAY PEDIDO APARENTE ───────── */
  {
    const m = montar(js, { sesion:false });
    corre(m, `window.__render()`);
    await esperar(280); corre(m, `window.__flush()`);
    const errs = await armarPedidoNormal(m);
    // Subir pedido (la RPC devolverá sin_sesion)
    corre(m, `window.__botonPorTexto("Subir pedido")`);
    await esperar(200); corre(m, `window.__flush()`);
    const txtA = corre(m, `window.__txt()`);

    comprobar("(a) sin sesión: avisa «No se guardó» y no aparenta que guardó"
      + (errs.length ? " [armado: " + errs.join(" · ") + "]" : ""),
      txtA.indexOf("No se guardó") >= 0);
    comprobar("(a) sin sesión: NO salta a la lista (sigue en el armado, sin tarjeta fantasma)",
      txtA.indexOf("Subir pedido") >= 0);

    // De regreso a la lista: no debió nacer ninguna tarjeta.
    corre(m, `window.__botonPorTexto("Cancelar")`);
    await esperar(140); corre(m, `window.__flush()`);
    const txtLista = corre(m, `window.__txt()`);
    comprobar("(a) sin sesión: la lista sigue con 0 pedidos (ninguna tarjeta fantasma)",
      txtLista.indexOf("0 pedidos") >= 0 && txtLista.indexOf("Sin Sesion") < 0);
  }

  /* ───────── (b) FUENTES CAÍDAS → SIN DEMO + GUARDAR DESHABILITADO ─────────
     Las ofertas/productos responden con ERROR (fuentesConError → banner +
     «Subir pedido» deshabilitado) y los clientes se dejan CARGANDO (consulta
     demorada, estado clientesReales aún en null): así el respaldo demo
     `clientesReales || CLIENTES_WEB` se distingue del bueno `clientesReales || []`.
     En vivo, con el estado en null, el bueno da [] (sin demo) y el mutante daría
     CLIENTES_WEB (con demo). */
  {
    const m = montar(js, { errProds:true, demoraClientes:3000 });
    corre(m, `window.__render()`);
    await esperar(200); corre(m, `window.__flush()`);
    // Entrar al armado y abrir el buscador de clientes (para forzar el pintado de opciones)
    corre(m, `window.__botonPorTexto("Nuevo pedido")`);
    await esperar(140); corre(m, `window.__flush()`);
    corre(m, `window.__buscarEscribir("cliente", "a")`);
    await esperar(140); corre(m, `window.__flush()`);
    const txtB = corre(m, `window.__txt()`);
    const btnSubir = corre(m, `window.__botonPorTexto("Subir pedido")`);

    // (1a) ningún cliente de demostración (CLIENTES_WEB) se cuela
    comprobar("(b) fuentes caídas: NO aparecen clientes demo (Comercial Mendoza / Tienda La Esquina)",
      txtB.indexOf("Comercial Mendoza") < 0 && txtB.indexOf("Tienda La Esquina") < 0);
    // (1b) ningún producto de demostración (PRODUCTOS_WEB) se cuela
    comprobar("(b) fuentes caídas: NO aparecen productos demo (Arroz Conejo / Azúcar Valdez)",
      txtB.indexOf("Arroz Conejo") < 0 && txtB.indexOf("Azúcar Valdez") < 0);
    // (2) el aviso de fuentes caídas está a la vista
    comprobar("(b) fuentes caídas: sale el aviso «No se pudieron cargar» con «Reintentar»",
      txtB.indexOf("No se pudieron cargar") >= 0 && txtB.indexOf("Reintentar") >= 0);
    // (3) «Subir pedido» deshabilitado
    comprobar("(b) fuentes caídas: el botón «Subir pedido» queda deshabilitado (" + btnSubir + ")",
      btnSubir === "disabled");
  }

  /* ───────── (c) GUARDA BIEN → FECHA DE HOY, NO UNA FIJA ─────────
     La RPC responde en verde y el refresco (cargarPedidosVivos) llega DEMORADO,
     así se alcanza a ver la tarjeta local recién nacida ANTES de que la
     reemplace la fila de la base. Su fecha debe ser la de HOY, nunca 13/06/2026. */
  {
    const m = montar(js, { escenarioC:true, demoraPed:3000 });
    corre(m, `window.__render()`);
    await esperar(280); corre(m, `window.__flush()`);
    const errs = await armarPedidoNormal(m);
    corre(m, `window.__botonPorTexto("Subir pedido")`);
    await esperar(180); corre(m, `window.__flush()`);      // ya nació la tarjeta local; el refresco (3000ms) aún no llega
    const txtC = corre(m, `window.__txt()`);

    const rpcPed = m.capturado.rpc.find(r => r.nombre === "registrar_pedido_atomico");
    comprobar("(c) guardar en verde: se llama a registrar_pedido_atomico"
      + (errs.length ? " [armado: " + errs.join(" · ") + "]" : ""),
      !!rpcPed);
    comprobar("(c) guardar en verde: la tarjeta lleva la fecha de HOY (" + HOY_DMY + ")",
      txtC.indexOf(HOY_DMY) >= 0);
    comprobar("(c) guardar en verde: NO usa la vieja fecha fija (13/06/2026 · 2026-06-13)",
      txtC.indexOf("13/06/2026") < 0 && txtC.indexOf("2026-06-13") < 0);
  }

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito, la batería tiene que NACER ROJA ══ */
const MUTANTES = [
  ["(b) repone el respaldo demo en vivo: clientes cae a CLIENTES_WEB",
   `(clientesReales || [])`,
   `(clientesReales || CLIENTES_WEB)`],
  ["(a) repone el pedido fantasma: la guarda sin sesión deja de bloquear",
   `if (!exito && !MODO_DEMO_WEB) {`,
   `if (false && !MODO_DEMO_WEB) {`],
  ["(c) repone la fecha fija: la tarjeta nace con 2026-06-13",
   `fecha: fechaHoy,`,
   `fecha: "2026-06-13",`],
];

(async () => {
  console.log("═══ Sin respaldo demo ni pedido fantasma · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " + (ok + mal - 1) + ".");
  }

  console.log("  · rompiendo la regla a propósito (la batería debe caerse):");
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
      console.log(`  ✓ «${nombre}» → la batería se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
    } else {
      mal++;
      console.log(`  ✗ «${nombre}» → la batería PASA IGUAL: no está midiendo nada`);
    }
  }

  console.log("Resultado de web-sin-fallback: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
