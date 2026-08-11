/* ═══════════════════════════════════════════════════════════════════════
   LA FICHA DEL CLIENTE SELECCIONADO (maqueta del PO) · sistema-web

   Qué mide: la segunda pantalla de Clientes — la que aparece al elegir un
   cliente en el buscador. El Product Owner mandó una maqueta y la maqueta
   manda:

   · El sello de fuente («Datos vivos…») y las tres tarjetas de conteo
     (Clientes · A crédito · Bloqueados) acompañan SOLO al buscador. En la
     ficha estorban y NO deben aparecer.
   · Arriba: «← Buscar otro cliente», el nombre grande con la razón social
     debajo y el chip «● Activo» / «● Bloqueado».
   · La franja del veredicto es BINARIA: verde «Se le puede vender» («Sin
     bloqueos, sin vencidos y con cupo») o roja «No se le puede vender» con
     el motivo real: «Bloqueado», «Con vencidos» o «Sin cupo disponible».
     No inventa reglas: usa el bloqueo del maestro, los vencidos de cartera
     y el cupo disponible que la pantalla ya calculaba.
   · En el CELULAR las tarjetitas van de DOS en fila (lo pidió el PO el
     08/08/2026: con ancho mínimo de 150 px un teléfono de 360 px ponía una
     sola por fila y la ficha quedaba larguísima). En pantalla ancha siguen
     acomodándose las que quepan.
   · La rejilla de tarjetitas muestra los datos REALES (código, tipo, RUC,
     ciudad, condición, cupo, última compra, frecuencia, ranking, cartera,
     quién lo atendió). Si un dato no existe se dice con palabras («Sin
     historial», «—»), nunca con un número inventado.
   · «Nuevo pedido» es el botón principal, arriba de las tarjetitas (b138);
     abajo quedan las tres acciones (Ver historial · Ver cartera · Ver datos),
     cada una con su subtítulo.

   NO SE ESCRIBE EN LA BASE DE VERDAD: el `supa` de aquí es un doble que
   devuelve datos con la forma de producción y anota lo que se le mande.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente,
   una rotura a la vez, y se comprueba que la prueba SE CAE. Hay roturas
   TONTAS (cambiar un texto visible, sumar 1 a un número que se ve) además
   de las semánticas: una rotura lista se puede neutralizar con los datos de
   prueba; la tonta lo delata.

   Uso: node test_ficha_cliente.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una que se borre sin querer no pase inadvertida. ── */
const ESPERADAS = 41;
const MUTANTES_ESPERADOS = 10;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 60));

/* fechas relativas a HOY: los cálculos de «hace N días» y «cada cuánto»
   se miden contra el mismo reloj que usa la pantalla */
const dia = (n) => {
  /* hoy en Ecuador (America/Guayaquil), igual que hoyEC() en la app. Con UTC
     (toISOString) la madrugada 00:00–05:00 adelantaba un día y «hace N días» salía
     corrido, poniendo la prueba roja sin que la app cambiara. */
  const hoy = new Date(new Date().toLocaleString("sv-SE", { timeZone:"America/Guayaquil" }).slice(0,10) + "T12:00:00Z");
  return new Date(hoy.getTime() + n * 86400000).toISOString().slice(0,10);
};

/* ══ La base de prueba, con la forma exacta de producción (snake_case) ══
   Cinco clientes, uno por cada camino de la ficha:
   CLI-036 Pedro   → verde: con historial, cupo entero y cartera al día
   CLI-040 Vera    → BLOQUEADO con motivo escrito
   CLI-041 Loja    → CON VENCIDOS en cartera
   CLI-042 Anita   → SIN CUPO disponible (cupo comido entero)
   CLI-043 Nuevo   → sin historial, sin RUC, de contado (cupo 0)            */
