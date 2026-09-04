/* ═══════════════════════════════════════════════════════════════════════
   LA PILADORA YA NO CAMBIA SU COSTO · proveedor-freelance
   SEG_PRECIOS_SOLO_FREELANCE (04/09/2026)

   La regla del 26/07 («el costo lo pone la piladora desde su app») quedó REVERTIDA:
   desde el 04/09 SOLO EL FREELANCE mueve costos y precios, sin excepciones. Este arnés
   es la MEMORIA de ese cambio: comprueba que la app del proveedor ya NO ofrece capturar
   costo, pero SÍ conserva el historial (en solo lectura) y una línea que dice quién lo
   mueve ahora. En demostración (sin sesión), el flujo de propuesta sigue igual.

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
  /* una fila de historial para P-18, para comprobar que el historial SÍ se sigue viendo */
  vm.runInContext(`try{ HIST_PRECIOS.push({ prodId:"P-18", nombre:"Arroz Dallis", de:38, a:41, desde:"2026-07-21", hasta:null, quien:"QA", motivo:"prueba", au:"AU-QA", estado:"vigente" }); }catch(e){}`, ctx);

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
  console.log("═══ La piladora YA NO cambia su costo · " + nombreApp);

  /* ── CON DATOS DE VERDAD (vivo=true) ── */
  const m = montar(true);
  vm.runInContext("window.__montar(true)", m.ctx);
  await esperar(200);
  let t = txt(m);
  comprobar("YA NO pide el costo a crédito", !/Costo a crédito/.test(t));
  comprobar("YA NO pide el costo de contado", !/Costo si le pagan de contado/.test(t));
  comprobar("YA NO pregunta desde cuándo rige", !/Desde una fecha/.test(t) && !/Desde cuándo rige/i.test(t));
  comprobar("YA NO tiene el botón «Guardar costo»", !vm.runInContext(`window.__tocar("Guardar costo")`, m.ctx));
  comprobar("dice quién mueve el costo ahora", /El costo lo actualiza el freelance\. Escríbele si cambió\./.test(t));
  comprobar("el historial de costos SIGUE visible (solo lectura)", /historial de este precio/.test(t));
  /* no hay forma de capturar costo: aunque el arnés pase onCambiar, nada lo dispara */
  comprobar("no se dispara ningún guardado de costo (no hay puerta)", guardados(m).length === 0);

  /* ── SIN SESIÓN: la demostración conserva su flujo de propuesta ── */
  const d = montar(false);
  vm.runInContext("window.__montar(false)", d.ctx);
  await esperar(200);
  t = txt(d);
  comprobar("en demostración sigue el flujo de propuesta al freelance",
    /Enviar al freelance/.test(t) && !/Costo si le pagan de contado/.test(t));

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.message || e).split("\n")[0]); process.exit(1); });
