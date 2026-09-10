#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   DISENO_ARROCILLO · clasificación dinámica del arrocillo (familia A01).
   - Listas cerradas exactas (tipo/proceso/estado/destino/calidad).
   - arrocilloNombre arma el nombre comercial de vista previa.
   - arrocilloResolver BUSCA la variante viva y, si no existe, la CREA con la RPC.
   - AdminArrocillo (panel de administración) lista, crea y activa/desactiva; solo Freelance.
   Renderiza contra un doble de Supabase (no escribe en la base real).
   Uso: node test_arrocillo.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), vm = require("vm");
const { JSDOM } = require("jsdom");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("sistema-web");
const html = fs.readFileSync(ruta, "utf-8");
const jsx  = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js   = R.Babel.transform(jsx, { presets:["react"] }).code;

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 30));
console.log("═══ DISENO_ARROCILLO · " + ruta.split("/").pop());

/* ── 1 · GUARDAS DE FUENTE ── */
comprobar("existe la familia A01 y las 5 listas cerradas exactas",
  /const ARROCILLO_FAM = "A01"/.test(html) &&
  /ops:\["3\/4","Medio","Fino"\]/.test(html) &&
  /ops:\["Selectado","No selectado"\]/.test(html) &&
  /ops:\["Envejecido","Natural"\]/.test(html) &&
  /ops:\["Humano","Animal"\]/.test(html) &&
  /ops:\["Especial","Estándar","Económico"\]/.test(html));
comprobar("la carga de grano_variedades trae las columnas arr_* (y ya no filtra .eq(activo))",
  /select\("variedad_cod,familia_cod,nombre,nivel_nombre,orden,activo,arr_tipo,arr_proceso,arr_estado,arr_destino,arr_calidad"\)/.test(html));