const CLIENTES_BD = [
  { cli_id:"CLI-036", nombre:"Supermercado Castillo", razon_social:"Pedro Rodrigo Castillo Rosero",
    tipo:"Natural", ruc:"1712345678001", condicion_pago:"Crédito", cupo:30000, usado:0,
    bloqueado:false, activo:true, compras_totales:8000, num_pedidos:2, dueno:"Carlos Andrade",
    sub_id:"USR-7", es_demo:false },
  { cli_id:"CLI-040", nombre:"Almacenes Vera", razon_social:"Almacenes Vera S.A.",
    tipo:"Jurídica", ruc:"1798887776001", condicion_pago:"Crédito", cupo:10000, usado:0,
    bloqueado:true, motivo_bloqueo:"Cheque protestado", activo:true, compras_totales:15000,
    dueno:"María Quishpe", es_demo:false },
  { cli_id:"CLI-041", nombre:"Comercial Loja", razon_social:"Comercial Loja Cía. Ltda.",
    tipo:"Jurídica", ruc:"1190012345001", condicion_pago:"Crédito", cupo:5000, usado:1000,
    bloqueado:false, activo:true, compras_totales:9000, dueno:"Jorge Vimos", es_demo:false },
  { cli_id:"CLI-042", nombre:"Víveres Anita", razon_social:"Víveres Anita",
    tipo:"Natural", ruc:"0912345678001", condicion_pago:"Crédito", cupo:5000, usado:5000,
    bloqueado:false, activo:true, compras_totales:500, dueno:"Lucía Tenesaca", es_demo:false },
  { cli_id:"CLI-043", nombre:"Nuevo Cliente Pérez", razon_social:"Nuevo Cliente Pérez",
    tipo:"Natural", ruc:null, condicion_pago:"Contado", cupo:0, usado:0,
    bloqueado:false, activo:true, compras_totales:0, dueno:"freelance", es_demo:false },
];
const UBICACIONES_BD = [
  { cli_id:"CLI-036", nombre:"Local principal", principal:true, provincia:"Pichincha",
    ciudad:"Quito", barrio:"Iñaquito", direccion:"Av. Amazonas N23-45" },
];
/* dos pedidos de Pedro: hace 2 y hace 30 días → última compra «hace 2 día(s)»
   y frecuencia ≈ 28 días. Atendió USR-7 (Carlos Andrade). */
const PEDIDOS_BD = [
  { ped_id:"PD-9001", cli_id:"CLI-036", sub_id:"USR-7", creado:dia(-2)+"T10:00:00",  estado:"aprobado", es_demo:false },
  { ped_id:"PD-9000", cli_id:"CLI-036", sub_id:"USR-7", creado:dia(-30)+"T10:00:00", estado:"aprobado", es_demo:false },
];
/* la cartera de Loja: una factura de $500 vencida hace 5 días */
const CARTERA_BD = [
  { cli_id:"CLI-041", doc:"FAC-900", monto:500, vence:dia(-5), estado:"Vencida", es_demo:false },
];
const COBROS_BD = [];
const USUARIOS_BD = [ { usr_id:"USR-7", nombre:"Carlos Andrade" } ];

function datosDe(t) {
  if (t === "clientes")            return CLIENTES_BD;
  if (t === "ubicaciones_cliente") return UBICACIONES_BD;
  if (t === "pedidos")             return PEDIDOS_BD;
  if (t === "cartera_cliente")     return CARTERA_BD;
  if (t === "cobros")              return COBROS_BD;
  if (t === "usuarios")            return USUARIOS_BD;
  return [];
}

/* ══ El doble de Supabase: entrega los datos de arriba y ANOTA lo que se
      intente escribir (aquí no debe escribirse nada: la ficha solo lee) ══ */
