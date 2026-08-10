/* ═══════════════════════════════════════════════════════════════════════
   EL TOTAL EN QUINTALES DEL CARRITO SALE DE LA OFERTA, NO DEL TEXTO
   · Comisionista y socio-comercial

   Qué se rompía: el total en quintales del pedido en curso se calculaba
   ADIVINANDO la equivalencia desde el TEXTO de la unidad. La función miraba
   si decía «quintal» (1), si traía «kg» (kg ÷ 45,4) y, si no reconocía nada,
   devolvía 1. «Arroba» no dice quintal ni trae kg: valía 1 qq cuando una
   arroba son 0,25. Un pedido de 8 arrobas se veía como 8 qq en pantalla y se
   grababa como 2 qq en la base. El número de la pantalla contradecía al de la
   base, y la pantalla es la que mira el vendedor cuando decide.

   Lo que se graba SIEMPRE salió bien, porque al guardar se usa `prod.equiv`,
   la equivalencia real que trae la oferta (cantidad_qq = cant × equiv). Esta
   prueba amarra las dos puntas: la pantalla y la base tienen que decir el
   MISMO número, y ese número tiene que salir del mismo dato.

   El antecedente que obliga a medir y no a leer: en la app del transportista
   los quintales se sacaban del NOMBRE del producto, y una parada de 65 qq se
   mostraba como «22 qq» y otra de 72 como «0 qq». Lo cazó una prueba.

   Por eso aquí hay una presentación tramposa a propósito: un «Saco 45 kg» que
   la piladora factura como UN quintal (equiv_qq = 1). Quien adivine desde el
   texto dirá 45 ÷ 45,4 = 0,99 y quedará corto. Solo quien lea la oferta acierta.

   NACE ROJA a propósito: al final se rompe la regla en el código fuente, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Hay roturas tontas
   (sumarle 1 al total, multiplicarlo por 2) además de las semánticas: una
   rotura "inteligente" puede quedar neutralizada por los datos de prueba y
   hacer creer que la prueba no mide.

   Uso: node test_qq_carrito.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("Comisionista");
const nombreApp = ruta.split("/").pop();
const esSocio = /socio-comercial/i.test(nombreApp);
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

/* ── Cuántas comprobaciones se esperan. Se declara ANTES de correr para que
      una prueba que se borra sin querer no pase inadvertida. ── */
const ESPERADAS = 15;
const MUTANTES_ESPERADOS = 6;

