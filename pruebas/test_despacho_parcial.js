/* ═══════════════════════════════════════════════════════════════════════
   CUANDO EL PEDIDO SALE CORTO · proveedor-freelance b62 · fc b379

   Un pedido puede no salir completo. Hasta hoy el sistema no se enteraba:
   la piladora solo tecleaba el número de factura y lo que el vendedor pidió
   quedaba como verdad. Se le pagaba comisión de quintales que nunca
   salieron y se le facturaba a la piladora margen que no existió.

   Reglas de Richard (26 jul): la piladora factura lo que despachó —así que
   NO hace falta nota de crédito—, ella misma confirma las cantidades al
   facturar, y lo que faltó se da por perdido.

   Se comprueba contra los dos bundles reales:
     · la piladora ve cada producto con lo pedido ya puesto (lo normal es
       que salga completo) y solo toca lo que salió corto;
     · no puede despachar MÁS de lo pedido, ni facturar en cero;
     · manda a la base la factura y las cantidades JUNTAS, línea por línea;
     · si sale corto lo dice con palabras, y dice que lo que faltó se pierde;
     · en la demostración sigue funcionando como siempre;
     · en el detalle del pedido, el freelance ve el faltante ANTES que los
       números, y ve que la comisión va sobre lo que salió.

   Uso: node test_despacho_parcial.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms || 200));

const compilar = (ruta) => {
  const html = fs.readFileSync(ruta, "utf-8");
  const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
  return R.Babel.transform(jsx, { presets: ["react"] }).code;
};

function ventana(dom) {
  const w = dom.window;
  w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.alert = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  w.Notification = function () {}; w.Notification.permission = "denied"; w.Notification.requestPermission = async () => "denied";
  return w;
}

/* ═══ 1 · LA PILADORA FACTURA ═══════════════════════════════════════════ */
const PEDIDO_PROV = {
  id: "PD-0031", cliente: "Comercial Nilo", detalle: "Arrox Extra Lira · 150 qq · crédito",
  monto: 7200, fecha: "26 jul", estado: "pendiente", factura: null, demo: false,
  lineas: [
    { itemId: "PD-0031-I1", nombre: "Arrox Extra Lira", pedido: 100, precio: 48, despachado: null },
    { itemId: "PD-0031-I2", nombre: "Arrocillo Fino", pedido: 50, precio: 20, despachado: null },
  ],
};

