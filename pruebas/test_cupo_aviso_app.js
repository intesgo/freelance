/* ═══════════════════════════════════════════════════════════════════════
   FIX_CUPO_AVISO_APP · el aviso de cupo que se apagaba solo · Comisionista

   Qué mide (montando la pantalla de Pedido de verdad y tocándola como el
   vendedor):

   · La caja de cupo se pinta con `cupoSePasa` (deuda + crédito del carrito +
     la línea en curso), NO con `excedeCupo` (que exige que la línea EN CURSO
     sea a crédito). Por eso, si el carrito ya se pasó con líneas a crédito y
     luego se arma una línea a CONTADO, el aviso SIGUE visible (antes se apagaba).
   · Pasarse del cupo NO es un error: el sello va en ÁMBAR y dice
     «Se pasa · por autorizar», nunca «Excedido» ni en rojo (clase `bad`).
   · Pasarse NO bloquea el botón de agregar.
   · La autorización la sigue decidiendo `excedeCupo` / `requiereAutorizacion`:
     esa regla de negocio no se toca.

   NO SE ESCRIBE EN LA BASE: los dobles de Supabase de aquí no tocan nada real.

   Uso: node test_cupo_aviso_app.js [ruta-app.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets:["react"] }).code;

const ESPERADAS = 13;
let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));
console.log("═══ FIX_CUPO_AVISO_APP · " + nombreApp);

/* ── Fixture: cupo REAL de clientes.cupo + cartera (usado = 1.500). Precios
      redondos ($10) para montos exactos: cant 200 → $2.000 (se pasa),
      cant 100 → $1.000 (no se pasa). Un segundo cliente con cupo 0. ── */
const CLI_NOMBRE = "Comercial Vela Import", CLI_ID = "CLI-VELA";
const ZERO_NOMBRE = "Tienda Sin Cupo", ZERO_ID = "CLI-ZERO";
const CUPO = 3000;
const AYER = (()=>{ const d=new Date(Date.now()-86400000);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); })();
const PRODUCTOS_BD = [
  { prod_id:"PROD-DEMO-B", nombre:"Producto Demo B", marca:null, linea:"Arroz",
    proveedor:"Proveedor Demo A", proveedor_cod:"PROV-DEMO-A", foto:null, estado:"activo" },
];
const OFERTAS_BD = [
  { prod_id:"PROD-DEMO-B", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1, prov_cod:"PROV-DEMO-A",
    costo:5.00, costo_contado:5.00, margen_min:0, precio_contado:10.00, precio_credito:10.00,
    activo:true, vigente_desde:AYER, vigente_hasta:null },
];
const PROVEEDORES_BD = [ { prov_cod:"PROV-DEMO-A", nombre:"Proveedor Demo A", es_demo:false } ];
const CLIENTES_BD = [
  { cli_id:CLI_ID, nombre:CLI_NOMBRE, razon_social:CLI_NOMBRE+" S.A.",
    es_demo:false, activo:true, bloqueado:false, cupo:CUPO, usado:0, plazo:30, motivo_bloqueo:null },
  { cli_id:ZERO_ID, nombre:ZERO_NOMBRE, razon_social:ZERO_NOMBRE+" S.A.",
    es_demo:false, activo:true, bloqueado:false, cupo:0, usado:0, plazo:30, motivo_bloqueo:null },
];
const CARTERA_BD = [
  { cli_id:CLI_ID, monto:1200, estado:"pendiente", es_demo:false },
  { cli_id:CLI_ID, monto:300,  estado:"pendiente", es_demo:false },
];
const UBIC_BD = [
  { ubic_id:"UBI-VELA", cli_id:CLI_ID, nombre:"Local Vela", principal:true, tipo_entrega:"domicilio", ciudad:"Ciudad Demo", direccion:"Dirección Demo", activo:true },
  { ubic_id:"UBI-ZERO", cli_id:ZERO_ID, nombre:"Local Zero", principal:true, tipo_entrega:"domicilio", ciudad:"Ciudad Demo", direccion:"Dirección Demo", activo:true },
];
function datosDe(t) {
  if (t === "productos")           return PRODUCTOS_BD;
  if (t === "ofertas_piladora")    return OFERTAS_BD;
  if (t === "proveedores")         return PROVEEDORES_BD;
  if (t === "clientes")            return CLIENTES_BD;
  if (t === "cartera_cliente")     return CARTERA_BD;
  if (t === "ubicaciones_cliente") return UBIC_BD;
  if (t === "pedidos")             return [{ ped_id:"PED-DEMO-12" }];
  if (t === "usuarios")            return [{ usr_id:"USR-DEMO", auth_uid:"u1", nombre:"Usuario Demo", rol:"comisionista", activo:true }];
  return [];
}

