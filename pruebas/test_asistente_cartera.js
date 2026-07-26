/* ═══════════════════════════════════════════════════════════════════════
   EL ASISTENTE DE VOZ DICE LA VERDAD · freelance-completo b369

   Antes: si Richard preguntaba "¿cuánto me debe Mendoza?", el asistente
   respondía con la cartera de DEMOSTRACIÓN, con toda seguridad y en voz alta.
   Un número inventado dicho con confianza es peor que no responder.

   Aquí se comprueba, contra el bundle real:
     · con sesión, las ocho respuestas de Cartera salen de la base;
     · el cálculo de días (vencida / vence hoy / vence esta semana);
     · sin sesión, o si la base no trae nada, sigue la demostración de siempre;
     · dos pantallas preguntando a la vez hacen UNA sola consulta.

   Uso: node test_asistente_cartera.js
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

const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };

/* Cartera de verdad, a propósito distinta de la de demostración:
   nombres que NO están en la demo y montos que no se parecen. */
const CARTERA = [
  { mov_id:"M1", cli_id:"C1", doc:"F-9001", vence:dia(-9), monto:1500.00, estado:"pendiente" }, // vencida hace 9
  { mov_id:"M2", cli_id:"C1", doc:"F-9002", vence:dia(0),  monto:  250.50, estado:"pendiente" }, // vence hoy
  { mov_id:"M3", cli_id:"C2", doc:"F-9003", vence:dia(-3), monto: 4000.00, estado:"pendiente" }, // vencida hace 3
  { mov_id:"M4", cli_id:"C2", doc:"F-9004", vence:dia(4),  monto:  800.00, estado:"pendiente" }, // vence en 4
  { mov_id:"M5", cli_id:"C3", doc:"F-9005", vence:dia(-1), monto: 9999.00, estado:"pagado"    }, // pagada: no cuenta
];
const CLIENTES_BD = [
  { cli_id:"C1", nombre:"Tienda Doña Rosa",  sub_id:"SC1", cupo:5000, usado:1750.50, plazo:30,
    tel:"0991112233", bloqueado:false, motivo_bloqueo:null, estado_credito:"Aprobado" },
  { cli_id:"C2", nombre:"Bodega El Chasqui", sub_id:"SC2", cupo:2000, usado:4800, plazo:15,
    tel:"0994445566", bloqueado:true, motivo_bloqueo:"Cheque protestado", estado_credito:"Bloqueado" },
  { cli_id:"C3", nombre:"Comercial Pagado",  sub_id:"SC1", cupo:0, usado:0, plazo:0,
    tel:null, bloqueado:false, motivo_bloqueo:null, estado_credito:"Contado" },
];
const UBICACIONES_BD = [
  { cli_id:"C1", ciudad:"Riobamba", contacto_nombre:"Rosa Guamán", principal:true },
  { cli_id:"C2", ciudad:"Ambato",   contacto_nombre:"Luis Chasqui", principal:true },
];
const PEDIDOS_BD = [
  { ped_id:"P1", cli_id:"C1", creado:"2026-07-10T09:00:00+00:00" },
  { ped_id:"P2", cli_id:"C1", creado:"2026-07-22T09:00:00+00:00" },   /* la más reciente */
  { ped_id:"P3", cli_id:"C2", creado:"2026-06-30T09:00:00+00:00" },
];
const USUARIOS_BD = [{ usr_id:"SC1", nombre:"Carlos Andrade" }, { usr_id:"SC2", nombre:"María Quishpe" }];

