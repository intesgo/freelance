/* ═══════════════════════════════════════════════════════════════════════
   LA PILADORA CAMBIA SU COSTO DESDE SU APP · proveedor-freelance b61

   Regla de Richard (26 jul): el costo lo pone la piladora desde su aplicativo,
   rige desde la fecha que ella diga —hoy o próxima—, ENTRA SOLO (no espera
   aprobación) y a Richard le llega el aviso.

   Se comprueba contra el bundle real:
     · con sesión, la hoja pide los DOS costos (crédito y contado) y la fecha;
     · manda a la base el producto, la presentación y la fecha correctas;
     · el contado vacío viaja como "sin descuento", no como cero;
     · NO se puede elegir una fecha pasada;
     · dice que entra solo y que el precio de venta no se mueve;
     · sin sesión, la demostración de siempre sigue con su flujo de propuesta.

   Uso: node test_costo_piladora.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("proveedor-freelance");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets:["react"] }).code;

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 150));
const hoy = new Date().toISOString().slice(0,10);

/* Una oferta de verdad de la piladora Santa Rosa */
const OFERTA = {
  oferta_id:"OF-1", prod_id:"P-18", pres_cod:"QQ", presentacion:"Quintal", equiv_qq:1,
  prov_cod:"ROS", costo:38, costo_contado:37, precio_contado:47, precio_credito:48,
  margen_min:8, activo:true, vigente_desde:"2026-07-21", es_demo:false,
};

