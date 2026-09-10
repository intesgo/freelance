#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   DISENO_PRECIO_ADICIONAL · un solo editor por MARCA (Precios · «Por marca»).
   El QUINTAL es la base (4 campos); las demás presentaciones se capturan como
   dos «adicionales» en $/quintal (al costo y a la base) y su precio se calcula:
       precio = (precio_del_quintal + adicional) × equiv_qq
   Un solo Editar / Cancelar / Guardar por marca. Los adicionales NO se guardan:
   se derivan al abrir. Render contra un doble de Supabase (no escribe en la base).
   Uso: node test_precio_adicional.js [ruta.html]
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
const esperar = (ms) => new Promise(r => setTimeout(r, ms || 40));
console.log("═══ DISENO_PRECIO_ADICIONAL · " + ruta.split("/").pop());

/* ── datos del doble ── */
const OFERTAS = [
  { oferta_id:"OF-QQ", prod_id:"P-1", pres_cod:"QQ", presentacion:"Quintal",     equiv_qq:1,    prov_cod:"PROV-1", costo:18, costo_contado:17, precio_contado:19, precio_credito:20, margen_min:8, vigente_desde:"2020-01-01", vigente_hasta:null },
  { oferta_id:"OF-AR", prod_id:"P-1", pres_cod:"AR", presentacion:"Arroba",      equiv_qq:0.25, prov_cod:"PROV-1", costo:4.5, costo_contado:4.25, precio_contado:4.75, precio_credito:5.0, margen_min:8, vigente_desde:"2020-01-01", vigente_hasta:null },
  { oferta_id:"OF-FU", prod_id:"P-1", pres_cod:"FU", presentacion:"Funda 10 lb", equiv_qq:0.1,  prov_cod:"PROV-1", costo:1.8, costo_contado:1.7, precio_contado:2.0, precio_credito:2.1, margen_min:8, vigente_desde:"2020-01-01", vigente_hasta:null },
];
const PRODS = [{ prod_id:"P-1", nombre:"Arrocillo Envejecido", marca:"Arrocillo Envejecido", linea:"Arroz", tipo_grano:"" }];
const PROVS = [{ prov_cod:"PROV-1", nombre:"Piladora Uno" }];
function filasDe(t){ if(t==="v_ofertas_vigentes")return OFERTAS; if(t==="productos")return PRODS; if(t==="proveedores")return PROVS; return []; }

const DB = { auditoria:[], ofUpd:[], ofIns:[] };
function montar(rol){
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.scrollTo = () => {}; w.alert = () => {};
  function chain(tabla){
    const enc = { select:()=>enc, eq:()=>enc, in:()=>enc, order:()=>enc, limit:()=>enc, is:()=>enc, not:()=>enc, gte:()=>enc, lte:()=>enc,
      then:(a,b)=>Promise.resolve({ data:filasDe(tabla), error:null }).then(a,b),
      maybeSingle:()=>Promise.resolve({ data:(filasDe(tabla)[0]||null), error:null }),
      single:()=>Promise.resolve({ data:(filasDe(tabla)[0]||null), error:null }),
      insert:(row)=>{ if(tabla==="auditoria") DB.auditoria.push(row); else if(tabla==="ofertas_piladora") DB.ofIns.push(row); return Promise.resolve({ error:null }); },
      update:(val)=>{ const p=Promise.resolve({ error:null }); p.eq=()=>{ if(tabla==="ofertas_piladora") DB.ofUpd.push(val); return Promise.resolve({ error:null }); }; return p; },
      delete:()=>({ eq:()=>Promise.resolve({ error:null }) }),
    };
    return enc;
  }
  w.supa = {
    from:(t)=>chain(t),
    rpc: async (fn)=>({ data: fn==="mi_org_activa"?"ORG-001":null, error:null }),
    auth:{ getSession: async()=>({ data:{ session:{ user:{ id:"u1", email:"intesgo@gmail.com" } } } }),
      onAuthStateChange:()=>({ data:{ subscription:{ unsubscribe(){} } } }) },
  };
  const ctx = dom.getInternalVMContext();
  vm.runInContext(R.reactDev(), ctx); vm.runInContext(R.reactDomDev(), ctx); vm.runInContext(js, ctx);
  vm.runInContext(`
    window.__c = document.createElement("div"); document.body.appendChild(window.__c);
    ReactDOM.flushSync(function(){ ReactDOM.createRoot(window.__c).render(React.createElement(PiladorasWeb, { usuario:{ rol:${JSON.stringify(rol)}, nombre:"Test" } })); });
    window.__flush=function(){ ReactDOM.flushSync(function(){}); };
    window.__txt=function(){ return (window.__c&&window.__c.textContent)||""; };
    window.__clickText=function(sub){ var all=window.__c.querySelectorAll("*"); var mejor=null; for(var i=0;i<all.length;i++){ var tx=all[i].textContent||""; if(tx.indexOf(sub)>=0 && (mejor===null||tx.length<(mejor.textContent||"").length)) mejor=all[i]; } if(mejor){ mejor.dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } return false; };
    window.__clickSel=function(sel){ var el=window.__c.querySelector(sel); if(!el) return false; el.dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; };
    window.__count=function(sel){ return window.__c.querySelectorAll(sel).length; };
    window.__btnCount=function(sub){ var b=window.__c.querySelectorAll("button"); var n=0; for(var i=0;i<b.length;i++){ if((b[i].textContent||"").indexOf(sub)>=0) n++; } return n; };
    var setV=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
    window.__set=function(sel,val){ var el=window.__c.querySelector(sel); if(!el) return false; setV.call(el,String(val)); el.dispatchEvent(new window.Event("input",{bubbles:true})); return true; };
    window.__val=function(sel){ var el=window.__c.querySelector(sel); return el?el.value:null; };
    window.__calc=function(pres,campo){ var el=window.__c.querySelector('[data-pres="'+pres+'"] [data-calc="'+campo+'"]'); return el?(el.textContent||"").trim():null; };
    window.__adic=function(pres,campo){ var el=window.__c.querySelector('[data-pres="'+pres+'"] input[data-adic="'+campo+'"]'); return el?el.value:null; };
    window.__nInputsPres=function(pres){ return window.__c.querySelectorAll('[data-pres="'+pres+'"] input').length; };
  `, ctx);
  return ctx;
}
const run=(ctx,e)=>vm.runInContext(e,ctx);

