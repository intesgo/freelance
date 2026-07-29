/* ═══════════════════════════════════════════════════════════════════════
   LA CONFIRMACIÓN DEL PEDIDO · lo que el vendedor ve y hace, hoy

   Es la ventana que sale DESPUÉS de guardar: el visto verde, a quién se le
   guardó, cuántos productos, y las tres salidas — avisar al cliente por
   WhatsApp, tomarle otro pedido al mismo cliente, o listo.

   Escrito ANTES de tocar nada y, a propósito, nace VERDE: no describe lo
   que quiero que pase, describe lo que YA pasa. Es una fotografía.

   Lo que fija:
     · después de guardar aparece la confirmación, no antes;
     · dice el nombre del cliente, cuántos productos y dónde verlo;
     · el mensaje de WhatsApp lleva el RESUMEN del pedido, línea por línea,
       con cantidad, producto y precio — no un "gracias por tu compra" solo;
     · "Otro pedido de X" cierra, deja el mismo cliente puesto y lo avisa;
     · "Listo" y tocar afuera cierran, sin efectos;
     · el pedido queda vacío: la confirmación no revive el carrito.

   Uso: node test_confirmacion_pedido.js [ruta.html]
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

const CLIENTE = "Tienda La Esquina";
const PROVEEDOR = "Agrícola del Valle";

function montar() {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
  /* el WhatsApp se abre con window.open: aquí se anota a dónde iba */
  w.__abiertas = [];
  w.open = (url) => { w.__abiertas.push(String(url)); return null; };
  w.SB = { auth: { getSession: async () => ({ data:{ session:null } }),
                   onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }) },
           from: () => { const p = Promise.resolve({ data:[], error:null });
             ["select","eq","in","order","limit","is","not"].forEach(m => { p[m] = () => p; }); return p; },
           rpc: async () => ({ data:null }) };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__avisos = [];
    window.__navego = [];
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(Pedido, {
        toast: function(t){ window.__avisos.push(t); },
        prodInicial: null, onConsumir: function(){},
        go: function(d){ window.__navego.push(d); },
        irGuardado: function(){}, onGuardarPedido: function(){} }));
    });
    window.__txt = function(){ return window.__c.textContent || ""; };
    window.__hay = function(sel){ return !!window.__c.querySelector(sel); };
    window.__n   = function(sel){ return window.__c.querySelectorAll(sel).length; };
    window.__escribir = function(caja, texto){
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input", { bubbles:true }));
    };
    window.__buscador = function(n){
      var c = window.__c.querySelectorAll(".ss input");
      for (var i = 0; i < c.length; i++)
        if ((c[i].getAttribute("placeholder")||"").toLowerCase().indexOf(n) >= 0) return c[i];
      return null;
    };
    window.__abrirLista = function(campo, texto){
      var caja = window.__buscador(campo); if (!caja) return false;
      window.__escribir(caja, texto); return true;
    };
    window.__tocarOpcion = function(texto){
      var op = window.__c.querySelectorAll(".opt");
      for (var i = 0; i < op.length; i++)
        if ((op[i].textContent||"").indexOf(texto) >= 0) {
          op[i].dispatchEvent(new window.MouseEvent("mousedown", { bubbles:true })); return true; }
      return false;
    };
    window.__tocarPrimera = function(){
      var op = window.__c.querySelectorAll(".opt"); if (!op.length) return false;
      op[0].dispatchEvent(new window.MouseEvent("mousedown", { bubbles:true })); return true;
    };
    window.__click = function(sel, i){
      var n = window.__c.querySelectorAll(sel)[i||0]; if (!n) return false;
      n.dispatchEvent(new window.MouseEvent("click", { bubbles:true })); return true;
    };
    /* el campo de CANTIDAD comparte la clase con el de PRECIO: hay que
       distinguirlos o se escribe uno creyendo que se escribe el otro */
    window.__precio = function(v){
      var c = window.__c.querySelector(".precio-in:not(.qty-input)"); if (!c) return false;
      window.__escribir(c, String(v)); return true;
    };
    window.__cantidad = function(v){
      var c = window.__c.querySelector(".qty-input"); if (!c) return false;
      window.__escribir(c, String(v)); return true;
    };
    /* botón por lo que DICE, no por su posición */
    window.__botonQueDice = function(texto){
      var b = window.__c.querySelectorAll(".sheet button");
      for (var i = 0; i < b.length; i++)
        if ((b[i].textContent||"").indexOf(texto) >= 0) return b[i];
      return null;
    };
    window.__tocarBoton = function(texto){
      var b = window.__botonQueDice(texto); if (!b) return false;
      b.dispatchEvent(new window.MouseEvent("click", { bubbles:true })); return true;
    };
  `, ctx);
  return ctx;
}

const corre = (ctx, e) => vm.runInContext(e, ctx);
const abiertas = (ctx) => vm.runInContext("JSON.stringify(__abiertas)", ctx);
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 70));

async function elegir(ctx, campo, texto) {
  corre(ctx, `window.__abrirLista(${JSON.stringify(campo)}, ${JSON.stringify(texto)})`);
  await esperar(70);
  const t = corre(ctx, `window.__tocarOpcion(${JSON.stringify(texto)})`);
  await esperar(90);
  return t;
}
/* Camino completo del vendedor hasta tener la confirmación en pantalla. */
async function hastaGuardar(ctx, cant, precio) {
  await elegir(ctx, "cliente", CLIENTE);
  await elegir(ctx, "proveedor", PROVEEDOR);
  corre(ctx, `window.__abrirLista("producto", "a")`);  await esperar(80);
  corre(ctx, `window.__tocarPrimera()`);               await esperar(120);
  corre(ctx, `window.__cantidad(${JSON.stringify(String(cant))})`);   await esperar(90);
  corre(ctx, `window.__precio(${JSON.stringify(String(precio))})`);   await esperar(110);
  corre(ctx, `window.__click(".cta-carrito")`);        await esperar(140);
  corre(ctx, `window.__click(".mostrar-pedido")`);     await esperar(130);
  corre(ctx, `window.__click(".sheet .cta")`);         await esperar(170);
}

(async () => {
  console.log("═══ La confirmación del pedido · " + nombreApp);

  /* ── 1. Antes de guardar no hay confirmación ────────────────────────── */
  let ctx = montar();
  await esperar(90);
  comprobar("al abrir no hay ninguna confirmación", !/Pedido guardado/.test(corre(ctx, "window.__txt()")));

  /* ── 2. Guardar la hace aparecer, con lo que corresponde ────────────── */
  await hastaGuardar(ctx, 77, 65);
  const t = corre(ctx, "window.__txt()");
  comprobar("después de guardar aparece la confirmación", /Pedido guardado/.test(t));
  comprobar("con el visto verde", /✅/.test(t));
  comprobar("dice a qué cliente se le guardó", t.indexOf(CLIENTE) >= 0);
  comprobar("dice cuántos productos son", /1 producto\(s\)/.test(t));
  comprobar("y dónde encontrarlo después", /lo ves en Mis pedidos/.test(t));
  comprobar("ofrece avisar al cliente por WhatsApp",
    !!corre(ctx, `!!window.__botonQueDice("Avisar al cliente por WhatsApp")`));
  comprobar("ofrece tomarle otro pedido al mismo cliente, por su nombre",
    !!corre(ctx, `!!window.__botonQueDice("Otro pedido de Tienda")`));
  comprobar('y el botón "Listo" para cerrar', !!corre(ctx, `!!window.__botonQueDice("Listo")`));
  comprobar("el pedido quedó vacío: no reaparece la barra de abajo",
    !corre(ctx, `window.__hay(".mostrar-pedido")`));

  /* ── 3. El WhatsApp lleva el RESUMEN, no un saludo suelto ───────────── */
  corre(ctx, `window.__tocarBoton("Avisar al cliente por WhatsApp")`);
  await esperar(110);
  const urls = JSON.parse(abiertas(ctx));
  comprobar("tocar WhatsApp abre un chat de wa.me",
    urls.length === 1 && urls[0].indexOf("wa.me") >= 0);
  const mensaje = urls.length ? decodeURIComponent(String(urls[0]).split("text=")[1] || "") : "";
  comprobar("el mensaje saluda al cliente por su nombre", mensaje.indexOf(CLIENTE) >= 0);
  comprobar("y lleva el resumen con la cantidad, el producto y el precio → "
    + mensaje.replace(/\n/g, " ⏎ ").slice(0, 90),
    /77/.test(mensaje) && /\$65,00/.test(mensaje) && /•/.test(mensaje));
  comprobar("la confirmación NO se cierra al mandar el WhatsApp",
    /Pedido guardado/.test(corre(ctx, "window.__txt()")));

  /* ── 4. "Listo" cierra ──────────────────────────────────────────────── */
  corre(ctx, `window.__tocarBoton("Listo")`);
  await esperar(110);
  comprobar('"Listo" cierra la confirmación', !/Pedido guardado/.test(corre(ctx, "window.__txt()")));

  /* ── 5. "Otro pedido de X" deja el cliente puesto ───────────────────── */
  ctx = montar();
  await esperar(90);
  await hastaGuardar(ctx, 50, 60);
  comprobar("(preparación) la confirmación está en pantalla",
    /Pedido guardado/.test(corre(ctx, "window.__txt()")));
  corre(ctx, `window.__tocarBoton("Otro pedido de")`);
  await esperar(140);
  comprobar('"Otro pedido de X" cierra la confirmación',
    !/Pedido guardado/.test(corre(ctx, "window.__txt()")));
  comprobar("y deja al MISMO cliente puesto, sin volver a buscarlo",
    corre(ctx, "window.__txt()").indexOf(CLIENTE) >= 0
    && !corre(ctx, `!!window.__buscador("cliente")`));
  comprobar("avisa que es el mismo cliente y pedido nuevo",
    /Listo: mismo cliente, pedido nuevo/.test(String(corre(ctx, "window.__avisos.join(' | ')"))));
  comprobar("y navega de vuelta a Tomar pedido",
    String(corre(ctx, "window.__navego.join(',')")).indexOf("pedido") >= 0);

  /* ── 6. Tocar afuera también cierra ─────────────────────────────────── */
  ctx = montar();
  await esperar(90);
  await hastaGuardar(ctx, 50, 60);
  comprobar("(preparación) la confirmación está en pantalla",
    /Pedido guardado/.test(corre(ctx, "window.__txt()")));
  corre(ctx, `window.__click(".ov")`);
  await esperar(120);
  comprobar("tocar fuera de la confirmación la cierra",
    !/Pedido guardado/.test(corre(ctx, "window.__txt()")));

  console.log("Resultado de la confirmación: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String((e && e.stack) || e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