function montar() {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
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
      then:(okc,malc)=>resolver().then(okc,malc), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      insert:()=>Promise.resolve({ error:null }), upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => r; return r; },
      delete:()=>({ eq:()=>Promise.resolve({ error:null }) }),
    };
    return enc;
  }
  w.SB = {
    auth: {
      getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"usuario@example.invalid" }, expires_at: Math.floor(Date.now()/1000)+3600 } } }),
      refreshSession: async () => ({ data:{ session:null } }), signOut: async () => ({}),
      onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => consulta(t, []),
    rpc: async (nombre) => { if(nombre==="mi_org_activa") return {data:"ORG-001",error:null}; return {data:null,error:null}; },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
  return { ctx, w };
}
const corre = (m, expr) => vm.runInContext(expr, m.ctx);

function pintar(m) {
  corre(m, `
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    window.__Env = function(){ var st = React.useState(1);
      return React.createElement(Pedido, { toast:function(){}, prodInicial:null, onConsumir:function(){},
        go:function(){}, irGuardado:function(){}, onGuardarPedido:function(){}, cliInicial:null,
        onConsumirCli:function(){}, onCobrar:function(){}, paso:st[0], setPaso:st[1] }); };
    ReactDOM.flushSync(function(){ ReactDOM.createRoot(window.__c).render(React.createElement(window.__Env)); });
    window.__txt = function(){ return window.__c.textContent || ""; };
    window.__buscador = function(nombre){ var cajas = window.__c.querySelectorAll(".ss input");
      for (var i=0;i<cajas.length;i++){ var ph=(cajas[i].getAttribute("placeholder")||"").toLowerCase();
        if (ph.indexOf(nombre.toLowerCase())>=0) return cajas[i]; } return null; };
    window.__escribir = function(caja, texto){ if(!caja) return false;
      var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(caja,texto); caja.dispatchEvent(new window.Event("input",{bubbles:true})); return true; };
    window.__casa = function(txt, partes){ for (var j=0;j<partes.length;j++) if (txt.indexOf(partes[j])<0) return false; return true; };
    window.__tocarOpcion = function(partes){ if(typeof partes==="string") partes=[partes];
      var op=window.__c.querySelectorAll(".opt");
      for (var i=0;i<op.length;i++){ if(window.__casa(op[i].textContent||"",partes)){
        op[i].dispatchEvent(new window.MouseEvent("mousedown",{bubbles:true})); return true; } } return false; };
    window.__elegir = function(campo, texto){ var caja=window.__buscador(campo);
      if(!caja) return "no está el buscador de "+campo; window.__escribir(caja,texto); return null; };
    window.__cantidad = function(n){ var i=window.__c.querySelector("input.qty-input");
      if(!i) return "no está la casilla de cantidad"; window.__escribir(i,String(n)); return null; };
    window.__tipo = function(id){ var chips=window.__c.querySelectorAll(".tchip");
      for (var i=0;i<chips.length;i++){ if((chips[i].textContent||"").indexOf(id)>=0){
        chips[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } } return false; };
    window.__carritoDisabled = function(){ var b=window.__c.querySelector(".cta-carrito"); return b?!!b.disabled:null; };
    window.__agregar = function(){ var b=window.__c.querySelector(".cta-carrito");
      if(!b||b.disabled) return false; b.dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; };
    window.__cupo = function(){ var b=window.__c.querySelector(".cupo-box");
      if(!b) return { present:false };
      var badge=b.querySelector(".cupo-badge");
      return { present:true, excede:/cupo-excede/.test(b.className),
        badge: badge?(badge.textContent||"").trim():"", hasBad: !!b.querySelector(".cupo-badge.bad"),
        aviso: !!b.querySelector(".cupo-aviso"), text: b.textContent||"" }; };
  `);
}
async function elegir(m, campo, texto, tocar) {
  const err = corre(m, `window.__elegir(${JSON.stringify(campo)}, ${JSON.stringify(texto)})`);
  if (err) return err;
  await esperar(90);
  const okc = corre(m, `window.__tocarOpcion(${JSON.stringify(tocar || texto)})`);
  await esperar(150);
  return okc ? null : "no apareció la opción " + (tocar || texto);
}
/* Deja la pantalla con cliente + proveedor + producto elegidos. */
async function base(m, cliente) {
  pintar(m); await esperar(400);
  let p = await elegir(m, "cliente", cliente, cliente);
  if (!p) p = await elegir(m, "proveedor", "Proveedor Demo A", "Proveedor Demo A");
  if (!p) p = await elegir(m, "producto", "producto demo b", ["Producto Demo B","Quintal"]);
  await esperar(140);
  return p;
}
const cupo = (m) => corre(m, `window.__cupo()`);

