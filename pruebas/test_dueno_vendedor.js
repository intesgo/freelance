/* ═══════════════════════════════════════════════════════════════════════
   R-01 · MITAD B · ¿A QUIÉN PUEDE PERTENECER UN CLIENTE?

   Escrito ANTES de tocar el formulario, a propósito. Con el código de hoy
   tiene que salir ROJO, y por dos motivos distintos:

     1. El desplegable "Pertenece a" no puede ofrecer nombres escritos a
        mano en el código que no existan en el padrón.

     2. Al elegir, el formulario guarda el NOMBRE en `dueno` y nunca toca
        `sub_id`. Y `sub_id` es la única columna que la base mira para
        decidir qué clientes ve un vendedor y a quién se le paga la
        comisión.

   Lo que exige este arnés:
     · el desplegable sale del padrón simulado, no de una lista fija;
     · solo aparece quien vende y está activo (ni logística, ni
       transportista, ni gente de baja);
     · al elegir se guarda el usr_id en `sub_id`, no solo el nombre;
     · "Directo del freelance" sigue existiendo y NO inventa un sub_id;
     · un cliente con nombre escrito a mano y sin vincular LO DICE, en vez
       de aparentar que está asignado.

   El último punto es el que da valor a los demás: si la pantalla se
   quedara muda, los clientes heredados seguirían pareciendo correctos.

   Uso: SISTEMA_WEB=/ruta/sistema-web.html node test_dueno_vendedor.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.env.SISTEMA_WEB || require("./rutas").app("sistema-web");
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets: ["react"] }).code;

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };

console.log("═══ R-01 · a quién puede pertenecer un cliente");

/* Padrón completamente sintético. Tiene, a propósito, gente que NO debe
   salir en el desplegable: quien no vende y quien está de baja. */
const PADRON = [
  { usr_id:"FRL-DEMO", nombre:"Freelance Demo",       rol:"freelance",      activo:true  },
  { usr_id:"VEN-DEMO-01", nombre:"Vendedor Demo Uno", rol:"comisionista",   activo:true  },
  { usr_id:"VEN-DEMO-02", nombre:"Vendedor Demo Dos", rol:"comisionista",   activo:true  },
  { usr_id:"SOC-DEMO-01", nombre:"Socio Demo Uno",    rol:"socio",          activo:true  },
  { usr_id:"OPE-DEMO-01", nombre:"Logística Demo",    rol:"logistica",      activo:true  },
  { usr_id:"CON-DEMO-01", nombre:"Finanzas Demo",     rol:"financiero",     activo:true  },
  { usr_id:"TRA-DEMO-01", nombre:"Transporte Demo",   rol:"transportista",  activo:true  },
  { usr_id:"VEN-DEMO-09", nombre:"Vendedor Inactivo", rol:"comisionista",   activo:false },
];
const SI_VENDEN  = ["Vendedor Demo Uno", "Vendedor Demo Dos", "Socio Demo Uno"];
const NO_VENDEN  = ["Logística Demo", "Finanzas Demo", "Transporte Demo"];
const INVENTADOS = ["Nombre Fijo Uno", "Nombre Fijo Dos", "Nombre Fijo Tres", "Nombre Fijo Cuatro"];

/* Cliente sintético heredado: su dueño está escrito a mano y NO está vinculado. */
const HEREDADO = {
  id:"CLI-DEMO-01", nombre:"Cliente Demo", razonSocial:"Cliente Demo S.A.",
  /* Valores sintéticos con formato válido para atravesar la validación del formulario. */
  ruc:"0100000009001", tipo:"Natural", telefono:"0990000000", telefono2:"", email:"",
  canal:"Bodega", listaPrecio:"Contado", condicionPago:"Contado", estadoCredito:"Al día",
  cupo:0, usado:0, plazo:0, descuento:0, estadoCliente:"ACTIVO", docsOk:0,
  dueno:"VENDEDOR DEMO DOS", subId:null, vinculos:[], terceros:[],
  ubicaciones:[{ nombre:"Local demo", principal:true, provincia:"Provincia Demo", ciudad:"Ciudad Demo",
                 sector:"Sector Demo", barrio:"Barrio Demo", direccion:"Dirección Demo", lat:"0", lng:"0",
                 tipoEntrega:"local", contactoNombre:"Contacto Demo" }],
};
/* Control: uno que YA está vinculado. No debe salir ningún aviso. */
const VINCULADO = { ...HEREDADO, id:"CLI-DEMO-02", dueno:"Vendedor Demo Uno", subId:"VEN-DEMO-01" };