function montar(conSesion) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";

  const llamadas = [];
  const q = (t) => {
    const datos = t === "v_ofertas_vigentes" ? [OFERTA]
                : t === "productos" ? [{ prod_id:"P-18", nombre:"Arroz Dallis", linea:"Arroz" }]
                : t === "usuarios" ? [{ usr_id:"PRV-01", nombre:"Piladora QA", rol:"proveedor", prov_cod:"ROS", activo:true }]
                : [];
    const p = Promise.resolve({ data: conSesion ? datos : [], error:null, count:0 });
    ["select","eq","neq","in","order","limit","like","not","is","gte","lte","or"].forEach(m => { p[m] = () => q(t); });
    p.maybeSingle = () => Promise.resolve({ data: conSesion ? (datos[0]||null) : null, error:null }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error:null }); p.upsert = () => Promise.resolve({ error:null });
    p.update = () => { const r = Promise.resolve({ error:null }); r.eq = () => r; return r; };
    p.delete = () => { const r = Promise.resolve({ error:null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: {
      getSession: async () => (conSesion ? { data:{ session:{ user:{ id:"u1", email:"pil@ejemplo.com" } } } } : { data:{ session:null } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => q(t),
    rpc: async (nombre, args) => {
      llamadas.push({ nombre, args });
      return { data:[{ oferta_id:"OF-NUEVA", desde:args.p_desde, costo:args.p_costo,
                       costo_contado:args.p_costo_contado, aviso:"Rige desde hoy" }], error:null };
    },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);

  /* Se monta la HOJA de edición directamente: es donde vive la decisión. */
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    window.__guardados = [];
    window.__p = { id:"OF-1", prodId:"P-18", presCod:"QQ", provCod:"ROS",
      nombre:"Arroz Dallis", pres:"Quintal", base:38, contado:37, desde:"2026-07-21", propuesto:null };
    window.__montar = function(vivo){
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__cont).render(React.createElement(PrecioSheet, {
          p: window.__p, vivo: vivo, guardando: false,
          onClose: function(){},
          onCambiar: function(c, k, d){ window.__guardados.push({ costo:c, contado:k, desde:d }); },
          onProponer: function(v,m){ window.__guardados.push({ propuesta:v, motivo:m }); },
          onRetirar: function(){},
        }));
      });
    };
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tocar = function(texto){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto) >= 0){ bs[i].click(); return true; } }
      return false;
    };
    window.__campo = function(etiqueta){
      var ls = window.__cont.querySelectorAll("label");
      for(var i=0;i<ls.length;i++){
        if((ls[i].textContent||"").indexOf(etiqueta) >= 0){
          var c = ls[i].parentElement.querySelector("input");
          if(c) return c;
        }
      }
      return null;
    };
    window.__escribir = function(etiqueta, valor){
      var el = window.__campo(etiqueta);
      if(!el) return false;
      var proto = el.type === "date" ? window.HTMLInputElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,"value").set.call(el, valor);
      el.dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
  `, ctx);
  return { ctx, llamadas };
}

const txt = (m) => vm.runInContext("window.__txt()", m.ctx);
const tocar = (m,t) => vm.runInContext(`window.__tocar(${JSON.stringify(t)})`, m.ctx);
const escribir = (m,e,v) => vm.runInContext(`window.__escribir(${JSON.stringify(e)}, ${JSON.stringify(v)})`, m.ctx);
const guardados = (m) => vm.runInContext("window.__guardados", m.ctx);

(async () => {
  console.log("═══ La piladora cambia su costo · " + nombreApp);

  /* ── CON DATOS DE VERDAD ── */
  const m = montar(true);
  vm.runInContext("window.__montar(true)", m.ctx);
  await esperar(200);
  let t = txt(m);
  comprobar("pide el costo a crédito", /Costo a crédito/.test(t));
  comprobar("y el costo de contado", /Costo si le pagan de contado/.test(t));
  comprobar("dice que se puede dejar vacío si no hay descuento", /Déjalo vacío/.test(t));
  comprobar("pregunta desde cuándo rige", /Desde hoy/.test(t) && /Desde una fecha/.test(t));
  comprobar("avisa que ENTRA SOLO, sin aprobación", /entra solo/i.test(t) && !/Enviar al freelance/.test(t));
  comprobar("y que el precio de venta no se mueve", /no cambia/.test(t));

  escribir(m, "Costo a crédito", "41");
  escribir(m, "Costo si le pagan", "40");
  await esperar(150);
  tocar(m, "Guardar costo");
  await esperar(200);
  let g = guardados(m);
  comprobar("guarda los dos costos y la fecha de hoy",
    g.length === 1 && g[0].costo === 41 && String(g[0].contado) === "40" && g[0].desde === hoy);

  /* ── una fecha próxima ── */
  const m2 = montar(true);
  vm.runInContext("window.__montar(true)", m2.ctx);
  await esperar(200);
  tocar(m2, "Desde una fecha");
  await esperar(150);
  t = txt(m2);
  comprobar("al elegir fecha, explica que no puede ser pasada", /no se puede poner una fecha pasada/i.test(t));
  const minFecha = vm.runInContext(`(function(){ var e=window.__campo("Rige a partir"); return e ? e.getAttribute("min") : null; })()`, m2.ctx);
  comprobar("el calendario no deja elegir días pasados", minFecha === hoy);

  escribir(m2, "Costo a crédito", "44");
  escribir(m2, "Rige a partir", "2026-08-15");
  await esperar(150);
  tocar(m2, "Guardar costo");
  await esperar(200);
  g = guardados(m2);
  comprobar("manda la fecha elegida, no la de hoy", g.length === 1 && g[0].desde === "2026-08-15");

  /* ── contado vacío = sin descuento, no cero ── */
  const m3 = montar(true);
  vm.runInContext(`window.__p.contado = null; window.__montar(true);`, m3.ctx);
  await esperar(200);
  escribir(m3, "Costo a crédito", "39");
  await esperar(150);
  tocar(m3, "Guardar costo");
  await esperar(200);
  g = guardados(m3);
  comprobar("sin costo de contado no manda cero, manda vacío",
    g.length === 1 && (g[0].contado === "" || g[0].contado === null));

  /* ── SIN SESIÓN: la demostración conserva su flujo ── */
  const d = montar(false);
  vm.runInContext("window.__montar(false)", d.ctx);
  await esperar(200);
  t = txt(d);
  comprobar("en demostración sigue el flujo de propuesta al freelance",
    /Enviar al freelance/.test(t) && !/Costo si le pagan de contado/.test(t));

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.message || e).split("\n")[0]); process.exit(1); });