(async () => {
  /* ── 1 · línea a CRÉDITO que se pasa (cant 200 = $2.000; 1.500+2.000>3.000) ── */
  let m = montar(); let p = await base(m, CLI_NOMBRE);
  if (p) { comprobar("montar la pantalla en crédito", false); }
  corre(m, `window.__cantidad(200)`); await esperar(180);
  let c = cupo(m);
  comprobar("línea a crédito pasada: la caja va en ámbar (cupo-excede)", c.present && c.excede);
  comprobar("el sello dice «Se pasa · por autorizar»", /Se pasa · por autorizar/.test(c.badge));
  comprobar("el sello NUNCA dice «Excedido»", c.text.indexOf("Excedido") < 0);
  comprobar("el sello NUNCA lleva la clase `bad`", c.hasBad === false);
  comprobar("aparece el recuadro con su texto de siempre",
    c.aviso && /pendiente de autorización del freelance/.test(c.text));
  comprobar("«Se pasa por» muestra el exceso exacto (−$500,00)", c.text.indexOf("−$500,00") >= 0);
  comprobar("pasarse del cupo NO deshabilita «agregar al pedido»", corre(m, `window.__carritoDisabled()`) === false);

  /* ── 2 · EL DEFECTO: agrego la línea a crédito y luego armo una a CONTADO ── */
  corre(m, `window.__agregar()`); await esperar(200);                     // carrito: $2.000 a crédito
  await elegir(m, "producto", "producto demo b", ["Producto Demo B","Quintal"]);
  corre(m, `window.__tipo("P2")`); await esperar(140);                    // línea en curso a CONTADO
  corre(m, `window.__cantidad(50)`); await esperar(180);
  c = cupo(m);
  comprobar("con la línea en curso a CONTADO y el carrito pasado, el aviso SIGUE visible",
    c.present && c.excede && /Se pasa · por autorizar/.test(c.badge));

  /* ── 3 · con cupo suficiente (cant 100 = $1.000; 1.500+1.000<3.000) ── */
  m = montar(); await base(m, CLI_NOMBRE);
  corre(m, `window.__cantidad(100)`); await esperar(180);
  c = cupo(m);
  comprobar("con cupo suficiente la caja NO es ámbar", c.present && !c.excede);
  comprobar("y «Disponible» muestra cupo − consumido ($500,00)", c.text.indexOf("$500,00") >= 0 && c.text.indexOf("−") < 0);

  /* ── 4 · cliente con cupo 0 → la caja no se pinta ── */
  m = montar(); await base(m, ZERO_NOMBRE);
  corre(m, `window.__cantidad(100)`); await esperar(180);
  comprobar("con cupo 0 la caja de cupo no se pinta", cupo(m).present === false);

  /* ── 5 · una línea a CONTADO sola no toca el cupo (no pinta caja ámbar) ── */
  m = montar(); await base(m, CLI_NOMBRE);
  corre(m, `window.__tipo("P2")`); await esperar(140);
  corre(m, `window.__cantidad(200)`); await esperar(180);
  c = cupo(m);
  comprobar("una línea a contado sola no pinta la caja de cupo (no consume)", c.present === false);

  /* ── 6 · la regla de autorización NO cambió (invariante de código) ── */
  comprobar("`requiereAutorizacion = esP5 || excedeCupo` sigue intacto en el código",
    /const requiereAutorizacion\s*=\s*esP5\s*\|\|\s*excedeCupo/.test(jsx) &&
    /requiere:\s*requiereAutorizacion/.test(jsx));

  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗ · " + (ok+mal) + " comprobaciones (esperadas " + ESPERADAS + ")");
  if (ok + mal !== ESPERADAS) { console.log("  ✗ AVISO: corrieron " + (ok+mal) + " y se esperaban " + ESPERADAS); process.exit(1); }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.stack || e).split("\n").slice(0,3).join("\n")); process.exit(1); });
