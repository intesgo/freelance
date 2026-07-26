/* ═══════════════════════════════════════════════════════════════════════
   COTIZACIÓN · Comisionista b167

   El vendedor la arma frente al cliente: escoge a quién, cómo paga, qué lleva,
   y la manda. Se comprueba contra el bundle real:
     · con sesión salen los clientes y los precios de VERDAD;
     · al escoger cliente se pone la condición que él ya tiene acordada;
     · el precio cambia entre contado y crédito, y las cuentas cuadran;
     · no se puede mandar una cotización sin cliente o sin productos;
     · la hoja sale con el RUC, la dirección y el total;
     · el texto de WhatsApp lleva lo mismo que la hoja;
     · sin sesión, la demostración de siempre.

   Uso: node test_cotizacion.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const Babel = require("./rutas").Babel;

const ruta = process.argv[2] || require("./rutas").app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = Babel.transform(jsx, { presets:["react"] }).code;
const react = require("./rutas").reactDev();
const reactDom = require("./rutas").reactDomDev();

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 150));

const CLIENTES_BD = [
  { cli_id:"CLI-A", nombre:"ROCELUMA CIA LTDA", razon_social:"ROCELUMA CIA LTDA", ruc:"19347672001",
    tel:"967897120", tel2:null, plazo:30, condicion_pago:"Crédito", activo:true },
  { cli_id:"CLI-B", nombre:"PAUL YANEZ", razon_social:"PAUL YANEZ", ruc:"0918269513",
    tel:"9845520021", tel2:null, plazo:0, condicion_pago:"Contado", activo:true },
];
const UBIC_BD = [
  { cli_id:"CLI-A", ciudad:"Cuenca", direccion:"Mariscal Lamar 2-59", principal:true },
  { cli_id:"CLI-B", ciudad:"Ibarra", direccion:"Mariana de Jesús", principal:true },
];
const PRECIOS_BD = [
  { prod_id:"P-DAL", producto:"Arroz Dallis", base_contado:47.00, base_credito:48.00, vigente_hasta:null },
  { prod_id:"P-LIR", producto:"Arroz Extra Lira", base_contado:40.00, base_credito:41.00, vigente_hasta:null },
  /* precio viejo: NO debe aparecer nunca */
  { prod_id:"P-VIE", producto:"Arroz Precio Viejo", base_contado:99.00, base_credito:99.00, vigente_hasta:"2026-06-30" },
];
const PRODUCTOS_BD = [
  /* la etiqueta miente a propósito: dice una piladora distinta de la que surte */
  { prod_id:"P-DAL", marca:"Dallis", linea:"Arroz", proveedor:"POR ASIGNAR", estado:"activo" },
  { prod_id:"P-LIR", marca:"Extra Lira", linea:"Arroz", proveedor:"POR ASIGNAR", estado:"activo" },
];
/* Quien surte de verdad: la oferta activa. Dallis la tiene una sola piladora;
   Extra Lira, dos — al cliente se le dice cuántas, no una al azar. */
const OFERTAS_BD = [
  { prod_id:"P-DAL", prov_cod:"ROS", activo:true },
  { prod_id:"P-LIR", prov_cod:"AGU", activo:true },
  { prod_id:"P-LIR", prov_cod:"CRI", activo:true },
  { prod_id:"P-VIE", prov_cod:"AGU", activo:false },
];
const PROVEEDORES_BD = [
  { prov_cod:"ROS", nombre:"Piladora Santa Rosa" },
  { prov_cod:"AGU", nombre:"Piladora San Agustín" },
  { prov_cod:"CRI", nombre:"Piladora Cristina" },
];
const ORG_BD = [{ nombre:"Richard Ramírez Salazar", ruc:"0919927533001", tel:"0997521936", correo:"intesgo@gmail.com" }];