comprobar("existe el resolver busca-o-crea con la RPC arrocillo_crear_variante",
  /async function arrocilloResolver/.test(html) && /rpc\("arrocillo_crear_variante"/.test(html));
comprobar("el panel usa arrocillo_activar_variante para activar/desactivar (nunca borra)",
  /rpc\("arrocillo_activar_variante"/.test(html) && !/arrocillo_borrar|\.delete\(\)[\s\S]{0,40}grano_variedades/.test(html));
/* PRODUCTOS_SIN_PANEL_ARROCILLO · el panel ya NO se monta en Productos; el componente
   sigue definido (se prueba directo más abajo) y la creación vive en el modal de clasificar. */
comprobar("el panel AdminArrocillo YA NO se monta en el Catálogo (Productos)",
  !/<AdminArrocillo variedades=\{VARIEDADES_OK\} recargar=\{cargarGrano\} usuario=\{usuario\} \/>/.test(html));
comprobar("el componente AdminArrocillo sigue definido (para el modal de clasificar y sus RPC)",
  /function AdminArrocillo\(/.test(html));
comprobar("el alta tiene el conmutador Arroz/Arrocillo y resuelve a granoCod",
  /setEsArrocillo\(true\)/.test(html) && /const ra = await arrocilloResolver\(arrVals\)/.test(html) && /tipo_grano: granoCod \|\| null/.test(html));
comprobar("PiladorasWeb carga las variantes A01 (con creado, activas e inactivas)",
  /window\.supa\.from\("grano_variedades"\)[\s\S]{0,160}\.eq\("familia_cod","A01"\)/.test(html) && /setArrocVars/.test(html) &&
  /select\("variedad_cod,nombre,activo,creado,arr_tipo/.test(html));
comprobar("PiladorasWeb decodifica un código A01xx con el nombre comercial de la base",
  /const esArrocCod=\(cod\)=>String\(cod\|\|""\)\.slice\(0,3\)===ARROCILLO_FAM/.test(html) &&
  /const arrocDe=\(cod\)=>arrocVars\.find/.test(html) &&
  /esArrocCod\(cod\) \? \(\(arrocDe\(cod\)\|\|\{\}\)\.nombre/.test(html));
comprobar("el modal es de dos pasos (Arroz / Arrocillo) y el arrocillo guarda con busca-o-crea",
  /setTgModo\("arrocillo"\)/.test(html) && /tgModo==="arroz" \?/.test(html) &&
  /const r=await arrocilloResolver\(arrSel\)/.test(html) && /await guardarTipoGrano\(tgSel,r\.cod\)/.test(html));
comprobar("modal · encabezado «Variedad: …» + marca + botón cerrar (×)",
  /Variedad: \{actualTxt\}/.test(html) && /const actualTxt = actual \? variedadDesc\(actual\) : "Sin clasificar"/.test(html) &&
  /aria-label="Cerrar"/.test(html));
comprobar("modal · tarjetas grandes Arroz/Arrocillo (cardQ) y opciones con radio (pill)",
  /const cardQ=\(on,emoji,label,onClick\)=>/.test(html) && /const pill=\(on,label,onClick,rf\)=>/.test(html) &&
  /cardQ\(tgModo==="arroz"/.test(html));
comprobar("modal · un solo botón «Guardar» (arroz se marca y se confirma; arrocillo hasta los 5)",
  /const puedeGuardar = tgModo==="arroz" \? !!tgArrozSel : arrocilloCompleto\(arrSel\)/.test(html) &&
  /\(\)=>setTgArrozSel\(cod\)/.test(html) && /\{arrBusy\?"Guardando…":"✓ Guardar"\}/.test(html));
comprobar("modal · «Sin clasificar» apartado (tenue) y autoscroll a lo marcado",
  /on\?tgMarkRef:null/.test(html) && /scrollIntoView\(\{block:"center"\}\)/.test(html));
comprobar("modal · chips «usados recientemente» solo en arrocillo (variantes A01 por creado)",
  /Usados recientemente/.test(html) && /arrocRecientes\.length>0/.test(html) &&
  /arrocVars\.filter\(v=>v\.activo!==false\)[\s\S]{0,90}localeCompare\(String\(a\.creado/.test(html));
comprobar("modal · sin clasificar, adivina el modo por el nombre (marca «Arrocillo…» abre en Arrocillo)",
  /const pareceArroc = !cod && String\(marca\)\.toLowerCase\(\)\.includes\("arrocillo"\)/.test(html) &&
  /else if\(pareceArroc\)\{ setTgModo\("arrocillo"\)/.test(html));
comprobar("el modal NO cambió guardarTipoGrano (se reúsa tal cual)",
  /const guardarTipoGrano=async\(prodId, cod\)=>\{[\s\S]{0,220}update\(\{tipo_grano:cod\|\|null\}\)/.test(html));

/* ── 2 · DOBLE DE SUPABASE + CONTEXTO ── */
const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
  { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
const w = dom.window;
w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
w.scrollTo = () => {}; w.alert = () => {};

/* estado del doble, configurable desde las pruebas */
const DB = { existe:null, rpc:{} , rpcCalls:[] };
function selectChain() {
  const st = {};
  const enc = {
    select:()=>enc, order:()=>enc, limit:()=>enc, in:()=>enc, like:()=>enc, is:()=>enc,
    eq:(c,v)=>{ st[c]=v; return enc; },
    maybeSingle: async () => ({ data: DB.existe, error:null }),
    single: async () => ({ data: DB.existe, error:null }),
    then:(a,b)=>Promise.resolve({ data: DB.existe?[DB.existe]:[], error:null }).then(a,b),
  };
  return enc;
}
w.supa = {
  from: () => selectChain(),
  rpc: async (fn, params) => { DB.rpcCalls.push({ fn, params }); const r = DB.rpc[fn]; return r ? r(params) : ({ data:null, error:{ message:"rpc no simulada: "+fn } }); },
  auth: { getSession: async()=>({ data:{ session:null } }) },
};
const ctx = dom.getInternalVMContext();
vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
vm.runInContext(`
  window.__nombre = function(v){ return arrocilloNombre(v); };
  window.__resolver = function(v){ return arrocilloResolver(v); };
  window.__completo = function(v){ return arrocilloCompleto(v); };
  window.__render = function(vars, usuario, recargar){ window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){ ReactDOM.createRoot(window.__c).render(React.createElement(AdminArrocillo, { variedades:vars, usuario:usuario, recargar:recargar })); }); };
  window.__flush = function(){ ReactDOM.flushSync(function(){}); };
  window.__txt = function(){ return (window.__c && window.__c.textContent) || ""; };
  window.__click = function(sub){ var bs=window.__c.querySelectorAll("button"); for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(sub)>=0 && !bs[i].disabled){ bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } } return false; };
  window.__clickEl = function(sub){ var all=window.__c.querySelectorAll("*"); var mejor=null; for(var i=0;i<all.length;i++){ var tx=all[i].textContent||""; if(tx.indexOf(sub)>=0 && (mejor===null || tx.length<(mejor.textContent||"").length)) mejor=all[i]; } if(mejor){ mejor.dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } return false; };
  window.__setSel = function(idx, val){ var ss=window.__c.querySelectorAll("select"); if(!ss[idx]) return false; var s=ss[idx];
    var setV=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,"value").set; setV.call(s,val); s.dispatchEvent(new window.Event("change",{bubbles:true})); return true; };
  window.__nsel = function(){ return window.__c.querySelectorAll("select").length; };
`, ctx);
const run = (e) => vm.runInContext(e, ctx);

(async () => {
  /* ── 3 · arrocilloNombre / arrocilloCompleto ── */
  const V = { tipo:"Medio", proceso:"Selectado", estado:"Natural", destino:"Humano", calidad:"Especial" };
  comprobar("arrocilloNombre arma «Arrocillo Medio · Selectado · Natural · Humano · Especial»",
    run(`window.__nombre(${JSON.stringify(V)})`) === "Arrocillo Medio · Selectado · Natural · Humano · Especial");
  comprobar("faltando un campo, NO está completo (obligatorios)",
    run(`window.__completo(${JSON.stringify({ ...V, calidad:"" })})`) === false);

  /* ── 4 · resolver: existe viva → la usa, NO llama a la RPC de crear ── */
  DB.existe = { variedad_cod:"A0149", nombre:"Arrocillo Medio · Selectado · Natural · Humano · Especial" };
  DB.rpcCalls = [];
  let r = await run(`window.__resolver(${JSON.stringify(V)})`);
  comprobar("resolver: si la variante viva ya existe, la usa (creada:false)", r.ok === true && r.cod === "A0149" && r.creada === false);
  comprobar("resolver: al existir, NO llama a arrocillo_crear_variante", DB.rpcCalls.filter(c=>c.fn==="arrocillo_crear_variante").length === 0);

  /* ── 5 · resolver: no existe → crea con la RPC ── */
  DB.existe = null; DB.rpcCalls = [];
  DB.rpc["arrocillo_crear_variante"] = (p) => ({ data:{ ok:true, variedad_cod:"A0150", nombre:"Arrocillo "+[p.p_tipo,p.p_proceso,p.p_estado,p.p_destino,p.p_calidad].join(" · "), activo:true }, error:null });
  r = await run(`window.__resolver(${JSON.stringify(V)})`);
  comprobar("resolver: si no existe, la crea con la RPC (creada:true, cod nuevo)", r.ok === true && r.cod === "A0150" && r.creada === true);
  comprobar("resolver: pasó los 5 parámetros p_* a la RPC", (()=>{ const c=DB.rpcCalls.find(x=>x.fn==="arrocillo_crear_variante"); return c && c.params.p_tipo==="Medio" && c.params.p_calidad==="Especial"; })());

  /* ── 6 · resolver: la RPC responde duplicado (ok:false) → error tal cual ── */
  DB.existe = null; DB.rpc["arrocillo_crear_variante"] = () => ({ data:{ ok:false, error:"La variante ya existe." }, error:null });
  r = await run(`window.__resolver(${JSON.stringify(V)})`);
  comprobar("resolver: si la RPC rechaza (duplicado), devuelve ok:false con el mensaje", r.ok === false && /ya existe/i.test(r.error));

  /* ── 7 · AdminArrocillo: no-Freelance no ve el panel ── */
  run(`window.__render([], { rol:"Vendedor" }, function(){})`); await esperar();
  comprobar("AdminArrocillo: un rol que NO es Freelance no ve el panel (null)", run(`window.__txt()`).indexOf("Variantes de arrocillo") < 0);

  /* ── 8 · AdminArrocillo (Freelance): lista activas e inactivas ── */
  const VARS = [
    { variedad_cod:"A0149", familia_cod:"A01", nombre:"Arrocillo A", activo:true },
    { variedad_cod:"A0150", familia_cod:"A01", nombre:"Arrocillo B", activo:false },
    { variedad_cod:"C0901", familia_cod:"C09", nombre:"Grano corriente económico", activo:true },
  ];
  run(`window.__render(${JSON.stringify(VARS)}, { rol:"Freelance" }, function(){})`); await esperar();
  run(`window.__clickEl("Variantes de arrocillo")`); await esperar(); run(`window.__flush()`);
  let t = run(`window.__txt()`);
  comprobar("AdminArrocillo (Freelance): lista las variantes A01 activas e inactivas", t.indexOf("Arrocillo A")>=0 && t.indexOf("Arrocillo B")>=0);
  comprobar("AdminArrocillo: NO mezcla el arroz normal (C09) en la lista de arrocillo", t.indexOf("Grano corriente económico") < 0);
  comprobar("AdminArrocillo: marca la inactiva como «no aparece al clasificar»", /no aparece al clasificar/i.test(t));

  /* ── 9 · AdminArrocillo: crear una variante llama la RPC y recarga ── */
  let recargado = 0; w.__recargar = () => { recargado++; };
  DB.rpcCalls = []; DB.rpc["arrocillo_crear_variante"] = (p) => ({ data:{ ok:true, variedad_cod:"A0151", nombre:"Arrocillo nuevo", activo:true }, error:null });
  run(`window.__render(${JSON.stringify(VARS)}, { rol:"Freelance" }, function(){ window.__recargado=(window.__recargado||0)+1; })`); await esperar();
  run(`window.__clickEl("Variantes de arrocillo")`); await esperar(); run(`window.__flush()`);
  run(`window.__click("Agregar variante")`); await esperar(); run(`window.__flush()`);
  const ns = run(`window.__nsel()`);
  comprobar("AdminArrocillo: «Agregar variante» abre exactamente los 5 desplegables", ns === 5);
  run(`window.__setSel(0,"Medio")`); run(`window.__setSel(1,"Selectado")`); run(`window.__setSel(2,"Natural")`); run(`window.__setSel(3,"Humano")`); run(`window.__setSel(4,"Especial")`); await esperar(); run(`window.__flush()`);
  run(`window.__click("Crear variante")`); await esperar(60); run(`window.__flush()`);
  comprobar("AdminArrocillo: crear llama a arrocillo_crear_variante", DB.rpcCalls.filter(c=>c.fn==="arrocillo_crear_variante").length === 1);
  comprobar("AdminArrocillo: tras crear, recarga la lista", run(`window.__recargado`) >= 1);

  console.log("Resultado de arrocillo: " + ok + " ✓ · " + mal + " ✗ · " + (ok+mal) + " comprobaciones");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.stack || e).split("\n").slice(0,5).join("\n")); process.exit(1); });
