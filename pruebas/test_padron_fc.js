/* ═══════════════════════════════════════════════════════════════════════
   FREELANCE-COMPLETO · la app no reparte poder por su cuenta.

   Lo que se comprueba: quien tiene cuenta de acceso pero NO tiene fila en el
   padrón NO entra. Antes entraba, y encima con el rol "freelance" — el de más
   poder del negocio. Igual para una cuenta dada de baja: no entra y se le
   cierra la sesión.

   Uso: node test_padron_fc.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const Babel = require("./rutas").Babel;

const ruta = require("./rutas").app("freelance-completo");
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = Babel.transform(jsx, { presets:["react"] }).code;
const react = require("./rutas").react();
const reactDom = require("./rutas").reactDom();

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };

/* fila = null → cuenta sin padrón; {activo:false} → dada de baja */
function montar(fila) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.navigator.vibrate = () => {}; w.alert = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
  const salidas = [];
  const q = (tabla) => {
    const filas = (tabla === "usuarios" && fila) ? [fila] : [];
    const p = Promise.resolve({ data: filas, error:null, count:0 });
    ["select","eq","neq","in","order","limit","like","not","is","gte","lte","or"].forEach(m => { p[m] = () => q(tabla); });
    p.maybeSingle = () => Promise.resolve({ data: filas[0] || null, error:null }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error:null }); p.upsert = () => Promise.resolve({ error:null });
    p.update = () => { const r = Promise.resolve({ error:null }); r.eq = () => r; return r; };
    p.delete = () => { const r = Promise.resolve({ error:null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: {
      getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"colado@ejemplo.com" } } } }),
      signOut: async () => { salidas.push("signOut"); return {}; },
      signInWithPassword: async () => ({ data:{ session:{ user:{ id:"u1", email:"colado@ejemplo.com" } } }, error:null }),
      onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => q(t), rpc: async () => ({ data:null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(react, ctx); vm.runInContext(reactDom, ctx); vm.runInContext(js, ctx);
  return { ctx, salidas };
}

const guion = `(async()=>{
  var cont=document.createElement("div"); document.body.appendChild(cont);
  ReactDOM.flushSync(function(){ ReactDOM.createRoot(cont).render(React.createElement(Root)); });
  await new Promise(function(r){ setTimeout(r,900); });
  return (document.body.innerText||cont.textContent||"");
})()`;

(async () => {
  console.log("═══ freelance-completo · quién puede entrar");

  const colado = montar(null);
  const t1 = await vm.runInContext(guion, colado.ctx);
  comprobar("cuenta sin fila en el padrón: NO entra", /no está habilitada/.test(t1));
  comprobar("cuenta sin fila en el padrón: se le cierra la sesión", colado.salidas.indexOf("signOut") >= 0);
  comprobar("cuenta sin fila en el padrón: no se le regala el rol de freelance",
    !/Novedades|Mis pedidos/.test(t1));

  const baja = montar({ usr_id:"SC-01", nombre:"Carlos Andrade", rol:"subcomisionista", activo:false });
  const t2 = await vm.runInContext(guion, baja.ctx);
  comprobar("cuenta dada de baja: NO entra", /dada de baja/.test(t2));
  comprobar("cuenta dada de baja: se le cierra la sesión", baja.salidas.indexOf("signOut") >= 0);

  const buena = montar({ usr_id:"FRL-RR", nombre:"Richard Ramírez", rol:"freelance", activo:true });
  const t3 = await vm.runInContext(guion, buena.ctx);
  comprobar("cuenta buena: entra normal", t3.length > 200 && !/no está habilitada|dada de baja/.test(t3));
  comprobar("cuenta buena: no se le cierra la sesión", buena.salidas.length === 0);

  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.message || e).split("\n")[0]); process.exit(1); });