function montar(conSesion) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.navigator.vibrate = () => {};
  const impresiones = [];
  w.print = () => impresiones.push(1);
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
  const datosDe = (t) => {
    if (t === "clientes")            return CLIENTES_BD;
    if (t === "ubicaciones_cliente") return UBIC_BD;
    if (t === "precios")             return PRECIOS_BD;
    if (t === "productos")           return PRODUCTOS_BD;
    if (t === "organizaciones")      return ORG_BD;
    if (t === "ofertas_piladora")    return OFERTAS_BD;
    if (t === "proveedores")         return PROVEEDORES_BD;
    if (t === "usuarios")            return [{ usr_id:"SC1", nombre:"Carlos Andrade", rol:"subcomisionista", activo:true }];
    return [];
  };
  const q = (t) => {
    const filas = conSesion ? datosDe(t) : [];
    const p = Promise.resolve({ data: filas, error:null, count:0 });
    ["select","eq","neq","in","order","limit","like","not","is","gte","lte","or"].forEach(m => { p[m] = () => q(t); });
    p.maybeSingle = () => Promise.resolve({ data: filas[0] || null, error:null }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error:null }); p.upsert = () => Promise.resolve({ error:null });
    p.update = () => { const r = Promise.resolve({ error:null }); r.eq = () => r; return r; };
    p.delete = () => { const r = Promise.resolve({ error:null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: {
      getSession: async () => (conSesion ? { data:{ session:{ user:{ id:"u1", email:"carlos@ejemplo.com" } } } } : { data:{ session:null } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => q(t), rpc: async () => ({ data:null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(react, ctx); vm.runInContext(reactDom, ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__cont).render(React.createElement(Cotizacion, { toast: function(m){ (window.__avisos=window.__avisos||[]).push(m); } }));
    });
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tocar = function(texto){
      var bs = window.__cont.querySelectorAll("button, a");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto) >= 0){ bs[i].click(); return true; } }
      return false;
    };
    window.__escribir = function(marcador, valor){
      var ins = window.__cont.querySelectorAll("input");
      for(var i=0;i<ins.length;i++){
        if((ins[i].placeholder||"").indexOf(marcador) >= 0 || (ins[i].getAttribute("aria-label")||"").indexOf(marcador) >= 0){
          var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
          set.call(ins[i], valor);
          ins[i].dispatchEvent(new window.Event("input",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
    window.__enlaceWhats = function(){
      var a = window.__cont.querySelector('a[href^="https://wa.me/"]');
      return a ? decodeURIComponent(a.getAttribute("href").replace("https://wa.me/?text=","")) : "";
    };
  `, ctx);
  return { ctx, impresiones, w };
}

const txt = (m) => vm.runInContext("window.__txt()", m.ctx);
const tocar = (m, t) => vm.runInContext(`window.__tocar(${JSON.stringify(t)})`, m.ctx);
const escribir = (m, k, v) => vm.runInContext(`window.__escribir(${JSON.stringify(k)}, ${JSON.stringify(v)})`, m.ctx);

(async () => {
  console.log("═══ Cotización · " + nombreApp);

  const m = montar(true);
  await esperar(400);
  let t = txt(m);
  comprobar("con sesión trabaja con datos vivos", /Datos vivos/.test(t));
  comprobar("no se puede mandar sin nada: el botón está apagado",
    vm.runInContext(`(function(){ var bs=window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf("Ver cotización")>=0) return bs[i].disabled; }
      return null; })()`, m.ctx) === true);

  /* ── escoger cliente ── */
  escribir(m, "nombre, RUC o ciudad", "roceluma");
  await esperar(200);
  comprobar("busca clientes por nombre", /ROCELUMA/.test(txt(m)));
  comprobar("no aparece el que no coincide", !/PAUL YANEZ/.test(txt(m)));
  tocar(m, "ROCELUMA");
  await esperar(200);
  t = txt(m);
  comprobar("al escoger, muestra su RUC", /19347672001/.test(t));
  comprobar("y toma la condición que ya tiene acordada (crédito)", /A crédito/.test(t));

  /* ── agregar productos ── */
  escribir(m, "producto para agregarlo", "arroz");
  await esperar(200);
  t = txt(m);
  comprobar("busca productos", /Dallis/.test(t) && /Extra Lira/.test(t));
  comprobar("NO ofrece un precio que ya venció", !/Precio Viejo/.test(t));
  comprobar("a crédito muestra el precio de crédito ($48,00)", /\$48,00/.test(t));

  tocar(m, "Dallis");
  await esperar(200);
  escribir(m, "producto para agregarlo", "lira");
  await esperar(200);
  tocar(m, "Extra Lira");
  await esperar(250);
  t = txt(m);
  comprobar("agrega con 10 quintales por defecto", /10 quintales|20 quintales/.test(t));
  comprobar("dice quién surte de verdad, no la etiqueta del producto",
    /Piladora Santa Rosa/.test(t) && !/POR ASIGNAR|Por asignar/i.test(t));
  comprobar("si lo tienen varias piladoras, lo dice sin escoger una al azar", /2 piladoras lo tienen/.test(t));

  /* ── cambiar cantidades ── */
  escribir(m, "Quintales de Arroz Dallis", "60");
  await esperar(200);
  escribir(m, "Quintales de Arroz Extra Lira", "40");
  await esperar(250);
  t = txt(m);
  /* 60×48 + 40×41 = 2880 + 1640 = 4520 */
  comprobar("suma bien a crédito: 100 qq y $4.520,00", /100 quintales/.test(t) && /\$4\.520,00/.test(t));

  /* ── cambiar a contado: el precio baja ── */
  tocar(m, "De contado");
  await esperar(250);
  t = txt(m);
  /* 60×47 + 40×40 = 2820 + 1600 = 4420 */
  comprobar("de contado el total baja a $4.420,00", /\$4\.420,00/.test(t));
  tocar(m, "A crédito");
  await esperar(250);

  /* ── la hoja ── */
  tocar(m, "Ver cotización");
  await esperar(300);
  t = txt(m);
  comprobar("la hoja sale con el número de cotización", /COT-\d{4}-\d{4}-\d{4}/.test(t));
  comprobar("con los datos del negocio", /0919927533001/.test(t));
  comprobar("con la dirección del cliente", /Mariscal Lamar/.test(t) && /Cuenca/.test(t));
  comprobar("con el plazo de crédito", /Crédito 30 días/.test(t));
  comprobar("y con el total", /\$4\.520,00/.test(t));

  const whats = vm.runInContext("window.__enlaceWhats()", m.ctx);
  comprobar("el mensaje de WhatsApp lleva el mismo total", /\$4\.520,00/.test(whats));
  comprobar("y el detalle de cada producto",
    /Arroz Dallis: 60 qq/.test(whats) && /Arroz Extra Lira: 40 qq/.test(whats));
  comprobar("y avisa que vence en 7 días", /7 días/.test(whats));

  tocar(m, "Imprimir o PDF");
  await esperar(200);
  comprobar("el botón de imprimir abre la impresión del teléfono", m.impresiones.length === 1);

  tocar(m, "Cerrar");
  await esperar(200);
  comprobar("se cierra la hoja y vuelve a la pantalla", !/COT-\d{4}/.test(txt(m)));

  /* ── sin sesión ── */
  const d = montar(false);
  await esperar(400);
  t = txt(d);
  comprobar("sin sesión avisa que es demostración", /Demostración/.test(t));
  escribir(d, "nombre, RUC o ciudad", "mendoza");
  await esperar(200);
  comprobar("y ofrece los clientes de la demostración", /Mendoza/.test(txt(d)));

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.message || e).split("\n")[0]); process.exit(1); });
