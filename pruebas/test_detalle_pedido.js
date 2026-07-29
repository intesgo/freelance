/* ═══════════════════════════════════════════════════════════════════════
   EL DETALLE DEL PEDIDO · lo que el vendedor ve y hace, hoy

   Es la ventana "Pedido en curso": las líneas del pedido que se está
   armando, con Editar y Quitar, el total de comisión, los avisos de precio
   bajo la base y el botón de cerrar y guardar. Más la barra fija de abajo
   que la abre.

   Escrito ANTES de reorganizar nada y, a propósito, nace VERDE: no describe
   lo que quiero que pase, describe lo que YA pasa. Es una fotografía.

   Lo que fija:
     · agregar un producto lo hace aparecer en la barra de abajo;
     · la barra abre la ventana, con el cliente y el proveedor en el subtítulo;
     · cada línea muestra su tipo, producto, cantidad, precio y comisión;
     · cada línea tiene Editar y Quitar, y hacen lo que dicen;
     · el total de comisión suma TODAS las líneas;
     · Quitar la última deja la ventana abierta diciendo que está vacía;
     · Editar devuelve la línea al formulario y la saca del pedido;
     · con el pedido vacío no se puede cerrar y guardar;
     · "+ Agregar otro producto" y tocar afuera cierran la ventana.

   Uso: node test_detalle_pedido.js [ruta.html]
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

const CLIENTE = "Tienda La Esquina";       /* sin motivos de bloqueo */
const PROVEEDOR = "Agrícola del Valle";

