/* ═══════════════════════════════════════════════════════════════════════
   LA CABECERA DEL PEDIDO · lo que el vendedor ve y hace, hoy

   Escrito ANTES de reorganizar nada, y a propósito nace VERDE: no describe
   lo que quiero que pase, describe lo que YA pasa. Es una fotografía.

   El SPRINT-05 dice que el vendedor debe poder tomar un pedido exactamente
   igual que antes. La única forma de demostrarlo es fijar antes lo que hace
   hoy, tocar el código, y comprobar que la fotografía sigue igual.

   Lo que fija:
     · la cascada: primero cliente, después proveedor, después producto;
     · que nada aparezca antes de tiempo ni se quede después;
     · que al elegir producto el cliente pase a ser el título;
     · que un cliente bloqueado corte la cascada y muestre sus motivos;
     · que el código del proveedor desbloquee, y que uno malo no;
     · el ORDEN en pantalla de cada pieza (un refactor no puede moverlas);
     · los dos avisos que protegen el pedido en curso.

   Uso: node test_cabecera_pedido.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js = R.Babel.transform(jsx, { presets:["react"] }).code;

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };

const CLI_LIBRE    = "Tienda La Esquina";     /* sin motivos de bloqueo */
const CLI_BLOQUEADO = "Comercial Mendoza";    /* tiene cupo excedido */