function montarProv({ falla = false } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = ventana(dom);
  const rpc = [];
  const q = () => {
    const p = Promise.resolve({ data: [], error: null, count: 0 });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "gte", "lte", "or"].forEach((m) => { p[m] = () => q(); });
    p.maybeSingle = () => Promise.resolve({ data: null, error: null }); p.single = p.maybeSingle;
    p.insert = () => Promise.resolve({ error: null });
    p.update = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    return p;
  };
  w.SB = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1", email: "agu@ejemplo.com" } } } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from: () => q(),
    rpc: async (nombre, args) => {
      rpc.push({ nombre, args });
      if (nombre === "facturar_pedido") {
        if (falla) return { data: null, error: { message: "Ese pedido ya está facturado." } };
        const desp = (args.p_lineas || []).reduce((s, l) => s + Number(l.despachado_qq || 0), 0);
        return { data: [{ ped_id: args.p_ped, factura: args.p_factura, pedido_qq: 150,
                          despachado_qq: desp, parcial: desp < 150,
                          aviso: desp < 150 ? "Facturado por " + desp + " qq de los 150 pedidos. Se reajusta la comisión del vendedor."
                                            : "Facturado completo: " + desp + " qq." }], error: null };
      }
      return { data: null, error: null };
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx);
  vm.runInContext(compilar(R.app("proveedor-freelance")), ctx);
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    window.__montar = function(conDatos){
      ReactDOM.flushSync(function(){
        ReactDOM.createRoot(window.__cont).render(React.createElement(Decisiones, {
          ctx: { accion: function(){} },
          datos: conDatos ? { facturar: [${JSON.stringify(PEDIDO_PROV)}], solics: [] } : null,
        }));
      });
    };
    window.__txt = function(){ return window.__cont.textContent || ""; };
    window.__tocar = function(t){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(t) >= 0 && !bs[i].disabled){ bs[i].click(); return true; } }
      return false;
    };
    window.__apagado = function(t){
      var bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(t) >= 0) return !!bs[i].disabled; }
      return null;
    };
    window.__cajas = function(){
      return Array.prototype.map.call(window.__cont.querySelectorAll('input[type="number"]'),
        function(e){ return { valor:e.value, max:e.getAttribute("max") }; });
    };
    window.__escribirN = function(n, valor){
      var es = window.__cont.querySelectorAll('input[type="number"]');
      if(!es[n]) return false;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set.call(es[n], valor);
      es[n].dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
    /* llama al guardado saltándose el botón apagado: así se prueba el
       cinturón de seguridad que hay DENTRO de la función, no solo el botón */
    window.__forzarFactura = function(){
      var b = null, bs = window.__cont.querySelectorAll("button");
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf("Facturar") >= 0) b = bs[i]; }
      if(!b) return false;
      b.disabled = false; b.click(); return true;
    };
    window.__escribirFactura = function(valor){
      var es = window.__cont.querySelectorAll("input");
      for(var i=0;i<es.length;i++){
        if((es[i].getAttribute("placeholder")||"").indexOf("factura") >= 0){
          Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set.call(es[i], valor);
          es[i].dispatchEvent(new window.Event("input",{bubbles:true}));
          return true;
        }
      }
      return false;
    };
  `, ctx);
  return { ctx, rpc };
}
const txtP = (m) => vm.runInContext("window.__txt()", m.ctx);

/* ═══ 2 · EL FREELANCE VE EL FALTANTE ═══════════════════════════════════ */
function montarFc(p) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url: "https://intesgo.github.io/freelance/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = ventana(dom);
  const q = () => {
    const pr = Promise.resolve({ data: [], error: null, count: 0 });
    ["select", "eq", "neq", "in", "order", "limit", "like", "not", "is", "gte", "lte", "or"].forEach((m) => { pr[m] = () => q(); });
    pr.maybeSingle = () => Promise.resolve({ data: null, error: null }); pr.single = pr.maybeSingle;
    pr.insert = () => Promise.resolve({ error: null });
    pr.update = () => { const r = Promise.resolve({ error: null }); r.eq = () => r; return r; };
    return pr;
  };
  w.SB = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1", email: "intesgo@gmail.com" } } } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from: () => q(), rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data: {}, error: null }) },
    storage: { from: () => ({ upload: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.react(), ctx); vm.runInContext(R.reactDom(), ctx);
  vm.runInContext(compilar(R.app("freelance-completo")), ctx);
  vm.runInContext(`
    window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__cont).render(React.createElement(DetallePedido, {
        p: ${JSON.stringify(p)}, modo: "factura", vivo: true,
        volver: function(){}, toast: function(){}, onAprobado: function(){},
      }));
    });
    window.__txt = function(){ return window.__cont.textContent || ""; };
  `, ctx);
  return ctx;
}
function pedidoFc(extra) {
  return Object.assign({
    id: "PD-0031", cli: "Comercial Nilo", prov: "Piladora San Agustín", fecha: "2026-07-26",
    prod: "Arrox Extra Lira y 1 más", cant: 130, precio: 37.23, cond: "Crédito", comision: 260,
    estado: "Facturado", etapa: 3, sync: "ok", comisionLiberada: false,
    factura: "001-001-000999", ciudad: "", demo: false,
    provCod: "AGU", pagoProv: "credito", pagoHabitual: "",
    pedidoQq: 150, faltante: 20,
    lineas: [{ nombre: "Arrox Extra Lira", pedido: 100, salio: 80 },
             { nombre: "Arrocillo Fino", pedido: 50, salio: 50 }],
    linea: Array.from({ length: 10 }, (_, i) => ({ t: "Paso " + i, f: "—", st: "wait", d: "" })),
  }, extra || {});
}

(async () => {
  console.log("═══ Cuando el pedido sale corto");

  /* ── la piladora ── */
  const m = montarProv();
  vm.runInContext("window.__montar(true)", m.ctx);
  await esperar(260);
  let t = txtP(m);

  comprobar("la piladora ve cada producto y cuánto se le pidió",
    /¿Cuántos quintales salieron de cada uno\?/.test(t) && /Arrox Extra Lira/.test(t) &&
    /pidió 100 qq/.test(t) && /pidió 50 qq/.test(t));
  const cajas = vm.runInContext("window.__cajas()", m.ctx);
  comprobar("viene puesto lo pedido: lo normal es que salga completo",
    cajas.length === 2 && cajas[0].valor === "100" && cajas[1].valor === "50");
  comprobar("y el teclado no deja pasarse de lo pedido",
    cajas[0].max === "100" && cajas[1].max === "50");
  comprobar("mientras salga completo, no avisa de nada", !/Sale corto/.test(t));

  /* sale corto */
  vm.runInContext('window.__escribirN(0, "80")', m.ctx);
  await esperar(200);
  t = txtP(m);
  comprobar("al bajar una cantidad, lo dice con números", /Sale corto/.test(t) && /130 de 150 qq/.test(t));
  comprobar("y avisa que la comisión del vendedor se reajusta sola", /reajusta solo la comisión/.test(t));
  comprobar("y que lo que faltó se pierde, no queda pendiente",
    /Lo que faltó no\s+queda pendiente/.test(t) || /no\s*queda pendiente/.test(t));

  /* despachar de más no se puede */
  vm.runInContext('window.__escribirN(0, "120")', m.ctx);
  await esperar(200);
  comprobar("si escribe más de lo pedido, lo frena y lo dice",
    /No puedes despachar más de lo que te pidieron/.test(txtP(m)) &&
    vm.runInContext('window.__apagado("Facturar")', m.ctx) === true);
  /* El botón apagado es la primera defensa; esta es la segunda, por si alguien
     llega a la función por otro camino. Sin ella, apagar el botón sería la
     única barrera del lado de la app. */
  vm.runInContext('window.__escribirFactura("F-X")', m.ctx);
  await esperar(150);
  vm.runInContext('window.__forzarFactura()', m.ctx);
  await esperar(260);
  comprobar("y aunque se llame a la función a la fuerza, tampoco manda nada",
    m.rpc.filter((r) => r.nombre === "facturar_pedido").length === 0);
  vm.runInContext('window.__escribirFactura("")', m.ctx);
  await esperar(120);

  /* facturar de verdad */
  vm.runInContext('window.__escribirN(0, "80")', m.ctx);
  await esperar(150);
  vm.runInContext('window.__escribirFactura("001-001-000999")', m.ctx);
  await esperar(150);
  vm.runInContext('window.__tocar("Facturar")', m.ctx);
  await esperar(320);
  const l = m.rpc.filter((r) => r.nombre === "facturar_pedido")[0] || {};
  comprobar("manda la factura y las cantidades JUNTAS, en una sola llamada",
    l.args && l.args.p_ped === "PD-0031" && l.args.p_factura === "001-001-000999" &&
    Array.isArray(l.args.p_lineas) && l.args.p_lineas.length === 2);
  comprobar("cada línea va con su código y lo que salió de ella",
    l.args && l.args.p_lineas[0].item_id === "PD-0031-I1" && l.args.p_lineas[0].despachado_qq === 80 &&
    l.args.p_lineas[1].item_id === "PD-0031-I2" && l.args.p_lineas[1].despachado_qq === 50);
  comprobar("y avisa con las palabras que devuelve la base",
    /Se reajusta la comisión del vendedor/.test(txtP(m)));

  /* sin número de factura no se guarda */
  const m2 = montarProv();
  vm.runInContext("window.__montar(true)", m2.ctx);
  await esperar(260);
  vm.runInContext('window.__tocar("Facturar")', m2.ctx);
  await esperar(260);
  comprobar("sin número de factura no manda nada",
    m2.rpc.filter((r) => r.nombre === "facturar_pedido").length === 0 &&
    /Digita el número de factura/.test(txtP(m2)));

  /* si la base rechaza */
  const m3 = montarProv({ falla: true });
  vm.runInContext("window.__montar(true)", m3.ctx);
  await esperar(260);
  vm.runInContext('window.__escribirFactura("F-1")', m3.ctx);
  await esperar(150);
  vm.runInContext('window.__tocar("Facturar")', m3.ctx);
  await esperar(320);
  comprobar("si la base rechaza, muestra el motivo y no dice que facturó",
    /ya está facturado/.test(txtP(m3)) && !/nace la comisión de Daniel/.test(txtP(m3)));

  /* sin sesión, la demostración de siempre */
  const m4 = montarProv();
  vm.runInContext("window.__montar(false)", m4.ctx);
  await esperar(260);
  comprobar("sin datos de verdad, la demostración sigue como siempre",
    !/¿Cuántos quintales salieron/.test(txtP(m4)) && /Pedidos por facturar/.test(txtP(m4)));

  /* ── el freelance ── */
  const fc = montarFc(pedidoFc());
  await esperar(200);
  t = vm.runInContext("window.__txt()", fc);
  comprobar("el freelance ve que salió corto, con los dos números",
    /Salió corto: 130 de 150 qq/.test(t));
  comprobar("y ve qué producto faltó y cuánto", /Arrox Extra Lira/.test(t) && /80 de 100 qq/.test(t));
  comprobar("no lista los productos que sí salieron completos: sería ruido",
    !/50 de 50 qq/.test(t));
  comprobar("avisa que el monto y la comisión son sobre lo que sí salió",
    /calculado sobre lo que/.test(t) && /sí salió/.test(t));

  const fc2 = montarFc(pedidoFc({ faltante: 0, cant: 150, pedidoQq: 150,
    lineas: [{ nombre: "Arrox Extra Lira", pedido: 100, salio: 100 }] }));
  await esperar(200);
  comprobar("si salió completo, no molesta con ningún aviso",
    !/Salió corto/.test(vm.runInContext("window.__txt()", fc2)));

  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