const esperar = (ms) => new Promise(r => setTimeout(r, ms || 80));
const dia = (n) => { const d = new Date(Date.now() + n * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
const HOY = dia(0), AYER = dia(-1);

/* ══ Fixture sintético con la forma del contrato de producción ══ */
const PRODUCTOS_BD = [
  { prod_id:"PROD-DEMO-B", nombre:"Producto Demo B", marca:null,
    linea:"Arroz", proveedor:"Proveedor Demo A", proveedor_cod:"PROV-DEMO-A", foto:null, estado:"activo" },
];

const OFERTAS_BD = [
  { prod_id:"PROD-DEMO-B", pres_cod:"QQ",  presentacion:"Quintal", equiv_qq:1,    prov_cod:"PROV-DEMO-A", costo:34.00, costo_contado:33.00, precio_contado:37.00, precio_credito:38.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* la que rompía la pantalla: el texto no dice ni «quintal» ni «kg» */
  { prod_id:"PROD-DEMO-B", pres_cod:"ARR", presentacion:"Arroba",  equiv_qq:0.25, prov_cod:"PROV-DEMO-A", costo:8.50,  costo_contado:8.25,  precio_contado:9.25,  precio_credito:9.50,  activo:true, vigente_desde:AYER, vigente_hasta:null },
  /* la trampa: el texto dice 45 kg (0,99 qq) pero la piladora lo factura como 1 qq */
  { prod_id:"PROD-DEMO-B", pres_cod:"S45", presentacion:"Saco 45 kg", equiv_qq:1, prov_cod:"PROV-DEMO-A", costo:34.00, costo_contado:33.00, precio_contado:37.00, precio_credito:38.00, activo:true, vigente_desde:AYER, vigente_hasta:null },
];

const PROVEEDORES_BD = [
  { prov_cod:"PROV-DEMO-A", nombre:"Proveedor Demo A", es_demo:false },
];
const CLIENTES_BD = [
  { cli_id:"CLI-DEMO", nombre:"Cliente Demo", razon_social:"Cliente Demo S.A.",
    es_demo:false, activo:true, bloqueado:false },
];
const UBIC_BD = [
  { ubic_id:"UBI-DEMO", cli_id:"CLI-DEMO", nombre:"Local Demo", principal:true, tipo_entrega:"domicilio",
    ciudad:"Ciudad Demo", direccion:"Dirección Demo", activo:true },
];

function datosDe(t) {
  if (t === "productos")           return PRODUCTOS_BD;
  if (t === "ofertas_piladora")    return OFERTAS_BD;
  if (t === "proveedores")         return PROVEEDORES_BD;
  if (t === "clientes")            return CLIENTES_BD;
  if (t === "ubicaciones_cliente") return UBIC_BD;
  if (t === "precios")             return [];
  if (t === "pedidos")             return [{ ped_id:"PED-DEMO-12" }];
  if (t === "usuarios")            return [{ usr_id:"USR-DEMO", auth_uid:"u1", nombre:"Usuario Demo", rol:"comisionista", activo:true }];
  return [];
}

function montar(js) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.open = () => null; w.alert = () => {}; w.print = () => {}; w.navigator.vibrate = () => {};
  w.speechSynthesis = { speak(){}, cancel(){}, getVoices:()=>[] };
  w.Notification = function(){}; w.Notification.permission = "denied"; w.Notification.requestPermission = async()=>"denied";

  const pedidas = [];
  const escrito = { pedidos:[], items:[], borrados:[], rpc:[] };
  function consulta(tabla, filtros) {
    const resolver = () => {
      let filas = datosDe(tabla).slice();
      filtros.forEach(f => {
        if (f[0] === "eq")  filas = filas.filter(r => r[f[1]] === f[2]);
        if (f[0] === "neq") filas = filas.filter(r => r[f[1]] !== f[2]);
        if (f[0] === "is")  filas = filas.filter(r => (f[2] === null ? r[f[1]] == null : r[f[1]] === f[2]));
        if (f[0] === "in")  filas = filas.filter(r => (f[2] || []).indexOf(r[f[1]]) >= 0);
      });
      return Promise.resolve({ data:filas, error:null, count:filas.length });
    };
    const con = (t, c, v) => consulta(tabla, filtros.concat([[t, c, v]]));
    const enc = {
      select:()=>enc, order:()=>enc, limit:()=>enc, like:()=>enc, not:()=>enc, or:()=>enc,
      gte:()=>enc, lte:()=>enc, range:()=>enc, filter:()=>enc,
      eq:(c,v)=>con("eq",c,v), neq:(c,v)=>con("neq",c,v), is:(c,v)=>con("is",c,v), in:(c,v)=>con("in",c,v),
      then:(ok,mal)=>resolver().then(ok,mal), catch:(f)=>resolver().catch(f),
      maybeSingle:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      single:()=>resolver().then(r=>({ data:(r.data||[])[0]||null, error:r.error })),
      insert:(f)=>{
        if (tabla === "pedidos")      escrito.pedidos.push(f);
        if (tabla === "pedido_items") escrito.items.push(f);
        return Promise.resolve({ error:null });
      },
      upsert:()=>Promise.resolve({ error:null }),
      update:()=>{ const r = Promise.resolve({ error:null }); r.eq = () => r; return r; },
      delete:()=>({ eq:(c,v)=>{ escrito.borrados.push(v); return Promise.resolve({ error:null }); } }),
    };
    return enc;
  }
  w.SB = {
    auth: {
      getSession: async () => ({ data:{ session:{ user:{ id:"u1", email:"usuario@example.invalid" }, expires_at: Math.floor(Date.now()/1000)+3600 } } }),
      refreshSession: async () => ({ data:{ session:null } }),
      signOut: async () => ({}), onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    },
    from: (t) => { pedidas.push(t); return consulta(t, []); },
    rpc: async (nombre,args) => {
      if(nombre==="mi_org_activa") return {data:"ORG-001",error:null};
      if(nombre!=="registrar_pedido_atomico") return {data:null,error:null};
      escrito.rpc.push({nombre,args});
      const p=args.p_payload;
      escrito.items.push((p.items||[]).map((it,idx)=>{
        const of=OFERTAS_BD.find(o=>o.prod_id===it.prod_id&&o.pres_cod===it.pres_cod&&o.prov_cod===p.proveedor_id);
        const eq=Number(of&&of.equiv_qq)||1;
        return {item_id:"PED-DEMO-13-I"+(idx+1),ped_id:"PED-DEMO-13",cantidad_qq:Number(it.cantidad_presentacion)*eq};
      }));
      return {data:[{ped_id:"PED-DEMO-13",repetido:false}],error:null};
    },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    functions: { invoke: async () => ({ data:{}, error:null }) },
    storage: { from: () => ({ upload: async()=>({}), createSignedUrl: async()=>({data:null}) }) },
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
  return { ctx, pedidas, escrito, w };
}

const corre = (m, expr) => vm.runInContext(expr, m.ctx);

/* ── La pantalla del pedido, montada como la ve el vendedor.
      En socio-comercial el paso vive FUERA del módulo (llega por prop), así
      que se le pone una envoltura que lo guarde. ── */
function pintar(m) {
  corre(m, `
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    window.__Envoltura = function(){
      var st = React.useState(1);
      return React.createElement(Pedido, {
        toast:function(){}, prodInicial:null, onConsumir:function(){}, go:function(){},
        irGuardado:function(){}, onGuardarPedido:function(){},
        cliInicial:null, onConsumirCli:function(){}, onCobrar:function(){},
        paso:st[0], setPaso:st[1] });
    };
    ReactDOM.flushSync(function(){
      ReactDOM.createRoot(window.__c).render(React.createElement(window.__Envoltura));
    });
    window.__txt = function(){ return window.__c.textContent || ""; };
    window.__buscador = function(nombre){
      var cajas = window.__c.querySelectorAll(".ss input");
      for (var i=0;i<cajas.length;i++){
        var ph = (cajas[i].getAttribute("placeholder")||"").toLowerCase();
        if (ph.indexOf(nombre.toLowerCase()) >= 0) return cajas[i];
      }
      return null;
    };
    window.__escribir = function(caja, texto){
      if (!caja) return false;
      var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
      set.call(caja, texto);
      caja.dispatchEvent(new window.Event("input",{bubbles:true}));
      return true;
    };
    window.__casa = function(txt, partes){
      for (var j=0;j<partes.length;j++) if (txt.indexOf(partes[j]) < 0) return false;
      return true;
    };
    window.__tocarOpcion = function(partes){
      if (typeof partes === "string") partes = [partes];
      var op = window.__c.querySelectorAll(".opt");
      for (var i=0;i<op.length;i++){
        if (window.__casa(op[i].textContent||"", partes)){
          op[i].dispatchEvent(new window.MouseEvent("mousedown",{bubbles:true}));
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
    window.__cantidad = function(n){
      var i = window.__c.querySelector("input.qty-input");
      if (!i) return "no está la casilla de cantidad";
      window.__escribir(i, String(n));
      return null;
    };
    window.__tocar = function(sel){
      var b = window.__c.querySelector(sel);
      if (!b || b.disabled) return false;
      b.dispatchEvent(new window.MouseEvent("click",{bubbles:true}));
      return true;
    };
  `);
}

async function elegir(m, campo, texto, tocar) {
  const err = corre(m, `window.__elegir(${JSON.stringify(campo)}, ${JSON.stringify(texto)})`);
  if (err) return err;
  await esperar(80);
  const ok = corre(m, `window.__tocarOpcion(${JSON.stringify(tocar || texto)})`);
  await esperar(120);
  return ok ? null : "no apareció la opción " + (tocar || texto);
}

/* ══ La batería. Se corre igual contra el código bueno y contra los mutantes ══ */
async function bateria(js, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };

  const m = montar(js);

  /* ── El catálogo real del pedido: de ahí sale la equivalencia de cada línea ── */
  let cat = null;
  try {
    cat = corre(m, `construirCatalogoPedido(
      ${JSON.stringify(PROVEEDORES_BD)}, ${JSON.stringify(OFERTAS_BD)}, ${JSON.stringify(PRODUCTOS_BD)}, [])`);
  } catch (e) { cat = null; }
  const pres = (cat && cat.pres) ? Array.from(cat.pres) : [];
  const de = (cod) => pres.find(p => p.presCod === cod) || null;
  const QQ = de("QQ"), ARR = de("ARR"), S45 = de("S45");

  const linea = (p, cant) => ({
    id:cant, prod:p, prodNombre:p ? p.nombre : "", unidad:p ? p.unidad : "",
    tipo:"P2", tipoNombre:"Contado", cant, precio:p ? p.baseContado : 0,
    gratis:0, esCredito:false, credito:false, comisionTotal:0, requiere:false, motivoAuth:null,
  });

  /* Carritos de ejemplo. El de arrobas es el que mentía: 8 arrobas son 2 qq. */
  const soloArrobas  = [linea(ARR, 8)];
  const soloQuintal  = [linea(QQ, 50)];
  const mezcla       = [linea(QQ, 50), linea(ARR, 8)];
  const sacos45      = [linea(S45, 10)];
  /* Demostración: la presentación NO viene de una oferta, así que no hay `equiv` */
  const demoArroba   = [{ id:9, prod:{ id:"AG-AR", unidad:"Arroba 25 lb" }, prodNombre:"Arroz Gustadina · Arroba 25 lb",
                          unidad:"Arroba 25 lb", tipo:"P2", cant:8, precio:11, gratis:0, comisionTotal:0 }];

  const total = (c) => {
    try { return corre(m, `totalQuintalesDeCarrito(${JSON.stringify(c)})`); }
    catch (e) { return "reventó: " + e.message; }
  };

  comprobar("carrito de 8 ARROBAS (equiv 0,25): la pantalla dice 2 qq",
    total(soloArrobas) === 2);
  comprobar("y NO dice 8 qq, que era lo que salía de adivinar desde el texto «Arroba»",
    total(soloArrobas) !== 8);
  comprobar("carrito de 50 QUINTALES: 50 qq",
    total(soloQuintal) === 50);
  comprobar("MEZCLA de 50 quintales + 8 arrobas: 52 qq",
    total(mezcla) === 52);
  comprobar("y NO dice 58 qq, que era lo que mostraba antes",
    total(mezcla) !== 58);
  comprobar("«Saco 45 kg» que la piladora factura como 1 qq: 10 sacos son 10 qq, no 9,91",
    total(sacos45) === 10);
  comprobar("carrito vacío: 0 qq",
    total([]) === 0);
  comprobar("una línea de demostración (sin oferta, sin equivalencia) no revienta el total",
    typeof total(demoArroba) === "number");
  comprobar("y esa arroba de demostración cuenta 0,25 qq: 8 arrobas son 2 qq, no 8",
    total(demoArroba) === 2);

  /* ── Lo que se GRABA: tiene que decir exactamente lo mismo ── */
  async function grabar(carrito) {
    const g = montar(js);
    corre(g, `CLI_ID_DE["Cliente Demo"] = "CLI-DEMO";`);
    try {
      const r = await corre(g, `guardarPedidoEnBase({
        cli:{nombre:"Cliente Demo"}, prov:{id:"PROV-DEMO-A"}, retiro:true,
        carrito:${JSON.stringify(carrito)} })`);
      const items = (g.escrito.items[0]) || [];
      if (!r || !r.ok || !items.length) return null;
      return Math.round(items.reduce((s,it)=>s+(Number(it.cantidad_qq)||0),0)*100)/100;
    } catch (e) { return null; }
  }
  const grabArrobas = await grabar(soloArrobas);
  const grabMezcla  = await grabar(mezcla);
  const grabSacos   = await grabar(sacos45);

  comprobar("lo que se GRABA del carrito de arrobas suma 2 qq",
    grabArrobas === 2);
  comprobar("lo que se GRABA de la mezcla suma 52 qq",
    grabMezcla === 52);
  comprobar("pantalla y base dicen el MISMO número en el carrito de arrobas",
    grabArrobas !== null && total(soloArrobas) === grabArrobas);
  comprobar("pantalla y base dicen el MISMO número en la mezcla",
    grabMezcla !== null && total(mezcla) === grabMezcla);
  comprobar("pantalla y base dicen el MISMO número con el saco de 45 kg",
    grabSacos !== null && total(sacos45) === grabSacos);

  /* ── La pantalla de verdad ──
     En socio-comercial el total SE PINTA (tarjeta «Cantidad» del resumen), así
     que se arma el pedido tocando la app y se LEE el número.
     En Comisionista el total se calcula pero HOY NO SE PINTA en ninguna
     pantalla: se deja constancia de eso, que es el hueco real de esa app. */
  if (esSocio) {
    pintar(m);
    await esperar(400);
    let pasos = await elegir(m, "cliente", "Cliente Demo");
    if (!pasos) pasos = await elegir(m, "proveedor", "Proveedor Demo A", "Proveedor Demo A");
    if (!pasos) pasos = await elegir(m, "producto", "producto demo b", ["Producto Demo B","Quintal"]);
    if (!pasos) pasos = corre(m, `window.__cantidad(50)`);
    await esperar(120);
    if (!pasos && !corre(m, `window.__tocar(".cta-carrito")`)) pasos = "no se pudo agregar el quintal";
    await esperar(150);
    if (!pasos) pasos = await elegir(m, "producto", "producto demo b", ["Producto Demo B","Arroba"]);
    if (!pasos) pasos = corre(m, `window.__cantidad(8)`);
    await esperar(120);
    if (!pasos && !corre(m, `window.__tocar(".cta-carrito")`)) pasos = "no se pudo agregar la arroba";
    await esperar(150);
    if (!pasos && !corre(m, `window.__tocar(".mostrar-pedido")`)) pasos = "no se pudo abrir el resumen";
    await esperar(200);
    const txt = pasos ? "" : corre(m, `window.__txt()`);
    comprobar("EN PANTALLA: 50 quintales + 8 arrobas se ven como «52 qq», no como «58 qq»"
      + (pasos ? " → " + pasos : ""),
      !pasos && /52 qq/.test(txt) && !/58 qq/.test(txt));
  } else {
    comprobar("en Comisionista el total en quintales se calcula pero HOY NO SE PINTA en ninguna pantalla",
      /totalQuintalesCarrito/.test(jsx) && (jsx.split("totalQuintalesCarrito").length - 1) === 1);
  }

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const CUERPO = `    const eq = it.prod ? Number(it.prod.equiv) : 0;
    return s + ((eq>0 ? eq : qqDeTam(it.unidad)) * (Number(it.cant)||0));`;

const MUTANTES = [
  /* tonta y directa: si esto no tumba la prueba, la prueba no mide nada */
  ["TONTA · le suma 1 al total",
    `  },0);
  return Math.round(qq*100)/100;`,
    `  },0);
  return Math.round(qq*100)/100 + 1;`],
  ["TONTA · multiplica el total por 2",
    `function totalQuintalesDeCarrito(carrito){
  const qq =`,
    `function totalQuintalesDeCarrito(carrito){
  const qq = 2 *`],
  /* el defecto original, tal cual estaba */
  ["vuelve a ADIVINAR la equivalencia desde el texto de la unidad (el defecto original)",
    CUERPO,
    `    const u = it.unidad;
    const kg = u ? u.match(/([\\d.]+)\\s*kg/i) : null;
    const eq = !u ? 1 : (/quintal/i.test(u) ? 1 : (kg ? (parseFloat(kg[1])||0)/45.4 : 1));
    return s + (eq * (Number(it.cant)||0));`],
  /* ignora la oferta y se queda solo con el conversor por texto */
  ["ignora `equiv` de la oferta y siempre cae al conversor por texto",
    `    const eq = it.prod ? Number(it.prod.equiv) : 0;`,
    `    const eq = 0;`],
  ["se le olvida la cantidad de la línea (cuenta una unidad por línea)",
    `(Number(it.cant)||0));`, `1);`],
  /* la otra punta: la RPC recibe unidades de presentación y el servidor hace
     la conversión. Si el navegador le manda quintales disfrazados de unidades,
     la conversión se duplicaría y estas comparaciones tienen que detectarlo. */
  ["el navegador manda quintales como si fueran unidades de presentación",
    `cantidad_presentacion:Number(it.cant),gratis_presentacion`,
    `cantidad_presentacion:Number(it.cant)/(Number(it.prod.equiv)||1),gratis_presentacion`],
];

(async () => {
  console.log("═══ El total en quintales del carrito · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const js = R.Babel.transform(jsx, { presets:["react"] }).code;
  const r = await bateria(js, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
      (ok + mal - 1) + ". Alguna se perdió o se agregó sin declararla.");
  }

  console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
  if (MUTANTES.length !== MUTANTES_ESPERADOS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + MUTANTES_ESPERADOS + " mutantes y hay " + MUTANTES.length + ".");
  }
  for (const [nombre, dee, a] of MUTANTES) {
    const veces = jsx.split(dee).length - 1;
    if (veces !== 1) {
      mal++;
      console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
      continue;
    }
    const mutado = jsx.replace(dee, a);
    let res;
    try { res = await bateria(R.Babel.transform(mutado, { presets:["react"] }).code, false); }
    catch (e) { res = { mal:1, fallos:["reventó: " + e.message] }; }
    if (res.mal > 0) {
      ok++;
      console.log(`  ✓ «${nombre}» → la prueba se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
    } else {
      mal++;
      console.log(`  ✗ «${nombre}» → la prueba PASA IGUAL: no está midiendo nada`);
    }
  }

  console.log("Resultado del total en quintales: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