function dobleSupa() {
  const from = (tabla) => {
    const filas = tabla === "usuarios" ? PADRON.slice() : [];
    const api = {
      select(){ return api; }, eq(){ return api; }, in(){ return api; },
      order(){ return api; }, range(){ return api; }, limit(){ return api; },
      then(res, rej){ return Promise.resolve({ data: filas, error: null }).then(res, rej); },
      catch(f){ return Promise.resolve({ data: filas, error: null }).catch(f); },
    };
    return api;
  };
  return { from,
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }) } };
}

function montar(cliente) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = (q) => ({ matches:false, media:q, addListener(){}, removeListener(){},
    addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {};
  w.Notification = function(){}; w.Notification.permission = "denied";
  w.navigator.clipboard = { writeText: () => Promise.resolve() };
  w.supa = dobleSupa();
  w.XLSX = null;
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__guardado = null;
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(PantallaCliente, {
        clienteInicial: ${JSON.stringify(cliente)},
        clientes: [],
        usuario: { usr_id:"FRL-DEMO", nombre:"Freelance Demo", rol:"freelance" },
        onCerrar: function(){},
        onGuardar: function(cli, esEdicion){ window.__guardado = cli; } }));
    });
    window.__txt = function(){ return window.__c.textContent || ""; };

    /* "Pertenece a" vive en la pestaña Canal. Hay que ir hasta ella igual
       que iría una persona: pulsando el botón de la pestaña. */
    window.__irA = function(nombre){
      var bs = window.__c.querySelectorAll("button");
      for (var i=0;i<bs.length;i++){
        var txt = (bs[i].textContent||"").trim();
        if (txt === nombre || txt.indexOf(". "+nombre) >= 0 || txt.indexOf(nombre) === 0){ bs[i].click(); return true; }
      }
      return false;
    };

    /* "Pertenece a" es un buscador predictivo. Se localiza por su etiqueta,
       no por posición, para que no se rompa si mañana se mueve de sitio. */
    window.__inputPertenece = function(){
      var labels = window.__c.querySelectorAll("label");
      for (var i=0;i<labels.length;i++){
        if ((labels[i].textContent||"").indexOf("Pertenece a") >= 0) {
          var p = labels[i].parentNode;
          var s = p && p.querySelector("input");
          if (s) return s;
        }
      }
      return null;
    };
    window.__abrirPertenece = function(){
      var s=window.__inputPertenece(); if(!s) return false;
      var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(s,""); s.dispatchEvent(new window.Event("input",{bubbles:true}));
      s.dispatchEvent(new window.FocusEvent("focus",{bubbles:true})); return true;
    };
    window.__opciones = function(){
      var s=window.__inputPertenece(); if(!s) return null;
      var cajas=s.parentNode.querySelectorAll(":scope > div > div"),r=[];
      for(var i=0;i<cajas.length;i++) if((cajas[i].textContent||"").trim()) r.push({texto:(cajas[i].textContent||"").trim()});
      return r;
    };
    window.__elegirNombre = function(nombre){
      var s=window.__inputPertenece(); if(!s) return false;
      var cajas=s.parentNode.querySelectorAll(":scope > div > div");
      for(var i=0;i<cajas.length;i++) if((cajas[i].textContent||"").indexOf(nombre)>=0){
        cajas[i].dispatchEvent(new window.MouseEvent("mousedown",{bubbles:true})); return true;
      }
      return false;
    };
    window.__valorPertenece = function(){ var s=window.__inputPertenece(); return s?s.value:null; };
    window.__click = function(texto){
      var bs = window.__c.querySelectorAll("button");
      for (var i=0;i<bs.length;i++){ if ((bs[i].textContent||"").indexOf(texto) >= 0){ bs[i].click(); return true; } }
      return false;
    };
  `, ctx);
  return ctx;
}

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 150));
const leer = (ctx, expr) => vm.runInContext(expr, ctx);

(async () => {
  /* ── 1 · De dónde salen los nombres del desplegable ───────────────── */
  let ctx = null, cayo = "";
  try { ctx = montar(HEREDADO); } catch (e) { cayo = String((e && e.message) || e).split("\n")[0]; }
  comprobar("la pantalla del cliente se pinta sin reventar" + (cayo ? " → " + cayo : ""), !cayo);
  if (cayo) { console.log("Resultado: " + ok + " ✓ · " + mal + " ✗"); process.exit(1); }

  await esperar(250);   /* el padrón se carga de la base: hay que darle su tiempo */
  comprobar("se puede abrir la pestaña Canal", leer(ctx, 'window.__irA("Canal")'));
  await esperar(150);

  leer(ctx,"window.__abrirPertenece()"); await esperar(120);
  const ops = leer(ctx, "window.__opciones()");
  comprobar("se encontró el buscador «Pertenece a»", !!ops);
  const textos = (ops || []).map(o => o.texto).join(" | ");

  const faltan = SI_VENDEN.filter(n => textos.indexOf(n) < 0);
  comprobar("ofrece a la gente del padrón sintético que vende"
    + (faltan.length ? " → faltan: " + faltan.join(", ") : ""), faltan.length === 0);

  const fantasmas = INVENTADOS.filter(n => textos.indexOf(n) >= 0);
  comprobar("no ofrece ninguno de los cuatro nombres inventados"
    + (fantasmas.length ? " → siguen ahí: " + fantasmas.join(", ") : ""), fantasmas.length === 0);

  const colados = NO_VENDEN.filter(n => textos.indexOf(n) >= 0);
  comprobar("no ofrece a quien no vende (logística, financiero, transportista)"
    + (colados.length ? " → colados: " + colados.join(", ") : ""), colados.length === 0);

  comprobar("no ofrece a quien está de baja", textos.indexOf("Vendedor Inactivo") < 0);

  comprobar("sigue existiendo «Directo del freelance»",
    (ops || []).some(o => o.texto.indexOf("Directo del freelance")>=0));

  /* Las opciones tienen que valer el CÓDIGO, no el nombre: es lo que se
     guarda en sub_id, y un nombre puede repetirse o cambiar de tilde. */
  comprobar("al elegir, el buscador entrega el código del padrón y no un nombre escrito",
    /onPick=\{v=>\{ elegirVendedor\(v\.usr_id\)/.test(jsx));

  /* ── 2 · El cliente heredado dice que no está vinculado ───────────── */
  const t = leer(ctx, "window.__txt()").replace(/\s+/g, " ");
  comprobar("un cliente con el dueño escrito a mano avisa que NO está vinculado",
    /sin vincular/i.test(t));
  comprobar("y muestra el nombre que trae escrito, para poder reconocerlo",
    t.indexOf("VENDEDOR DEMO DOS") >= 0);

  /* ── 3 · Al elegir, se guarda el CÓDIGO en sub_id ─────────────────── */
  leer(ctx,"window.__abrirPertenece()"); await esperar(100);
  leer(ctx, 'window.__elegirNombre("Vendedor Demo Uno")');
  await esperar(150);
  comprobar("al elegir un vendedor, el buscador muestra su nombre",
    leer(ctx, "window.__valorPertenece()") === "Vendedor Demo Uno");
  const t2 = leer(ctx, "window.__txt()").replace(/\s+/g, " ");
  comprobar("y el aviso de «sin vincular» desaparece", !/sin vincular/i.test(t2));

  leer(ctx, 'window.__click("Guardar")');
  await esperar(250);
  const g = leer(ctx, "window.__guardado");
  comprobar("el formulario deja guardar" + (g ? "" : " → no llamó a onGuardar; aviso: "
    + leer(ctx, "window.__txt()").replace(/\s+/g," ").slice(0, 220)), !!g);
  if (g) {
    comprobar("lo que se guarda lleva el código sintético, no el nombre", g.subId === "VEN-DEMO-01");
    comprobar("y mantiene el nombre en dueno, para las pantallas que lo muestran",
      g.dueno === "Vendedor Demo Uno");
  }

  /* ── 4 · Control · «Directo del freelance» no inventa un sub_id ───── */
  let ctx2 = montar(HEREDADO);
  await esperar(250);
  leer(ctx2, 'window.__irA("Canal")'); await esperar(150);
  leer(ctx2,"window.__abrirPertenece()"); await esperar(100);
  leer(ctx2, 'window.__elegirNombre("Directo del freelance")');
  await esperar(150);
  leer(ctx2, 'window.__click("Guardar")');
  await esperar(250);
  const g2 = leer(ctx2, "window.__guardado");
  comprobar("control · «Directo del freelance» se puede guardar", !!g2);
  if (g2) {
    comprobar("control · directo NO inventa un sub_id", !g2.subId);
    comprobar("control · directo deja dueno = \"freelance\"", g2.dueno === "freelance");
  }

  /* ── 5 · Control · el que YA está vinculado no se marca ───────────── */
  const ctx3 = montar(VINCULADO);
  await esperar(250);
  leer(ctx3, 'window.__irA("Canal")'); await esperar(150);
  const t3 = leer(ctx3, "window.__txt()").replace(/\s+/g, " ");
  comprobar("control · un cliente ya vinculado NO se marca como sin vincular",
    !/sin vincular/i.test(t3));
  comprobar("control · y el buscador viene puesto en su vendedor",
    leer(ctx3, "window.__valorPertenece()") === "Vendedor Demo Uno");

  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ reventó: " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
