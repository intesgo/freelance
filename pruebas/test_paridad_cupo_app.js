/* PED_TESTS_PARIDAD */
/* ═══════════════════════════════════════════════════════════════════════
   EL CUPO DE CRÉDITO NO SE MIDE POR EL TEXTO NI SE TRANCA EL PEDIDO
   · Comisionista (app del vendedor)

   Dos reglas del negocio que esta prueba amarra, montando la pantalla de
   verdad y tocándola como el vendedor:

   1) Una línea de CONTADO (P2) NO ocupa el cupo del cliente. El cupo es un
      crédito: lo que se paga de una no compromete nada. Así que en una venta
      de contado NO debe salir el recuadro de cupo ni la etiqueta «con
      autorización», por grande que sea el monto.

   2) Una línea a CRÉDITO (P1) que SUPERA el cupo del cliente igual se puede
      ARMAR: el vendedor toma el pedido y queda «pendiente de autorización del
      freelance» para ampliar el crédito. Nunca se bloquea el botón por exceder
      el cupo: bloquearlo sería perder la venta en el campo.

   El cupo sale de la FICHA del cliente (FICHA_CLIENTE), no de un texto ni de
   un cálculo aparte. Se usa «Abarrotes Don Pepe»: cupo $3.000, sin deuda, sin
   bloqueos, para tener un cliente limpio contra el cual empujar el pedido.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Hay una rotura tonta
   además de las semánticas: si una rotura tonta no tumba la prueba, la prueba
   no está mirando la pantalla.

   Uso: node test_paridad_cupo_app.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones y mutantes se esperan. Se declara ANTES de correr
      para que una prueba borrada sin querer no pase inadvertida. ── */
const ESPERADAS = 10;
const MUTANTES_ESPERADOS = 3;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));

/* ══ Fixture sintético con la forma del contrato de producción ══
   El cliente se llama «Abarrotes Don Pepe» a propósito: así calza con su
   FICHA (cupo $3.000, sin deuda) y la pantalla lee el cupo real. ══ */
const CLI_NOMBRE = "Abarrotes Don Pepe";
const CUPO = 3000;

const PRODUCTOS_BD = [
  { prod_id:"PROD-DEMO-B", nombre:"Producto Demo B", marca:null,
    linea:"Arroz", proveedor:"Proveedor Demo A", proveedor_cod:"PROV-DEMO-A", foto:null, estado:"activo" },
];
const AYER = (()=>{ const d=new Date(Date.now()-86400000);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); })();
const OFERTAS_BD = [
  { prod_id:"PROD-DEMO-B", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"PROV-DEMO-A",
    costo:34.00, costo_contado:33.00, margen_min:8, precio_contado:37.00, precio_credito:38.00,
    activo:true, vigente_desde:AYER, vigente_hasta:null },
];
const PROVEEDORES_BD = [ { prov_cod:"PROV-DEMO-A", nombre:"Proveedor Demo A", es_demo:false } ];
const CLIENTES_BD = [
  { cli_id:"CLI-DONPEPE", nombre:CLI_NOMBRE, razon_social:CLI_NOMBRE+" S.A.",
    es_demo:false, activo:true, bloqueado:false },
];
const UBIC_BD = [
  { ubic_id:"UBI-DP", cli_id:"CLI-DONPEPE", nombre:"Local Don Pepe", principal:true, tipo_entrega:"domicilio",
    ciudad:"Ciudad Demo", direccion:"Dirección Demo", activo:true },
];

function datosDe(t) {
  if (t === "productos")           return PRODUCTOS_BD;
  if (t === "ofertas_piladora")    return OFERTAS_BD;
  if (t === "proveedores")         return PROVEEDORES_BD;
  if (t === "clientes")            return CLIENTES_BD;
  if (t === "ubicaciones_cliente") return UBIC_BD;
  if (t === "precios")             return [];
  if (t === "pedidos")             return [{ ped_id:"PED-DEMO-12" }];
  if (t === "usuarios")            return [{ usr_id:"USR-DEMO", auth_uid:"u1", nombre:"Usuario Demo", rol:"comisionista", activo:true }];
  return [];
}