(async ()=>{
  /* ── render, seleccionar piladora, abrir la marca ── */
  const ctx = montar("Freelance");
  await esperar(220); run(ctx,`window.__flush()`);
  run(ctx,`window.__clickText("Piladora Uno")`); await esperar(160); run(ctx,`window.__flush()`);
  run(ctx,`window.__clickText("Créd. costo–base")`); await esperar(120); run(ctx,`window.__flush()`);  /* despliega la marca */

  comprobar("1 · hay UN solo botón «Editar» por marca (no uno por presentación)",
    run(ctx,`window.__count('button[data-editar-marca]')`)===1 && run(ctx,`window.__btnCount("Editar")`)===1);

  run(ctx,`window.__clickSel('button[data-editar-marca]')`); await esperar(120); run(ctx,`window.__flush()`);

  comprobar("2 · en edición hay UN solo «Cancelar» y UN solo «Guardar»",
    run(ctx,`window.__btnCount("Cancelar")`)===1 && run(ctx,`window.__btnCount("Guardar")`)===1);
  comprobar("3 · el quintal muestra los CUATRO campos de precio",
    run(ctx,`window.__count('input[data-q]')`)===4);
  comprobar("4 · las demás presentaciones muestran DOS «adicional» y NINGÚN campo de precio del quintal",
    run(ctx,`window.__nInputsPres("AR")`)===2 && run(ctx,`window.__count('[data-pres="AR"] input[data-q]')`)===0 &&
    /Adicional al costo/.test(run(ctx,`window.__txt()`)) && /Adicional a la base/.test(run(ctx,`window.__txt()`)));
  comprobar("9 · al abrir, una presentación SIN recargo (arroba) arranca en 0 y 0",
    run(ctx,`window.__adic("AR","costo")`)==="0" && run(ctx,`window.__adic("AR","base")`)==="0");
  comprobar("10 · una funda con +$1 SOLO en la base arranca con adicional al costo 0 y a la base 1",
    run(ctx,`window.__adic("FU","costo")`)==="0" && run(ctx,`window.__adic("FU","base")`)==="1");
  comprobar("5 · quintal costo créd 18 · arroba equiv 0,25 · adicional 0 → arroba costo créd $4,50",
    run(ctx,`window.__calc("AR","costoCred")`)==="$4,50");

  /* 6 · adicional al costo 1 → 4,75 */
  run(ctx,`window.__set('[data-pres="AR"] input[data-adic="costo"]','1')`); await esperar(60); run(ctx,`window.__flush()`);
  comprobar("6 · con adicional al costo 1, la arroba costo créd calcula $4,75",
    run(ctx,`window.__calc("AR","costoCred")`)==="$4,75");
  comprobar("8 · el adicional al costo NO mueve la base (base créd sigue $5,00)",
    run(ctx,`window.__calc("AR","baseCred")`)==="$5,00");
  /* 8b · el adicional a la base NO mueve el costo */
  run(ctx,`window.__set('[data-pres="AR"] input[data-adic="base"]','2')`); await esperar(60); run(ctx,`window.__flush()`);
  comprobar("8 · el adicional a la base NO mueve el costo (costo créd sigue $4,75)",
    run(ctx,`window.__calc("AR","costoCred")`)==="$4,75");

  /* 7 · adicional NEGATIVO baja el precio */
  run(ctx,`window.__set('[data-pres="AR"] input[data-adic="costo"]','-1')`); await esperar(60); run(ctx,`window.__flush()`);
  comprobar("7 · un adicional NEGATIVO baja el precio (arroba costo créd $4,25 con −1)",
    run(ctx,`window.__calc("AR","costoCred")`)==="$4,25");

  /* 16 · cambiar solo el quintal recalcula las demás conservando su adicional */
  run(ctx,`window.__set('[data-pres="AR"] input[data-adic="costo"]','0')`); await esperar(40);
  run(ctx,`window.__set('[data-pres="AR"] input[data-adic="base"]','0')`); await esperar(40); run(ctx,`window.__flush()`);
  run(ctx,`window.__set('input[data-q="costoCred"]','20')`); await esperar(60); run(ctx,`window.__flush()`);
  comprobar("16 · cambiar solo el quintal recalcula las demás conservando su adicional (arroba costo créd $5,00)",
    run(ctx,`window.__calc("AR","costoCred")`)==="$5,00");

  comprobar("11 · el «Antes → Ahora» es UNO solo para toda la marca",
    (run(ctx,`window.__txt()`).split("Antes → Ahora").length-1)===1);

  /* 18 · atajo Base = Costo + 12% sobre el quintal (costo créd = 20 → base créd 22,40) */
  run(ctx,`window.__clickText("Base = Costo +")`); await esperar(60); run(ctx,`window.__flush()`);
  comprobar("18 · «Base = Costo + 12%» funciona sobre el quintal (base créd = 22.4)",
    run(ctx,`window.__val('input[data-q="baseCred"]')`)==="22.4");

  /* 17 · rol distinto de Freelance no pinta ningún «Editar» */
  const ctx2 = montar("Contadora");
  await esperar(220); run(ctx2,`window.__flush()`);
  run(ctx2,`window.__clickText("Piladora Uno")`); await esperar(160); run(ctx2,`window.__flush()`);
  run(ctx2,`window.__clickText("Créd. costo–base")`); await esperar(120); run(ctx2,`window.__flush()`);
  comprobar("17 · con rol distinto de Freelance NO se pinta ningún «Editar»",
    run(ctx2,`window.__count('button[data-editar-marca]')`)===0 && run(ctx2,`window.__btnCount("Editar")`)===0);

  /* ── 12 · guardar escribe SOLO las presentaciones que cambian ── */
  const ctxA = montar("Freelance");
  await esperar(220); run(ctxA,`window.__flush()`);
  run(ctxA,`window.__clickText("Piladora Uno")`); await esperar(160); run(ctxA,`window.__flush()`);
  run(ctxA,`window.__clickText("Créd. costo–base")`); await esperar(120); run(ctxA,`window.__flush()`);
  run(ctxA,`window.__clickSel('button[data-editar-marca]')`); await esperar(120); run(ctxA,`window.__flush()`);
  DB.auditoria.length=0; DB.ofUpd.length=0; DB.ofIns.length=0;
  run(ctxA,`window.__set('[data-pres="AR"] input[data-adic="costo"]','1')`); await esperar(60); run(ctxA,`window.__flush()`);  /* solo la arroba cambia */
  run(ctxA,`window.__clickText("Guardar")`); await esperar(220); run(ctxA,`window.__flush()`);
  comprobar("12 · Guardar escribe SOLO las presentaciones que cambian (1 sola: la arroba)",
    DB.auditoria.length===1 && DB.auditoria[0].registro_id==="OF-AR");
  comprobar("14 · la operación auditada es «Costo/Base por marca»",
    DB.auditoria.length>0 && DB.auditoria.every(a=>a.operacion==="Costo/Base por marca"));
  comprobar("15 · la escritura pasó por versionarOfertaWeb (cerró la vigente + insertó nueva)",
    DB.ofUpd.length===1 && DB.ofIns.length===1);

  /* ── 13 · varias presentaciones → un solo código de auditoría ── */
  const ctxB = montar("Freelance");
  await esperar(220); run(ctxB,`window.__flush()`);
  run(ctxB,`window.__clickText("Piladora Uno")`); await esperar(160); run(ctxB,`window.__flush()`);
  run(ctxB,`window.__clickText("Créd. costo–base")`); await esperar(120); run(ctxB,`window.__flush()`);
  run(ctxB,`window.__clickSel('button[data-editar-marca]')`); await esperar(120); run(ctxB,`window.__flush()`);
  DB.auditoria.length=0;
  run(ctxB,`window.__set('input[data-q="costoCred"]','19')`); await esperar(60); run(ctxB,`window.__flush()`);  /* el quintal mueve a todas */
  run(ctxB,`window.__clickText("Guardar")`); await esperar(260); run(ctxB,`window.__flush()`);
  comprobar("13 · todas las escrituras de la marca comparten el MISMO código de auditoría",
    DB.auditoria.length>=2 && new Set(DB.auditoria.map(a=>a.codigo)).size===1);

  console.log("Resultado de precio-adicional: " + ok + " ✓ · " + mal + " ✗ · " + (ok+mal) + " comprobaciones");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.stack || e).split("\n").slice(0,5).join("\n")); process.exit(1); });