function montar() {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
  /* sin sesión: la cabecera trabaja con el catálogo de demostración, que es
     justo lo que se quiere fijar (no depende de la red) */
  w.SB = { auth: { getSession: async () => ({ data:{ session:null } }),
                   onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }) },
           from: () => { const p = Promise.resolve({ data:[], error:null });
             ["select","eq","in","order","limit","is","not"].forEach(m => { p[m] = () => p; }); return p; },
           rpc: async () => ({ data:null }) };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__avisos = [];
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    window.__raiz = ReactDOM.createRoot(window.__c);
    ReactDOM.flushSync(function(){
      window.__raiz.render(React.createElement(Pedido, {
        toast: function(t){ window.__avisos.push(t); },
        prodInicial: null, onConsumir: function(){}, go: function(){},
        irGuardado: function(){}, onGuardarPedido: function(){} }));
    });

    /* ── Manejar la pantalla como la maneja el vendedor ────────────────── */
    window.__txt = function(){ return window.__c.textContent || ""; };
    /* Los buscadores no se distinguen por un id: se distinguen por lo que
       dice su casilla. Es lo mismo que ve el vendedor. */
    window.__buscador = function(nombre){
      var cajas = window.__c.querySelectorAll(".ss input");
      for (var i = 0; i < cajas.length; i++) {
        var ph = (cajas[i].getAttribute("placeholder") || "").toLowerCase();
        if (ph.indexOf(nombre.toLowerCase()) >= 0) return cajas[i];
      }
      return null;
    };
    window.__hay = function(sel){ return !!window.__c.querySelector(sel); };
    window.__pos = function(sel){
      var n = window.__c.querySelector(sel); if (!n) return -1;
      var todos = window.__c.querySelectorAll("*");
      for (var i = 0; i < todos.length; i++) if (todos[i] === n) return i;
      return -1;
    };
    /* Escribir en la casilla y tocar la opción: los dos gestos reales. */
    window.__escribir = function(caja, texto){
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input", { bubbles:true }));
    };
    window.__tocarOpcion = function(texto){
      var op = window.__c.querySelectorAll(".opt");
      for (var i = 0; i < op.length; i++) {
        if ((op[i].textContent || "").indexOf(texto) >= 0) {
          op[i].dispatchEvent(new window.MouseEvent("mousedown", { bubbles:true }));
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
  `, ctx);
  return ctx;
}

const corre = (ctx, expr) => vm.runInContext(expr, ctx);
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 60));
/* elegir = escribir, esperar a que React pinte la lista, y tocar la opción */
async function elegir(ctx, campo, texto) {
  const err = corre(ctx, `window.__elegir(${JSON.stringify(campo)}, ${JSON.stringify(texto)})`);
  if (err) return err;
  await esperar(60);
  const tocado = corre(ctx, `window.__tocarOpcion(${JSON.stringify(texto)})`);
  await esperar(60);
  return tocado ? null : "no apareció la opción " + texto;
}

(async () => {
  console.log("═══ La cabecera del pedido · " + nombreApp);

  /* ── 1. Al abrir: solo el cliente ───────────────────────────────────── */
  let ctx = montar();
  await esperar(80);
  comprobar('al abrir se ve el título "Tomar pedido"', /Tomar pedido/.test(corre(ctx, "window.__txt()")));
  comprobar("al abrir está el buscador de Cliente", !!corre(ctx, `!!window.__buscador("cliente")`));
  comprobar("al abrir NO está el de Proveedor (todavía no toca)", !corre(ctx, `!!window.__buscador("proveedor")`));
  comprobar("al abrir NO está el de Producto", !corre(ctx, `!!window.__buscador("producto")`));

  /* ── 2. Cliente sin bloqueo → aparece el proveedor ──────────────────── */
  let e = await elegir(ctx, "cliente", CLI_LIBRE);
  comprobar("se puede elegir un cliente" + (e ? " → " + e : ""), !e);
  comprobar("elegido el cliente, aparece el buscador de Proveedor",
    !!corre(ctx, `!!window.__buscador("proveedor")`));
  comprobar("pero todavía NO el de Producto", !corre(ctx, `!!window.__buscador("producto")`));
  comprobar('sigue el título "Tomar pedido" mientras no haya producto',
    /Tomar pedido/.test(corre(ctx, "window.__txt()")));
  comprobar("el cliente elegido queda en su tarjeta, no en el buscador",
    corre(ctx, `window.__hay(".pick")`));
  comprobar("un cliente sin motivos NO muestra el aviso de bloqueo",
    !corre(ctx, `window.__hay(".bloqueo")`));

  /* ── 3. Proveedor → aparece el producto ─────────────────────────────── */
  e = await elegir(ctx, "proveedor", "Agrícola del Valle");
  comprobar("se puede elegir el proveedor" + (e ? " → " + e : ""), !e);
  comprobar("elegido el proveedor, aparece el buscador de Producto",
    !!corre(ctx, `!!window.__buscador("producto")`));

  /* ── 4. Producto → el cliente pasa a ser el título ──────────────────── */
  corre(ctx, `window.__escribir(window.__buscador("producto"), "a")`);
  await esperar(60);
  const tomado = corre(ctx, `(function(){ var o = window.__c.querySelectorAll(".opt");
    if (!o.length) return false;
    o[0].dispatchEvent(new window.MouseEvent("mousedown", { bubbles:true }));
    return true; })()`);
  await esperar(80);
  comprobar("se puede elegir un producto del proveedor", !!tomado);
  comprobar("con producto elegido, el cliente pasa a ser el título",
    corre(ctx, `window.__hay(".cli-titulo")`));
  comprobar('y desaparece el título "Tomar pedido"',
    !/Tomar pedido/.test(corre(ctx, "window.__txt()")));
  comprobar("y desaparecen los tres buscadores de la cabecera",
    !corre(ctx, `!!window.__buscador("cliente")`)
    && !corre(ctx, `!!window.__buscador("proveedor")`)
    && !corre(ctx, `!!window.__buscador("producto")`));

  /* ── 5. Cliente bloqueado: la cascada se corta ──────────────────────── */
  ctx = montar();
  await esperar(80);
  e = await elegir(ctx, "cliente", CLI_BLOQUEADO);
  comprobar("se puede elegir un cliente bloqueado" + (e ? " → " + e : ""), !e);
  const tB = corre(ctx, "window.__txt()");
  comprobar("el cliente bloqueado muestra su aviso", corre(ctx, `window.__hay(".bloqueo")`));
  comprobar("con el encabezado exacto de hoy", /Cliente bloqueado para pedidos/.test(tB));
  comprobar("y el motivo escrito, no un mensaje genérico", /factura\(s\) vencida\(s\)/.test(tB));
  comprobar("y el aviso de que el bloqueo es automático",
    /El bloqueo es automático/.test(tB));
  comprobar("estando bloqueado NO aparece el buscador de Proveedor",
    !corre(ctx, `!!window.__buscador("proveedor")`));
  comprobar("ni el de Producto", !corre(ctx, `!!window.__buscador("producto")`));
  comprobar("aparece la casilla del código del proveedor",
    corre(ctx, `window.__hay(".bq-code input")`));

  /* ── 6. El código: uno malo no abre, el bueno sí ────────────────────── */
  corre(ctx, `(function(){ var i = window.__c.querySelector(".bq-code input");
    window.__escribir(i, "0000"); })()`);
  await esperar(50);
  corre(ctx, `window.__c.querySelector(".bq-code button").dispatchEvent(new window.MouseEvent("click",{bubbles:true}))`);
  await esperar(60);
  comprobar("un código equivocado NO desbloquea", corre(ctx, `window.__hay(".bloqueo")`)
    && !/Pedido desbloqueado/.test(corre(ctx, "window.__txt()")));
  comprobar("y avisa que el código es incorrecto",
    /Código incorrecto/.test(String(corre(ctx, "window.__avisos.join(' | ')"))));

  const codigo = String(corre(ctx, "String(CODIGO_DESBLOQUEO)"));
  corre(ctx, `(function(){ var i = window.__c.querySelector(".bq-code input");
    window.__escribir(i, ${JSON.stringify(codigo)}); })()`);
  await esperar(50);
  corre(ctx, `window.__c.querySelector(".bq-code button").dispatchEvent(new window.MouseEvent("click",{bubbles:true}))`);
  await esperar(80);
  comprobar("el código del proveedor sí desbloquea",
    /Pedido desbloqueado por el proveedor/.test(corre(ctx, "window.__txt()")));
  comprobar("y recién ahí aparece el buscador de Proveedor",
    !!corre(ctx, `!!window.__buscador("proveedor")`));

  /* ── 6b. Cambiar a un cliente bloqueado con el proveedor ya elegido ──
     Camino real: el vendedor eligió cliente y proveedor, y recién ahí se
     equivocó de cliente. Toca la tarjeta del cliente y pone otro, que resulta
     estar bloqueado. El producto NO puede seguir ofreciéndose. */
  ctx = montar();
  await esperar(80);
  await elegir(ctx, "cliente", CLI_LIBRE);
  await elegir(ctx, "proveedor", "Agrícola del Valle");
  comprobar("(preparación) con cliente libre y proveedor, sí está el Producto",
    !!corre(ctx, `!!window.__buscador("producto")`));
  /* tocar la tarjeta del cliente la devuelve a buscador (es la primera .pick) */
  corre(ctx, `window.__c.querySelectorAll(".pick")[0].dispatchEvent(new window.MouseEvent("click",{bubbles:true}))`);
  await esperar(80);
  e = await elegir(ctx, "cliente", CLI_BLOQUEADO);
  comprobar("se puede cambiar a un cliente bloqueado" + (e ? " → " + e : ""), !e);
  comprobar("al cambiar a un cliente bloqueado aparece su aviso",
    corre(ctx, `window.__hay(".bloqueo")`));
  comprobar("y el buscador de Producto DESAPARECE aunque el proveedor siga elegido",
    !corre(ctx, `!!window.__buscador("producto")`));

  /* ── 7. El ORDEN en pantalla: un refactor no puede mover las piezas ── */
  ctx = montar();
  await esperar(80);
  await elegir(ctx, "cliente", CLI_BLOQUEADO);
  const posTitulo  = corre(ctx, `window.__pos(".h1")`);
  const posPick    = corre(ctx, `window.__pos(".pick")`);
  const posBloqueo = corre(ctx, `window.__pos(".bloqueo")`);
  comprobar("el título va antes que el cliente elegido", posTitulo >= 0 && posTitulo < posPick);
  comprobar("y el cliente antes que el aviso de bloqueo", posPick >= 0 && posPick < posBloqueo);

  /* ── 8. Los dos avisos que protegen el pedido en curso ──────────────── */
  /* Estos dos avisos solo salen con un pedido ya empezado, y llegar hasta ahí
     desde aquí sería armar medio pedido para comprobar una frase. Se vigila
     que el TEXTO siga existiendo en la app: si alguien lo borra al reordenar,
     el vendedor se queda sin saber por qué no puede cambiar de cliente.
     Se busca en todo el archivo a propósito: la cabecera puede mudarse de
     lugar —eso es justamente lo que hace este Sprint— pero el aviso no puede
     desaparecer. */
  comprobar("sigue el aviso de no cambiar de cliente con un pedido en curso",
    html.indexOf("Para cambiar de cliente, cierra primero el pedido en curso.") >= 0);
  comprobar("sigue el aviso de un pedido = un solo proveedor",
    html.indexOf("Un pedido es de un solo proveedor. Cierra el pedido para cambiarlo.") >= 0);

  console.log("Resultado de la cabecera: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String((e && e.stack) || e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
