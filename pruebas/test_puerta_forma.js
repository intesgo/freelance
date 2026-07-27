/* ═══════════════════════════════════════════════════════════════════════
   LA PUERTA POR DENTRO · lo que NO puede cambiar aunque cambie la pinta

   Este arnés se escribió ANTES de rediseñar la pantalla de ingreso, a
   propósito: primero se deja por escrito cómo se comporta hoy, y recién
   después se toca el diseño. Si algo de esto se pone rojo, el rediseño
   rompió algo, por lindo que se vea.

   Lo que vigila:
     · los dos campos existen y están atados al mismo estado de siempre;
     · Ingresar llama a la autenticación REAL con lo que se escribió,
       recortado y en minúsculas (así entra el correo a Supabase);
     · si la clave falla, se muestra el motivo y NO se deja entrar;
     · si entra bien, avisa hacia afuera para que la app navegue;
     · ver/ocultar la clave cambia el tipo del campo, nada más;
     · Enter en la clave equivale a tocar Ingresar;
     · el olvido de clave sigue yendo al portal;
     · se puede ir y volver entre huella y clave.

   Uso: node test_puerta_forma.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("freelance-completo");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets: ["react"] }).code;

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms || 220));

function montar({ claveBuena = true } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  w.Notification = function () {}; w.Notification.permission = "denied"; w.Notification.requestPermission = async () => "denied";
  /* con PublicKeyCredential presente y https, la pantalla arranca pidiendo clave */
  w.PublicKeyCredential = function () {};

  const intentos = [], avisos = [];
  const q = (t) => {
    const datos = t === "usuarios"
      ? [{ usr_id: "FRL-RR", nombre: "Richard Ramírez", rol: "freelance", activo: true }] : [];
    const p = Promise.resolve({ data: datos, error: null, count: 0 });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "gte", "lte"].forEach((m) => { p[m] = () => q(t); });
    p.maybeSingle = () => Promise.resolve({ data: datos[0] || null, error: null }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error: null }); p.upsert = () => Promise.resolve({ error: null });
    p.update = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    p.delete = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async (c) => {
        intentos.push(c);
        return claveBuena
          /* la app exige SESIÓN, no solo usuario: si el doble devuelve solo
             `user`, la pantalla dice "correo o clave incorrectos" — y tiene
             razón. Este doble devuelve lo mismo que Supabase de verdad. */
          ? { data: { user: { id: "u1", email: c.email },
                      session: { user: { id: "u1", email: c.email } } }, error: null }
          : { data: null, error: { message: "Invalid login credentials" } };
      },
      signOut: async () => ({}),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (t) => q(t), rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
  };
  const ctx = dom.getInternalVMContext();
  ctx.__avisos = avisos;
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__cont).render(
        React.createElement(PantallaLogin, { onAutenticado: function(u){ __avisos.push(u||{}); } }));
    });
    window.__txt = function(){ return window.__cont.textContent || ""; };
    /* Por etiqueta accesible: el botón del ojo ya no tiene texto, y buscar
       por texto hacía que "ver" cazara con "Volver al ingreso con huella".
       Es la cuarta vez que dos botones parecidos engañan a un arnés. */
    window.__tocarAria = function(t){
      var bs = window.__cont.querySelectorAll("button[aria-label]");
      for(var i=0;i<bs.length;i++){
        if((bs[i].getAttribute("aria-label")||"").indexOf(t)>=0 && !bs[i].disabled){ bs[i].click(); return true; } }
      return false;
    };
    window.__tocar = function(t){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){
        if((bs[i].textContent||"").indexOf(t)>=0 && !bs[i].disabled){ bs[i].click(); return true; } }
      return false;
    };
    window.__campos = function(){
      return { texto: window.__cont.querySelectorAll("input[type=text],input[type=email]").length,
               clave: window.__cont.querySelectorAll("input[type=password]").length,
               visible: window.__cont.querySelectorAll("input[type=text]").length };
    };
    window.__escribir = function(sel, valor){
      var el = window.__cont.querySelector(sel); if(!el) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(el, valor);
      el.dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
    window.__enter = function(sel){
      var el = window.__cont.querySelector(sel); if(!el) return false;
      el.dispatchEvent(new window.KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
      return true;
    };
  `, ctx);
  return { ctx, intentos, avisos, w };
}
const txt = (m) => vm.runInContext("window.__txt()", m.ctx);
const tocar = (m, t) => vm.runInContext(`window.__tocar(${JSON.stringify(t)})`, m.ctx);
const campos = (m) => vm.runInContext("window.__campos()", m.ctx);
const escribir = (m, s, v) => vm.runInContext(`window.__escribir(${JSON.stringify(s)},${JSON.stringify(v)})`, m.ctx);

/* Llena los dos campos sin depender de cómo se vean: se buscan por tipo. */
async function llenar(m, correo, clave) {
  escribir(m, "input[type=text],input[type=email]", correo);
  await esperar(120);
  escribir(m, "input[type=password]", clave);
  await esperar(120);
}

(async () => {
  console.log("═══ La puerta por dentro · " + nombreApp);

  /* ── 1 · la forma mínima ─────────────────────────────────────────── */
  const m = montar();
  await esperar(320);
  const c = campos(m);
  comprobar("hay un campo para el correo y uno para la clave", c.texto === 1 && c.clave === 1);
  comprobar("la clave nace tapada", c.clave === 1 && c.texto === 1);

  /* ── 2 · ver / ocultar ───────────────────────────────────────────── */
  comprobar("hay un botón para ver la clave, y se puede nombrar",
    vm.runInContext('window.__tocarAria("Ver la clave")', m.ctx) === true);
  await esperar(200);
  comprobar("al tocarlo la clave se destapa",
    campos(m).clave === 0 && campos(m).texto === 2);

  /* ── 3 · lo que se manda a autenticar ────────────────────────────── */
  const m2 = montar({ claveBuena: false });
  await esperar(320);
  await llenar(m2, "  Intesgo@Gmail.com  ", "miclave123");
  comprobar("Ingresar existe y se puede tocar", tocar(m2, "Ingresar"));
  await esperar(420);
  comprobar("autentica de verdad contra Supabase, una sola vez", m2.intentos.length === 1);
  comprobar("manda el correo recortado y en minúsculas, y la clave tal cual",
    m2.intentos[0] && m2.intentos[0].email === "intesgo@gmail.com" && m2.intentos[0].password === "miclave123");

  /* ── 4 · si falla, se dice y no se entra ─────────────────────────── */
  comprobar("con la clave mala NO deja entrar", m2.avisos.length === 0);
  comprobar("y muestra un motivo en pantalla, no una pantalla muda",
    /incorrect|no coincide|inválid|invalid|no existe|clave/i.test(txt(m2)));

  /* ── 5 · si entra bien, avisa hacia afuera ───────────────────────── */
  const m3 = montar({ claveBuena: true });
  await esperar(320);
  await llenar(m3, "intesgo@gmail.com", "buena");
  tocar(m3, "Ingresar");
  await esperar(700);
  comprobar("con la clave buena sí autentica", m3.intentos.length === 1);
  if (process.env.VER) console.log("   [texto tras entrar] " + txt(m3).replace(/\s+/g," ").slice(0,200));
  comprobar("y el ingreso sigue su curso: pasa a preparar la jornada",
    /Preparando jornada|Estableciendo sesión|Sincroniz|Todo listo/i.test(txt(m3)));
  comprobar("y ya NO muestra un error de credenciales", !/incorrect/i.test(txt(m3)));

  /* ── 6 · Enter en la clave equivale a tocar Ingresar ─────────────── */
  const m4 = montar({ claveBuena: false });
  await esperar(320);
  await llenar(m4, "intesgo@gmail.com", "otra");
  vm.runInContext('window.__enter("input[type=password]")', m4.ctx);
  await esperar(420);
  comprobar("Enter en la clave hace lo mismo que tocar Ingresar", m4.intentos.length === 1);

  /* ── 7 · los caminos de al lado siguen ahí ───────────────────────── */
  comprobar("el olvido de clave sigue apuntando al portal",
    /index\.html#olvido/.test(html));
  const m5 = montar();
  await esperar(320);
  comprobar("se puede pasar al ingreso con huella", tocar(m5, "huella"));
  await esperar(250);
  comprobar("y desde ahí volver a usuario y clave",
    tocar(m5, "usuario y clave") || tocar(m5, "correo y clave") || tocar(m5, "clave"));
  await esperar(250);
  comprobar("al volver, los dos campos están otra vez",
    campos(m5).texto === 1 && campos(m5).clave === 1);

  /* ── 8 · la puerta no inventa un rol ─────────────────────────────── */
  comprobar("sigue exigiendo ficha activa en el padrón para dejar entrar",
    /activo === false/.test(html) && /auth_uid/.test(html));

  console.log("Resultado " + nombreApp + ": " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