function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";

  const pedidas = [];
  const escrito = { pedidos:[], items:[], borrados:[], rpc:[] };
  function consulta(tabla, filtros) {
    const resolver = () => {
      let filas = datosDe(tabla).slice();
      filtros.forEach(f => {
        if (f[0] === "eq")  filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq") filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "is")  filas = filas.filter(r => (f[2] === null ? r[f[1]] == null : r[f[1]] === f[2]));
        if (f[0] === "in")  filas = filas.filter(r => (f[2] || []).indexOf(r[f[1]]) >= 0);
      });
      return Promise.resolve({ data:filas, error:null, count:filas.length });
    };
    const con = (t, c, v) => consulta(tabla, filtros.concat([[t, c, v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, range:()=>enc, filter:()=>enc,
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), is:(c,v)=>con("is",c,v), in:(c,v)=>con("in",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      insert:(f)=>{
        if (tabla === "pedidos")      escrito.pedidos.push(f);
        if (tabla === "pedido_items") escrito.items.push(f);
        return Promise.resolve({ error:null });
      },
      upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => r; return r; },
      delete:()=>({ eq:(c,v)=>{ escrito.borrados.push(v); return Promise.resolve({ error:null }); } }),
    };
    return enc;
  }
  w.SB = {
    auth: {
      getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"usuario@example.invalid" }, expires_at: Math.floor(Date.now()/1000)+3600 } } }),
      refreshSession: async () => ({ data:{ session:null } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => { pedidas.push(t); return consulta(t, []); },
    rpc: async (nombre,args) => {
      if(nombre==="mi_org_activa") return {data:"ORG-001",error:null};
      if(nombre==="gratis_que_concede") return {data:null,error:null};
      if(nombre!=="registrar_pedido_atomico") return {data:null,error:null};
      escrito.rpc.push({nombre,args});
      return {data:[{ped_id:"PED-DEMO-13",repetido:false}],error:null};
    },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
  return { ctx, pedidas, escrito, w };
}

const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* ── La pantalla del pedido, montada como la ve el vendedor, con los mismos
      ayudantes que usa test_qq_carrito para tocarla. ── */
function pintar(m) {
  corre(m, `
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    window.__Envoltura = function(){
      var st = React.useState(1);
      return React.createElement(Pedido, {
        toast:function(){}, prodInicial:null, onConsumir:function(){}, go:function(){},
        irGuardado:function(){}, onGuardarPedido:function(){},
        cliInicial:null, onConsumirCli:function(){}, onCobrar:function(){},
        paso:st[0], setPaso:st[1] });
    };
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(window.__Envoltura));
    });
    window.__txt = function(){ return window.__c.textContent || ""; };
    window.__buscador = function(nombre){
      var cajas = window.__c.querySelectorAll(".ss input");
      for (var i=0;i<cajas.length;i++){
        var ph = (cajas[i].getAttribute("placeholder")||"").toLowerCase();
        if (ph.indexOf(nombre.toLowerCase()) >= 0) return cajas[i];
      }
      return null;
    };
    window.__escribir = function(caja, texto){
      if (!caja) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
    window.__casa = function(txt, partes){
      for (var j=0;j<partes.length;j++) if (txt.indexOf(partes[j]) < 0) return false;
      return true;
    };
    window.__tocarOpcion = function(partes){
      if (typeof partes === "string") partes = [partes];
      var op = window.__c.querySelectorAll(".opt");
      for (var i=0;i<op.length;i++){
        if (window.__casa(op[i].textContent||"", partes)){
          op[i].dispatchEvent(new window.MouseEvent("mousedown",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
    window.__elegir = function(campo, texto){
      var caja = window.__buscador(campo);
      if (!caja) return "no está el buscador de " + campo;
      window.__escribir(caja, texto);
      return null;
    };
    window.__cantidad = function(n){
      var i = window.__c.querySelector("input.qty-input");
      if (!i) return "no está la casilla de cantidad";
      window.__escribir(i, String(n));
      return null;
    };
    /* elige un tipo de precio por su código (P1, P2, …) tocando su chip */
    window.__tipo = function(id){
      var chips = window.__c.querySelectorAll(".tchip");
      for (var i=0;i<chips.length;i++){
        if ((chips[i].textContent||"").indexOf(id) >= 0){
          chips[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
    /* estado del botón «agregar al carrito»: null si no está, true/false si está y su disabled */
    window.__carritoDisabled = function(){
      var b = window.__c.querySelector(".cta-carrito");
      return b ? !!b.disabled : null;
    };
    /* ¿el botón «agregar» muestra la etiqueta «con autorización»? */
    window.__conAutorizacion = function(){
      var b = window.__c.querySelector(".cta-carrito");
      return !!(b && (b.textContent||"").indexOf("con autorización") >= 0);
    };
  `);
}

async function elegir(m, campo, texto, tocar) {
  const err = corre(m, `window.__elegir(${JSON.stringify(campo)}, ${JSON.stringify(texto)})`);
  if (err) return err;
  await esperar(90);
  const ok = corre(m, `window.__tocarOpcion(${JSON.stringify(tocar || texto)})`);
  await esperar(140);
  return ok ? null : "no apareció la opción " + (tocar || texto);
}

/* Arma la pantalla hasta tener cliente + proveedor + producto + cantidad, en el
   tipo pedido (P1 crédito por defecto; P2 contado si se pide). Devuelve lo que
   se ve: si el botón está deshabilitado, si dice «con autorización», el texto. */
async function armar(js, { contado, cant }) {
  const m = montar(js);
  pintar(m);
  await esperar(400);
  let paso = await elegir(m, "cliente", CLI_NOMBRE, CLI_NOMBRE);
  if (!paso) paso = await elegir(m, "proveedor", "Proveedor Demo A", "Proveedor Demo A");
  if (!paso) paso = await elegir(m, "producto", "producto demo b", ["Producto Demo B","Quintal"]);
  await esperar(120);
  if (!paso && contado) { if (!corre(m, `window.__tipo("P2")`)) paso = "no se pudo elegir Contado (P2)"; await esperar(140); }
  if (!paso) paso = corre(m, `window.__cantidad(${cant})`);
  await esperar(160);
  if (paso) return { paso };
  return {
    paso:null,
    disabled: corre(m, `window.__carritoDisabled()`),
    conAut:   corre(m, `window.__conAutorizacion()`),
    txt:      corre(m, `window.__txt()`),
  };
}

/* ══ La batería. Se corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  /* ── 1) CRÉDITO por ENCIMA del cupo: 100 qq a $38 = $3.800 > $3.000 ── */
  const cSobre = await armar(js, { contado:false, cant:100 });
  comprobar("CRÉDITO sobre el cupo: el botón «agregar» NO se bloquea (el pedido se puede armar)"
    + (cSobre.paso ? " → " + cSobre.paso : ""),
    !cSobre.paso && cSobre.disabled === false);
  comprobar("CRÉDITO sobre el cupo: el botón dice «con autorización» (queda por autorizar)"
    + (cSobre.paso ? " → " + cSobre.paso : ""),
    !cSobre.paso && cSobre.conAut === true);
  comprobar("CRÉDITO sobre el cupo: sale el aviso «pendiente de autorización del freelance»"
    + (cSobre.paso ? " → " + cSobre.paso : ""),
    !cSobre.paso && /pendiente de autorización del freelance/.test(cSobre.txt || ""));
  comprobar("CRÉDITO sobre el cupo: el medidor marca «Excedido»"
    + (cSobre.paso ? " → " + cSobre.paso : ""),
    !cSobre.paso && /Excedido/.test(cSobre.txt || ""));

  /* ── 2) CRÉDITO por DEBAJO del cupo (control): 50 qq a $38 = $1.900 < $3.000 ── */
  const cBajo = await armar(js, { contado:false, cant:50 });
  comprobar("CRÉDITO dentro del cupo (control): NO se marca «por autorizar» ni se bloquea"
    + (cBajo.paso ? " → " + cBajo.paso : ""),
    !cBajo.paso && cBajo.disabled === false && cBajo.conAut === false
      && !/pendiente de autorización del freelance/.test(cBajo.txt || ""));

  /* ── 3) CONTADO por un monto que excedería el cupo si fuera crédito:
         100 qq a $37 = $3.700. El contado NO ocupa cupo. ── */
  const ctdo = await armar(js, { contado:true, cant:100 });
  comprobar("CONTADO: NO aparece el recuadro de cupo de crédito (el contado no ocupa cupo)"
    + (ctdo.paso ? " → " + ctdo.paso : ""),
    !ctdo.paso && !/Cupo de crédito/.test(ctdo.txt || ""));
  comprobar("CONTADO: el botón NO dice «con autorización»"
    + (ctdo.paso ? " → " + ctdo.paso : ""),
    !ctdo.paso && ctdo.conAut === false);
  comprobar("CONTADO: el botón «agregar» está habilitado (venta normal, se puede armar)"
    + (ctdo.paso ? " → " + ctdo.paso : ""),
    !ctdo.paso && ctdo.disabled === false);

  /* ── 4) La otra punta: la BASE tampoco tranca el crédito sobre el cupo. Se
         llama a guardarPedidoEnBase con un carrito a crédito por ENCIMA del
         cupo y se confirma que produce un payload válido (no se bloquea). ── */
  async function guardarSobreCupo() {
    const g = montar(js);
    let cat = null;
    try { cat = corre(g, `construirCatalogoPedido(${JSON.stringify(PROVEEDORES_BD)}, ${JSON.stringify(OFERTAS_BD)}, ${JSON.stringify(PRODUCTOS_BD)}, [])`); }
    catch (e) { return { r:null, cond:null }; }
    const QQ = (cat && cat.pres) ? cat.pres.find(p=>p.presCod==="QQ") : null;
    if (!QQ) return { r:null, cond:null };
    corre(g, `CLI_ID_DE[${JSON.stringify(CLI_NOMBRE)}] = "CLI-DONPEPE";`);
    const carrito = [{
      id:1, prod:QQ, prodNombre:QQ.nombre, unidad:QQ.unidad,
      tipo:"P1", tipoNombre:"Crédito", cant:100, precio:38, gratis:0,
      esCredito:true, credito:true, comisionTotal:0, requiere:true, motivoAuth:"Excede cupo de crédito",
    }];
    let r = null;
    try {
      r = await corre(g, `guardarPedidoEnBase({
        cli:{nombre:${JSON.stringify(CLI_NOMBRE)}}, prov:{id:"PROV-DEMO-A"}, retiro:true,
        carrito:${JSON.stringify(carrito)} })`);
    } catch (e) { r = null; }
    const rpc = g.escrito.rpc[0];
    const cond = rpc && rpc.args && rpc.args.p_payload ? rpc.args.p_payload.condicion : null;
    return { r, cond };
  }
  const gsc = await guardarSobreCupo();
  comprobar("EN LA BASE: un crédito sobre el cupo se guarda igual (no lo tranca la capa de datos)",
    !!(gsc.r && gsc.r.ok === true));
  comprobar("EN LA BASE: ese pedido viaja como condición «credito»",
    gsc.cond === "credito");

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══
   Se verifica que cada trozo aparezca UNA sola vez antes de reemplazarlo. ══ */
const MUTANTES = [
  /* (1) el CONTADO pasa a ocupar cupo: si el contado se cuenta como crédito,
         el recuadro de cupo aparece y el monto lo hace exceder → deja de
         cumplirse «el contado no ocupa cupo». */
  ["el CONTADO pasa a ocupar cupo (contar contado como crédito)",
    `const esCredito = tipo==="P1" || (tipo==="P3" && condP3==="credito");`,
    `const esCredito = true;`],
  /* (2) exceder el cupo BLOQUEA el pedido: si `valido` exige no exceder el
         cupo, el botón se deshabilita y el crédito sobre el cupo ya no se
         puede armar → rompe la regla de «igual se toma, con autorización». */
  ["exceder el cupo BLOQUEA el pedido (valido exige no exceder)",
    `const valido = cli && prov && prod && cantN>0 && baseLista && precioOk && p5Ok && p3Ok && !bloqueado && !bajoMinimo;`,
    `const valido = cli && prov && prod && cantN>0 && baseLista && precioOk && p5Ok && p3Ok && !bloqueado && !bajoMinimo && !excedeCupo;`],
  /* (TONTA) todo requiere autorización: si SIEMPRE pide autorización, hasta el
         contado normal saldría «con autorización». Una rotura boba que la
         prueba tiene que cazar; si no, no está mirando la pantalla. */
  ["TONTA · todo el tiempo pide autorización",
    `const requiereAutorizacion = esP5 || excedeCupo;`,
    `const requiereAutorizacion = true;`],
];

(async () => {
  console.log("═══ El cupo de crédito en la app · " + nombreApp);
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
  for (const [nombre, dee, a] of MUTANTES) {
    const veces = jsx.split(dee).length - 1;
    if (veces !== 1) {
      mal++;
      console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
      continue;
    }
    const mutado = jsx.replace(dee, a);
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

  console.log("Resultado del cupo de crédito: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