function montar() {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";
  w.SB = { auth: { getSession: async () => ({ data:{ session:null } }),
                   onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }) },
           from: () => { const p = Promise.resolve({ data:[], error:null });
             ["select","eq","in","order","limit","is","not"].forEach(m => { p[m] = () => p; }); return p; },
           rpc: async () => ({ data:null }) };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__avisos = [];
    window.__guardados = [];
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(Pedido, {
        toast: function(t){ window.__avisos.push(t); },
        prodInicial: null, onConsumir: function(){}, go: function(){},
        irGuardado: function(){},
        onGuardarPedido: function(p){ window.__guardados.push(p); } }));
    });

    window.__txt  = function(){ return window.__c.textContent || ""; };
    window.__hay  = function(sel){ return !!window.__c.querySelector(sel); };
    window.__n    = function(sel){ return window.__c.querySelectorAll(sel).length; };
    window.__texto= function(sel){ var n = window.__c.querySelector(sel); return n ? (n.textContent||"") : ""; };
    window.__escribir = function(caja, texto){
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input", { bubbles:true }));
    };
    window.__buscador = function(nombre){
      var cajas = window.__c.querySelectorAll(".ss input");
      for (var i = 0; i < cajas.length; i++)
        if ((cajas[i].getAttribute("placeholder")||"").toLowerCase().indexOf(nombre) >= 0) return cajas[i];
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
    /* Para el producto da igual cuál sea: se toma el primero que ofrezca la
       lista, como haría el vendedor apurado. */
    window.__tocarPrimera = function(){
      var op = window.__c.querySelectorAll(".opt");
      if (!op.length) return false;
      op[0].dispatchEvent(new window.MouseEvent("mousedown", { bubbles:true }));
      return true;
    };
    window.__click = function(sel, i){
      var n = window.__c.querySelectorAll(sel)[i||0]; if (!n) return false;
      n.dispatchEvent(new window.MouseEvent("click", { bubbles:true })); return true;
    };
    window.__deshabilitado = function(sel){
      var n = window.__c.querySelector(sel); return n ? !!n.disabled : null;
    };
    /* TRAMPA: el campo de CANTIDAD también lleva la clase "precio-in"
       (class="num qty-input precio-in"), y va primero en la pantalla. Buscar
       ".precio-in" a secas escribe la cantidad creyendo que escribe el precio,
       y la prueba pasa igual pero midiendo otra cosa. */
    window.__campoPrecio = function(){ return window.__c.querySelector(".precio-in:not(.qty-input)"); };
    window.__precio = function(v){
      var caja = window.__campoPrecio(); if (!caja) return false;
      window.__escribir(caja, String(v)); return true;
    };
    window.__valorPrecio = function(){ var c = window.__campoPrecio(); return c ? c.value : null; };
  `, ctx);
  return ctx;
}

const corre = (ctx, e) => vm.runInContext(e, ctx);
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 70));

async function elegir(ctx, campo, texto) {
  corre(ctx, `window.__abrirLista(${JSON.stringify(campo)}, ${JSON.stringify(texto)})`);
  await esperar(70);
  const t = corre(ctx, `window.__tocarOpcion(${JSON.stringify(texto)})`);
  await esperar(90);
  return t;
}
/* Camino completo del vendedor hasta tener un producto en el pedido.
   OJO: escribir "" en la casilla NO abre la lista — React ignora un cambio
   que no cambia nada. Hay que escribir algo, como escribe el vendedor. */
async function agregarProducto(ctx, precio) {
  corre(ctx, `window.__abrirLista("producto", "a")`);
  await esperar(80);
  if (!corre(ctx, `window.__tocarPrimera()`)) return "no apareció ningún producto";
  await esperar(110);
  if (!corre(ctx, `window.__precio(${JSON.stringify(String(precio))})`)) return "no apareció el campo de precio";
  await esperar(100);
  if (corre(ctx, `window.__deshabilitado(".cta-carrito")`) !== false)
    return "el botón de agregar quedó deshabilitado";
  corre(ctx, `window.__click(".cta-carrito")`);
  await esperar(130);
  return null;
}

(async () => {
  console.log("═══ El detalle del pedido · " + nombreApp);

  const ctx = montar();
  await esperar(90);
  await elegir(ctx, "cliente", CLIENTE);
  await elegir(ctx, "proveedor", PROVEEDOR);

  /* ── 1. Agregar el primer producto ──────────────────────────────────── */
  let e = await agregarProducto(ctx, 60);
  comprobar("se puede agregar un producto al pedido" + (e ? " → " + e : ""), !e);
  comprobar("aparece la barra fija de abajo", corre(ctx, `window.__hay(".mostrar-pedido")`));
  const barra1 = corre(ctx, `window.__texto(".mostrar-pedido")`);
  comprobar('la barra dice "1 producto" en singular' + (barra1 ? " → " + barra1.trim() : ""),
    /1 producto\b/.test(barra1) && !/1 productos/.test(barra1));
  comprobar("la barra muestra el carrito y un monto", /🛒/.test(barra1) && /\$/.test(barra1));
  comprobar("la ventana del pedido todavía NO está abierta", !corre(ctx, `window.__hay(".sheet")`));

  /* ── 2. La barra abre la ventana ────────────────────────────────────── */
  corre(ctx, `window.__click(".mostrar-pedido")`);
  await esperar(100);
  comprobar("tocar la barra abre la ventana del pedido", corre(ctx, `window.__hay(".sheet")`));
  const t2 = corre(ctx, "window.__txt()");
  comprobar('la ventana se titula "Pedido en curso"', /Pedido en curso/.test(t2));
  comprobar("y dice de qué cliente y de qué proveedor es",
    corre(ctx, `window.__texto(".sh-sub")`).indexOf(CLIENTE) >= 0
    && corre(ctx, `window.__texto(".sh-sub")`).indexOf(PROVEEDOR) >= 0);
  comprobar("hay exactamente una línea en el pedido", corre(ctx, `window.__n(".pline")`) === 1);
  comprobar("la línea trae su etiqueta de tipo de precio", corre(ctx, `window.__hay(".pline .tag")`));
  const linea1 = corre(ctx, `window.__texto(".pline .det")`).replace(/\s+/g," ").trim();
  comprobar("la línea dice cantidad, precio y comisión" + " → " + linea1,
    /^50 /.test(linea1) && /\$60,00/.test(linea1) && /comisión/.test(linea1));
  comprobar("la línea tiene botón Editar y botón Quitar",
    corre(ctx, `window.__n(".pline .del")`) === 2);
  comprobar("hay barra de total con la comisión del pedido",
    corre(ctx, `window.__hay(".totbar")`) && /Comisión total del pedido/.test(t2));
  comprobar("el total dice cuántos productos son", /1 producto\(s\)/.test(corre(ctx, `window.__texto(".totbar")`)));
  comprobar("el botón de cerrar y guardar está habilitado",
    corre(ctx, `window.__deshabilitado(".sheet .cta")`) === false);

  /* ── 3. "+ Agregar otro producto" cierra la ventana ─────────────────── */
  corre(ctx, `window.__click(".sheet .back")`);
  await esperar(100);
  comprobar('"+ Agregar otro producto" cierra la ventana', !corre(ctx, `window.__hay(".sheet")`));
  comprobar("y la barra de abajo vuelve a verse", corre(ctx, `window.__hay(".mostrar-pedido")`));

  /* ── 4. Un segundo producto: el total suma ──────────────────────────── */
  e = await agregarProducto(ctx, 70);
  comprobar("se puede agregar un segundo producto" + (e ? " → " + e : ""), !e);
  const barra2 = corre(ctx, `window.__texto(".mostrar-pedido")`);
  comprobar('ahora la barra dice "2 productos" en plural', /2 productos/.test(barra2));
  corre(ctx, `window.__click(".mostrar-pedido")`);
  await esperar(100);
  comprobar("la ventana muestra las dos líneas", corre(ctx, `window.__n(".pline")`) === 2);
  comprobar("y el total dice 2 producto(s)", /2 producto\(s\)/.test(corre(ctx, `window.__texto(".totbar")`)));

  /* ── 5. Quitar saca una línea ───────────────────────────────────────── */
  corre(ctx, `window.__click(".pline .del", 1)`);   /* el segundo botón de la primera línea = Quitar */
  await esperar(110);
  comprobar("Quitar deja una sola línea", corre(ctx, `window.__n(".pline")`) === 1);
  comprobar("la ventana sigue abierta después de quitar", corre(ctx, `window.__hay(".sheet")`));
  comprobar("y el total se ajusta a 1 producto(s)", /1 producto\(s\)/.test(corre(ctx, `window.__texto(".totbar")`)));

  /* ── 6. Quitar la última: la ventana lo dice, no se cierra sola ─────── */
  corre(ctx, `window.__click(".pline .del", 1)`);
  await esperar(110);
  comprobar("quitando la última no queda ninguna línea", corre(ctx, `window.__n(".pline")`) === 0);
  comprobar("la ventana sigue abierta y avisa que está vacío",
    corre(ctx, `window.__hay(".sheet")`) && /Aún no agregas productos/.test(corre(ctx, "window.__txt()")));
  comprobar("con el pedido vacío desaparece la barra de total", !corre(ctx, `window.__hay(".totbar")`));
  comprobar("y NO se puede cerrar y guardar",
    corre(ctx, `window.__deshabilitado(".sheet .cta")`) === true);

  /* ── 7. Editar devuelve la línea al formulario ──────────────────────── */
  const ctx2 = montar();
  await esperar(90);
  await elegir(ctx2, "cliente", CLIENTE);
  await elegir(ctx2, "proveedor", PROVEEDOR);
  await agregarProducto(ctx2, 65);
  corre(ctx2, `window.__click(".mostrar-pedido")`);
  await esperar(100);
  comprobar("(preparación) hay una línea para editar", corre(ctx2, `window.__n(".pline")`) === 1);
  corre(ctx2, `window.__click(".pline .del", 0)`);   /* el primero = Editar */
  await esperar(140);
  comprobar("Editar cierra la ventana del pedido", !corre(ctx2, `window.__hay(".sheet")`));
  comprobar("Editar saca la línea del pedido (la barra de abajo desaparece)",
    !corre(ctx2, `window.__hay(".mostrar-pedido")`));
  comprobar("Editar avisa que la línea volvió al formulario",
    /Línea cargada al formulario/.test(String(corre(ctx2, "window.__avisos.join(' | ')"))));
  /* ⚠ DEFECTO QUE YA EXISTÍA, ANTERIOR A ESTE SPRINT — se registra tal cual,
     NO se corrige aquí (el SPRINT-06 prohíbe cambios funcionales).
     El vendedor escribe 77 qq a $65, toca "Editar", la app le dice "Línea
     cargada al formulario"… y el formulario vuelve a 50 qq al precio base.
     Pierde la cantidad Y el precio que había puesto. Culpable: el efecto de
     [prod] vuelve a correr —porque al agregar la línea se hizo setProd(null)—
     y pisa el setPrecio/setCant que hace el botón Editar.
     Esta comprobación existe para que el refactor NO cambie el defecto sin
     querer, ni para bien ni para mal: se arregla en su propio DES. */
  const vuelto = corre(ctx2, `String(window.__valorPrecio())`);
  comprobar("Editar NO devuelve el precio escrito: el campo vuelve a la base ("
    + vuelto + ") — defecto anterior a este Sprint, se deja igual",
    vuelto !== "65");

  /* ── 8. Cerrar tocando afuera ───────────────────────────────────────── */
  const ctx3 = montar();
  await esperar(90);
  await elegir(ctx3, "cliente", CLIENTE);
  await elegir(ctx3, "proveedor", PROVEEDOR);
  await agregarProducto(ctx3, 60);
  corre(ctx3, `window.__click(".mostrar-pedido")`);
  await esperar(100);
  comprobar("(preparación) la ventana está abierta", corre(ctx3, `window.__hay(".sheet")`));
  corre(ctx3, `window.__click(".ov")`);
  await esperar(100);
  comprobar("tocar fuera de la ventana la cierra", !corre(ctx3, `window.__hay(".sheet")`));

  /* ── 9. Cerrar y guardar el pedido ──────────────────────────────────── */
  corre(ctx3, `window.__click(".mostrar-pedido")`);
  await esperar(100);
  corre(ctx3, `window.__click(".sheet .cta")`);
  await esperar(140);
  comprobar("cerrar y guardar entrega el pedido al sistema",
    corre(ctx3, "window.__guardados.length") === 1);
  comprobar("el pedido entregado lleva su cliente y sus líneas",
    corre(ctx3, "window.__guardados[0].carrito.length") === 1
    && String(corre(ctx3, "String(window.__guardados[0].cli)")).indexOf(CLIENTE) >= 0);
  comprobar('después de guardar aparece el aviso "Pedido guardado"',
    /Pedido guardado/.test(corre(ctx3, "window.__txt()")));
  comprobar("y el pedido queda vacío (la barra de abajo se fue)",
    !corre(ctx3, `window.__hay(".mostrar-pedido")`));

  /* ── 10. El aviso de precio bajo la base vigente ────────────────────── */
  comprobar("sigue existiendo el aviso de precio bajo la base en una línea",
    html.indexOf("quedó bajo la base vigente") >= 0);
  comprobar("y el aviso general que impide enviar el pedido",
    html.indexOf("precio(s) bajo la base vigente. Corrígelos para poder enviar.") >= 0);

  console.log("Resultado del detalle: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String((e && e.stack) || e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