function montar(js, ancho) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  /* el ancho de la ventana decide si la ficha va de dos columnas: 380 px es
     un celular corriente; sin pasar nada, jsdom da 1024 (pantalla ancha) */
  if (ancho) Object.defineProperty(w, "innerWidth", { value: ancho, configurable:true });
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.XLSX = null;

  const escrituras = [];

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
      insert:(x)=>{ escrituras.push({ op:"insert", tabla, filas:Array.isArray(x)?x:[x] }); return Promise.resolve({ error:null }); },
      upsert:(x)=>{ escrituras.push({ op:"upsert", tabla, filas:Array.isArray(x)?x:[x] }); return Promise.resolve({ error:null }); },
      update:(x)=>{ const r = Promise.resolve({ error:null });
                    r.eq = (c,v) => { escrituras.push({ op:"update", tabla, filas:[x], donde:[c,v] });
                                      return Promise.resolve({ error:null }); };
                    return r; },
      delete:()=>({ eq:(c,v)=>{ escrituras.push({ op:"delete", tabla, donde:[c,v] });
                                return Promise.resolve({ error:null }); } }),
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
    window.__texto = function(){ return (window.__c && window.__c.textContent) || ""; };
    window.__porTexto = function(sel, txt){
      var todos = window.__c.querySelectorAll(sel), mejor = null;
      for (var i=0;i<todos.length;i++){
        var t = (todos[i].textContent||"");
        if (t.indexOf(txt) >= 0 && (!mejor || t.length <= (mejor.textContent||"").length)) mejor = todos[i];
      }
      return mejor;
    };
    window.__tocar = function(sel, txt){
      var e = window.__porTexto(sel, txt);
      if (!e) return false;
      e.dispatchEvent(new window.MouseEvent("click", { bubbles:true }));
      return true;
    };
    /* la rejilla de las tarjetitas: se reconoce porque es la cuadrícula que
       contiene la tarjeta del CÓDIGO. Devuelve el valor tal cual lo puso
       React, para poder contar sus columnas. */
    window.__rejillaDatos = function(){
      var cuadros = window.__c.querySelectorAll("div");
      for (var i=0;i<cuadros.length;i++){
        var e = cuadros[i];
        if (e.style && e.style.display === "grid" &&
            (e.textContent||"").indexOf("CLI-") >= 0 &&
            (e.textContent||"").indexOf("Ranking") >= 0) return e.style.gridTemplateColumns || "";
      }
      return "";
    };
    window.__caja = function(ph){
      var cajas = window.__c.querySelectorAll("input");
      for (var i=0;i<cajas.length;i++)
        if ((cajas[i].getAttribute("placeholder")||"") === ph) return cajas[i];
      return null;
    };
    window.__escribir = function(ph, texto){
      var caja = window.__caja(ph);
      if (!caja) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input", { bubbles:true }));
      return true;
    };
    window.__pintar = function(){
      window.__c = document.createElement("div");
      document.body.appendChild(window.__c);
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__c).render(React.createElement(ClientesWeb, {
          usuario: { usuario:"richard", nombre:"Richard Ramírez", cargo:"freelance",
                     rol:"Freelance", empresaId:"ORG-001", secciones:[] },
          navegar: function(){} }));
      });
    };
  `, ctx);
  return { ctx, w, escrituras };
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* ══ La batería. Corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };
  const m = montar(js);   /* pantalla ancha (1024) */
  const J = JSON.stringify;
  /* el veredicto es una función de nivel superior: si no existe (código
     viejo o mutante que la rompe), eso también es un fallo, no un reventón */
  const veredicto = (c, r) => {
    try { return corre(m, `veredictoCliente(${J(c)}, ${J(r)})`); }
    catch (e) { return { __error: String(e.message||e) }; }
  };

  const abrir = async (busca, toca) => {
    corre(m, `window.__escribir("Escribe nombre, razón social o RUC…", ${J(busca)})`);
    await esperar(40);
    corre(m, `window.__tocar("div", ${J(toca)})`);
    await esperar(60);
    corre(m, `ReactDOM.flushSync(function(){})`);
    return corre(m, `window.__texto()`);
  };
  const volver = async () => {
    corre(m, `window.__tocar("button", "← Buscar otro cliente")`);
    await esperar(40);
    corre(m, `ReactDOM.flushSync(function(){})`);
    return corre(m, `window.__texto()`);
  };

  /* ── A) LA VISTA DE BÚSQUEDA: el sello y los conteos SÍ se ven aquí ── */
  corre(m, `window.__pintar()`);
  await esperar(150);
  corre(m, `ReactDOM.flushSync(function(){})`);
  const txtBusca = corre(m, `window.__texto()`);
  comprobar("en el buscador se ve el sello de fuente («Datos vivos · maestro real de clientes»)",
    txtBusca.indexOf("Datos vivos · maestro real de clientes") >= 0);
  comprobar("y las tarjetas de conteo: Clientes · A crédito · Bloqueados",
    txtBusca.indexOf("Clientes") >= 0 && txtBusca.indexOf("A crédito") >= 0 && txtBusca.indexOf("Bloqueados") >= 0);

  /* ── B) LA FICHA DE PEDRO (el camino verde de la maqueta) ── */
  const txtPedro = await abrir("castillo", "Pedro Castillo");
  comprobar("elegirlo abre la ficha, con su «← Buscar otro cliente»",
    txtPedro.indexOf("← Buscar otro cliente") >= 0);
  comprobar("EN LA FICHA EL SELLO DE FUENTE YA NO ESTÁ (lo pidió el PO)",
    txtPedro.indexOf("Datos vivos") < 0 && txtPedro.indexOf("Demo local") < 0);
  comprobar("Y LAS TRES TARJETAS DE CONTEO TAMPOCO",
    txtPedro.indexOf("A crédito") < 0 && txtPedro.indexOf("Bloqueados") < 0);
  comprobar("el nombre grande y la razón social debajo, como en la maqueta",
    txtPedro.indexOf("Pedro Rodrigo Castillo Rosero") >= 0 && txtPedro.indexOf("Supermercado Castillo") >= 0);
  comprobar("el chip de estado dice «● Activo»",
    txtPedro.indexOf("● Activo") >= 0);
  comprobar("la franja del veredicto en verde: «Se le puede vender»",
    txtPedro.indexOf("Se le puede vender") >= 0 && txtPedro.indexOf("No se le puede vender") < 0);
  comprobar("y dice por qué: «Sin bloqueos, sin vencidos y con cupo»",
    txtPedro.indexOf("Sin bloqueos, sin vencidos y con cupo") >= 0);
  comprobar("CÓDIGO CLI-036 y TIPO Natural",
    txtPedro.indexOf("CLI-036") >= 0 && txtPedro.indexOf("Natural") >= 0);
  comprobar("RUC / CÉDULA y CIUDAD reales (1712345678001 · Quito)",
    txtPedro.indexOf("1712345678001") >= 0 && txtPedro.indexOf("Quito") >= 0);
  comprobar("CONDICIÓN: Crédito",
    txtPedro.indexOf("Condición") >= 0 && txtPedro.indexOf("Crédito") >= 0);
  comprobar("CUPO DISPONIBLE: $30.000,00 y debajo «de $30.000,00»",
    txtPedro.indexOf("$30.000,00") >= 0 && txtPedro.indexOf("de $30.000,00") >= 0);
  comprobar("ÚLTIMA COMPRA: la fecha real y «hace 2 día(s)»",
    txtPedro.indexOf(dia(-2)) >= 0 && txtPedro.indexOf("hace 2 día") >= 0);
  comprobar("CADA CUÁNTO COMPRA: ≈ 28 días (promedio entre sus dos pedidos)",
    txtPedro.indexOf("≈ 28 días") >= 0 && txtPedro.indexOf("promedio entre pedidos") >= 0);
  comprobar("RANKING: #3 por compras acumuladas (8.000 detrás de 15.000 y 9.000)",
    txtPedro.indexOf("#3") >= 0 && txtPedro.indexOf("por compras acumuladas") >= 0);
  comprobar("CARTERA: Al día · sin saldo pendiente",
    txtPedro.indexOf("Al día") >= 0 && txtPedro.indexOf("sin saldo pendiente") >= 0);
  comprobar("LO ATENDIÓ: Carlos Andrade, en su último pedido",
    txtPedro.indexOf("Carlos Andrade") >= 0 && txtPedro.indexOf("en su último pedido") >= 0);
  comprobar("los cuatro botones: Nuevo pedido · Ver historial · Ver cartera · Ver datos",
    txtPedro.indexOf("Nuevo pedido") >= 0 && txtPedro.indexOf("Ver historial") >= 0 &&
    txtPedro.indexOf("Ver cartera") >= 0 && txtPedro.indexOf("Ver datos") >= 0);
  // «Nuevo pedido» dejó de ser una tarjeta con subtítulo y pasó a ser el botón
  // principal, arriba de las tarjetitas (b138): ya no lleva subtítulo. Las otras
  // tres acciones siguen abajo, cada una con el suyo.
  comprobar("las tres acciones de abajo con sus subtítulos, para que se sepa a qué va cada una",
    txtPedro.indexOf("Indicadores y compras") >= 0 &&
    txtPedro.indexOf("Facturas y cobros") >= 0 && txtPedro.indexOf("Ficha completa y ubicaciones") >= 0);

  /* ── C) VOLVER: el buscador recupera su sello y sus conteos ── */
  const txtVuelta = await volver();
  comprobar("«← Buscar otro cliente» regresa al buscador con el sello y los conteos",
    txtVuelta.indexOf("Datos vivos") >= 0 && txtVuelta.indexOf("A crédito") >= 0 &&
    txtVuelta.indexOf("Se le puede vender") < 0);

  /* ── D) EL BLOQUEADO ── */
  const txtVera = await abrir("vera", "Almacenes Vera S.A.");
  comprobar("el chip de estado dice «● Bloqueado»",
    txtVera.indexOf("● Bloqueado") >= 0);
  comprobar("la franja va en rojo: «No se le puede vender» · «Bloqueado: Cheque protestado»",
    txtVera.indexOf("No se le puede vender") >= 0 && txtVera.indexOf("Bloqueado: Cheque protestado") >= 0);
  await volver();

  /* ── E) EL DE LOS VENCIDOS ── */
  const txtLoja = await abrir("loja", "Comercial Loja");
  comprobar("con cartera vencida la franja dice «No se le puede vender» · «Con vencidos»",
    txtLoja.indexOf("No se le puede vender") >= 0 && txtLoja.indexOf("Con vencidos") >= 0);
  comprobar("y la tarjetita de CARTERA lo cuenta: Debe $500,00 · 1 factura(s) · 1 vencida(s)",
    txtLoja.indexOf("Debe $500,00") >= 0 && txtLoja.indexOf("1 factura(s)") >= 0 &&
    txtLoja.indexOf("1 vencida(s)") >= 0);
  await volver();

  /* ── F) EL QUE SE COMIÓ EL CUPO ── */
  const txtAnita = await abrir("anita", "Víveres Anita");
  comprobar("con el cupo en cero la franja dice «No se le puede vender» · «Sin cupo disponible»",
    txtAnita.indexOf("No se le puede vender") >= 0 && txtAnita.indexOf("Sin cupo disponible") >= 0);
  await volver();

  /* ── G) EL NUEVO SIN HISTORIAL: se dice con palabras, no se inventa ── */
  const txtNuevo = await abrir("nuevo", "Nuevo Cliente");
  comprobar("al de contado sin cupo asignado no se le inventa un bloqueo: veredicto verde",
    txtNuevo.indexOf("Se le puede vender") >= 0 && txtNuevo.indexOf("No se le puede vender") < 0);
  comprobar("ÚLTIMA COMPRA «Sin compras registradas» y RANKING «Sin historial»",
    txtNuevo.indexOf("Sin compras registradas") >= 0 && txtNuevo.indexOf("Sin historial") >= 0);
  comprobar("CADA CUÁNTO «Aún no se puede calcular» y «hacen falta 2 compra(s)»",
    txtNuevo.indexOf("Aún no se puede calcular") >= 0 && txtNuevo.indexOf("hacen falta 2 compra") >= 0);
  comprobar("sin RUC se muestra «—», nunca un número inventado",
    txtNuevo.indexOf("—") >= 0);
  comprobar("LO ATENDIÓ: Freelance (directo), asignado en la ficha",
    txtNuevo.indexOf("Freelance (directo)") >= 0 && txtNuevo.indexOf("asignado en la ficha") >= 0);

  /* ── G bis) LAS TARJETITAS DE A DOS EN EL CELULAR (PO, 08/08/2026) ──
     En pantalla ancha se acomodan las que quepan; en un teléfono deben ser
     exactamente DOS columnas, no una. Se mide sobre la rejilla de verdad,
     con la ficha de Pedro abierta, en dos montajes con anchos distintos. */
  await abrir("castillo", "Pedro Castillo");
  const rejillaAncha = corre(m, `window.__rejillaDatos()`);
  comprobar("en pantalla ancha la rejilla sigue acomodando las que quepan (auto-fill)",
    /auto-fill/.test(rejillaAncha));
  await volver();

  {
    const cel = montar(js, 380);   /* un celular corriente */
    corre(cel, `window.__pintar()`);
    await esperar(150);
    corre(cel, `ReactDOM.flushSync(function(){})`);
    corre(cel, `window.__escribir("Escribe nombre, razón social o RUC…", "castillo")`);
    await esperar(40);
    corre(cel, `window.__tocar("div", "Pedro Castillo")`);
    await esperar(60);
    corre(cel, `ReactDOM.flushSync(function(){})`);
    const rejillaCel = corre(cel, `window.__rejillaDatos()`);
    comprobar("EN EL CELULAR (380 px) las tarjetitas salen de A DOS por fila · rejilla: «" + rejillaCel + "»",
      /repeat\(\s*2\s*,/.test(rejillaCel));
  }

  /* ── H) EL VEREDICTO, PELADO (la función de nivel superior) ── */
  const rBien = { cargando:false, nVenc:0, cupo:30000, disponible:30000 };
  const v1 = veredicto({ bloqueado:true }, rBien);
  comprobar("bloqueado sin motivo escrito → rojo «Bloqueado»",
    v1 && v1.ok === false && v1.motivo === "Bloqueado");
  const v2 = veredicto({ bloqueado:true, motivoBloqueo:"Cheque protestado" }, rBien);
  comprobar("bloqueado con motivo → rojo «Bloqueado: Cheque protestado»",
    v2 && v2.ok === false && v2.motivo === "Bloqueado: Cheque protestado");
  const v3 = veredicto({ bloqueado:true }, null);
  comprobar("el bloqueo no espera a que cargue la cartera: veredicto rojo de una",
    v3 && v3.ok === false);
  const v4 = veredicto({ bloqueado:false }, { cargando:false, nVenc:2, cupo:5000, disponible:4000 });
  comprobar("con vencidos → rojo «Con vencidos»",
    v4 && v4.ok === false && v4.motivo === "Con vencidos");
  const v5 = veredicto({ bloqueado:false }, { cargando:false, nVenc:0, cupo:5000, disponible:0 });
  comprobar("cupo comido entero → rojo «Sin cupo disponible»",
    v5 && v5.ok === false && v5.motivo === "Sin cupo disponible");
  const v6 = veredicto({ bloqueado:false }, rBien);
  comprobar("sin bloqueos, sin vencidos y con cupo → verde",
    v6 && v6.ok === true);
  const v7 = veredicto({ bloqueado:false }, { cargando:false, nVenc:0, cupo:0, disponible:0 });
  comprobar("al de contado (cupo 0) no se le inventa el bloqueo por cupo → verde",
    v7 && v7.ok === true);
  const v8 = veredicto({ bloqueado:false }, { cargando:true });
  comprobar("mientras la cartera no llega no hay veredicto (null): no se adivina",
    v8 === null);

  /* la ficha solo LEE: nada debió intentar escribirse en la base */
  if (m.escrituras.length > 0) { mal++; fallos.push("la ficha intentó escribir en la base"); }

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  ["TONTA · cambia el texto verde que lee el vendedor",
   `{V.ok ? "Se le puede vender" : "No se le puede vender"}`,
   `{V.ok ? "Se puede vender" : "No se le puede vender"}`],
  ["TONTA · le suma 1 a los días de la última compra",
   `R.ultima ? "hace "+R.diasDesde+" día(s)" : null)}`,
   `R.ultima ? "hace "+(R.diasDesde+1)+" día(s)" : null)}`],
  ["el veredicto se olvida del bloqueo",
   `  if (c.bloqueado) return { ok:false, motivo: "Bloqueado" + (c.motivoBloqueo ? ": " + c.motivoBloqueo : "") };`,
   `  if (false) return { ok:false, motivo: "Bloqueado" + (c.motivoBloqueo ? ": " + c.motivoBloqueo : "") };`],
  ["el veredicto se olvida de los vencidos",
   `  if (R.nVenc > 0) return { ok:false, motivo:"Con vencidos" };`,
   `  if (false) return { ok:false, motivo:"Con vencidos" };`],
  ["el veredicto se olvida del cupo",
   `  if (R.cupo > 0 && R.disponible <= 0) return { ok:false, motivo:"Sin cupo disponible" };`,
   `  if (false) return { ok:false, motivo:"Sin cupo disponible" };`],
  ["el sello y los conteos se cuelan en la ficha (lo que el PO pidió quitar)",
   `{!seleccionado && (<>`,
   `{true && (<>`],
  ["la cartera dice «Al día» aunque deba",
   `R.cargando ? "—" : R.pend>0 ? "Debe "+money(R.pend) : "Al día",`,
   `R.cargando ? "—" : false ? "Debe "+money(R.pend) : "Al día",`],
  ["TONTA · en el celular pone 3 columnas en vez de 2",
   `angosto ? "repeat(2, minmax(0, 1fr))"`,
   `angosto ? "repeat(3, minmax(0, 1fr))"`],
  ["el celular vuelve a la columna única de antes",
   `  const angosto = useEsMovil(560);`,
   `  const angosto = false;`],
  ["el cupo disponible deja de restar lo usado",
   `    const disponible = Math.max(0, Math.round((cupo-usado)*100)/100);`,
   `    const disponible = cupo;`],
];

(async () => {
  console.log("═══ La ficha del cliente seleccionado (maqueta del PO) · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
      (ok + mal - 1) + ". Alguna se perdió o se agregó sin declararla.");
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

  console.log("Resultado de la ficha del cliente: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