/* Comisiones: dos de este mes y una del mes pasado, en distintos estados */
const mesAhora = new Date().toISOString().slice(0,7);
const mesAntes = (()=>{ const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
const COMISIONES_BD = [
  /* generada este mes, el cliente todavía no paga */
  { com_id:"K1", sub_id:"SC1", monto:120.00, f_gen:mesAhora+"-03", f_cli_pago:null, f_conf:null, f_pago:null },
  /* generada este mes, el cliente pagó, el proveedor NO ha aprobado → retenida */
  { com_id:"K2", sub_id:"SC1", monto: 80.50, f_gen:mesAhora+"-05", f_cli_pago:mesAhora+"-20", f_conf:null, f_pago:null },
  /* del mes pasado, liberada ESTE mes y todavía sin cobrar */
  { com_id:"K3", sub_id:"SC2", monto:200.00, f_gen:mesAntes+"-11", f_cli_pago:mesAntes+"-25", f_conf:mesAhora+"-02", f_pago:null },
  /* del mes pasado, liberada y ya cobrada */
  { com_id:"K4", sub_id:"SC2", monto: 50.00, f_gen:mesAntes+"-12", f_cli_pago:mesAntes+"-26", f_conf:mesAntes+"-28", f_pago:mesAntes+"-30" },
];

function montar(conSesion, carteraVacia) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.print = () => {}; w.navigator.vibrate = () => {}; w.alert = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";

  const consultas = [];   /* para ver cuántas veces se pregunta a la base */
  const datosDe = (t) => {
    if (t === "cartera_cliente")     return carteraVacia ? [] : CARTERA;
    if (t === "clientes")            return CLIENTES_BD;
    if (t === "ubicaciones_cliente") return UBICACIONES_BD;
    if (t === "pedidos")             return PEDIDOS_BD;
    if (t === "comisiones")          return carteraVacia ? [] : COMISIONES_BD;
    if (t === "usuarios")        return conSesion
      ? [{ usr_id:"FRL-RR", nombre:"Richard Ramírez", rol:"freelance", activo:true }].concat(USUARIOS_BD)
      : [];
    return [];
  };
  const q = (t) => {
    const filas = datosDe(t);
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
      getSession: async () => (conSesion ? { data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } } : { data:{ session:null } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => { consultas.push(t); return q(t); }, rpc: async () => ({ data:null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(react, ctx); vm.runInContext(reactDom, ctx); vm.runInContext(js, ctx);
  return { ctx, consultas };
}

const responder = (ctx, id, dato) => vm.runInContext(
  `(function(){ var p = PREGUNTAS_ASIST.find(function(x){ return x.id === ${JSON.stringify(id)}; });
     return p ? p.responder(${JSON.stringify(dato || null)}) : "(no existe esa pregunta)"; })()`, ctx);

/* Como le habla una persona de verdad: una frase suelta. El asistente tiene que
   entender qué le preguntan Y a quién, y recién ahí responder. Probar solo el
   `responder` con el nombre exacto se saltaría justo el paso que fallaba. */
const preguntarEnVozAlta = (ctx, frase) => vm.runInContext(
  `(function(){ var r = interpretarAsist(${JSON.stringify(frase)});
     if(!r || !r.pregunta) return "(no entendió la pregunta)";
     if(r.pregunta.pide && !r.dato) return "(no reconoció el nombre)";
     return r.pregunta.responder(r.dato); })()`, ctx);

(async () => {
  console.log("═══ Asistente de voz · las respuestas de cartera");

  /* ── CON SESIÓN: los números salen de la base ── */
  const v = montar(true, false);
  const cargada = await vm.runInContext("cargarCarteraReal()", v.ctx);
  comprobar("carga la cartera de verdad al haber sesión", Array.isArray(cargada) && cargada.length === 4);
  comprobar("deja fuera la factura ya pagada", !JSON.stringify(cargada).includes("Comercial Pagado"));
  comprobar("sabe de quién es cada factura", vm.runInContext("carteraEsViva()", v.ctx) === true);

  let r = preguntarEnVozAlta(v.ctx, "cuánto tiene pendiente Doña Rosa");
  comprobar("cuánto debe un cliente: suma sus dos facturas ($1.750,50)", /1[.,]750[.,]50/.test(r) && /2 factura/.test(r));
  comprobar("y avisa cuánto de eso está vencido ($1.500)", /1[.,]500/.test(r) && /vencido/.test(r));
  comprobar("NO responde con la cartera de demostración", !/6[.,]450|Comercial Nilo/.test(r));

  r = preguntarEnVozAlta(v.ctx, "facturas vencidas de Chasqui");
  comprobar("facturas vencidas de un cliente: 1 por $4.000", /1 factura vencida/.test(r) && /4[.,]000/.test(r));
  comprobar("reconoce al cliente aunque lo nombren a medias", !/no reconoció/.test(r));

  r = responder(v.ctx, "cobrosHoy");
  comprobar("cobros de hoy: la que vence hoy, con su nombre", /Doña Rosa/.test(r) && /250[.,]50/.test(r));

  r = responder(v.ctx, "cobrosSemana");
  comprobar("vence esta semana: las 2 que caen de aquí a 7 días ($1.050,50)",
    /2 facturas/.test(r) && /1[.,]050[.,]50/.test(r));

  r = responder(v.ctx, "carteraVencida");
  comprobar("cartera vencida total: $5.500 en 2 facturas", /5[.,]500/.test(r) && /2 factura/.test(r));

  r = responder(v.ctx, "totalPorCobrar");
  comprobar("total por cobrar: $6.550,50 en 4 facturas", /6[.,]550[.,]50/.test(r) && /4 factura/.test(r));

  r = responder(v.ctx, "clienteMasDebe");
  comprobar("el que más debe es el Chasqui ($4.800)", /Chasqui/.test(r) && /4[.,]800/.test(r));

  r = preguntarEnVozAlta(v.ctx, "cartera del vendedor Carlos Andrade");
  comprobar("cartera de un vendedor: la de sus clientes", /Carlos/.test(r) && /1[.,]750[.,]50/.test(r));

  /* una sola consulta aunque pregunten dos a la vez */
  const antes = v.consultas.filter(t => t === "cartera_cliente").length;
  await Promise.all([
    vm.runInContext("cargarCarteraReal()", v.ctx),
    vm.runInContext("cargarCarteraReal()", v.ctx),
  ]);
  comprobar("no vuelve a preguntar a la base por cada consulta",
    v.consultas.filter(t => t === "cartera_cliente").length === antes);

  /* ── SIN SESIÓN: la demostración de siempre ── */
  const d = montar(false, false);
  const nada = await vm.runInContext("cargarCarteraReal()", d.ctx);
  comprobar("sin sesión no inventa: no hay cartera viva", nada === null && vm.runInContext("carteraEsViva()", d.ctx) === false);
  r = preguntarEnVozAlta(d.ctx, "cuánto tiene pendiente Comercial Mendoza");
  comprobar("sin sesión sigue respondiendo la demostración", /Comercial Mendoza/.test(r) && /2[.,]301[.,]40/.test(r));

  /* ── CON SESIÓN PERO SIN CARTERA: tampoco se cae ── */
  const z = montar(true, true);
  await vm.runInContext("cargarCarteraReal()", z.ctx);
  comprobar("con sesión y sin cartera, vuelve a la demostración sin romperse",
    vm.runInContext("carteraEsViva()", z.ctx) === false &&
    /Comercial Mendoza/.test(preguntarEnVozAlta(z.ctx, "cuánto tiene pendiente Comercial Mendoza")));

  /* ══════════ b370 · FICHAS DE CLIENTE ══════════ */
  console.log("═══ Asistente · las fichas de cliente");
  await vm.runInContext("cargarCarteraReal()", v.ctx);

  r = preguntarEnVozAlta(v.ctx, "cuántos clientes tengo");
  comprobar("cuántos clientes: los de verdad (3), no los 7 de la demo", /\b3 clientes\b/.test(r));

  r = preguntarEnVozAlta(v.ctx, "qué clientes están bloqueados");
  comprobar("bloqueados: el Chasqui, que lo está de verdad", /Chasqui/.test(r) && !/Mendoza|Ríos/.test(r));

  r = preguntarEnVozAlta(v.ctx, "cupo disponible de Doña Rosa");
  comprobar("cupo: $5.000 menos $1.750,50 usados = $3.249,50 libres",
    /5[.,]000/.test(r) && /1[.,]750[.,]50/.test(r) && /3[.,]249[.,]50/.test(r));

  r = preguntarEnVozAlta(v.ctx, "días de crédito de Doña Rosa");
  comprobar("días de crédito: 30, los de su ficha", /30 días/.test(r));

  r = preguntarEnVozAlta(v.ctx, "última compra de Doña Rosa");
  comprobar("última compra: el pedido más reciente, dicho en palabras", /22 de julio/.test(r));

  r = preguntarEnVozAlta(v.ctx, "datos de contacto de Doña Rosa");
  comprobar("datos de contacto: nombre, teléfono y ciudad de verdad",
    /Rosa Guamán/.test(r) && /0991112233/.test(r) && /Riobamba/.test(r));

  r = preguntarEnVozAlta(v.ctx, "clientes del vendedor Carlos Andrade");
  comprobar("clientes de un vendedor: los suyos, de la cartera viva",
    /Doña Rosa/.test(r) && !/Chasqui/.test(r));

  /* ══════════ b370 · COMISIONES ══════════ */
  console.log("═══ Asistente · las comisiones");
  const comCargadas = await vm.runInContext("cargarComisionesReal()", v.ctx);
  comprobar("carga las comisiones de verdad", Array.isArray(comCargadas) && comCargadas.length === 4);

  r = responder(v.ctx, "comisiones");
  comprobar("generadas este mes: las dos de este mes ($200,50)", /200[.,]50/.test(r));

  r = responder(v.ctx, "comLiberadas");
  comprobar("liberadas este mes: la que aprobó el proveedor ($200)", /200[.,]00/.test(r));

  r = responder(v.ctx, "comPendientes");
  comprobar("pendientes de liberar: el cliente pagó y el proveedor no aprueba ($80,50)",
    /80[.,]50/.test(r) && /apruebe el pago/.test(r));
  comprobar("no cuenta como pendiente la que el cliente aún no paga", !/120/.test(r));

  r = responder(v.ctx, "comAnioTotal");
  comprobar("acumulado del año: las cuatro ($450,50)", /450[.,]50/.test(r));

  r = responder(v.ctx, "totalRecibirMes");
  comprobar("por cobrar: liberada este mes y todavía sin pagar ($200)", /200[.,]00/.test(r));

  r = responder(v.ctx, "comProveedor");
  comprobar("la comisión del proveedor: dice que no la lleva, no inventa",
    /no llevo/.test(r) && !/\$/.test(r));

  /* sin sesión, las comisiones siguen en demostración y no se rompen */
  await vm.runInContext("cargarComisionesReal()", d.ctx);
  comprobar("sin sesión no hay comisiones vivas", vm.runInContext("comisionesEsVivas()", d.ctx) === false);
  const rd = responder(d.ctx, "comisiones");
  comprobar("sin sesión responde la demostración sin caerse", typeof rd === "string" && rd.length > 10);

  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.message || e).split("\n")[0]); process.exit(1); });
