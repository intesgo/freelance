/* Prueba de que la barra de la piladora lee del sistema (Decidir y Precios).
   Corre contra el bundle real de proveedor-freelance.html en jsdom. */
const fs=require("fs"), vm=require("vm");
const { JSDOM } = require("jsdom");
const Babel=require("./rutas").Babel;

const ruta = require("./rutas").app("proveedor-freelance");
const html=fs.readFileSync(ruta,"utf-8");
const jsx=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js=Babel.transform(jsx,{presets:["react"]}).code;
const react=require("./rutas").react();
const reactDom=require("./rutas").reactDom();

let ok=0, mal=0;
const comprobar=(t,c)=>{ if(c){ok++;console.log("  ✓ "+t);} else {mal++;console.log("  ✗ "+t);} };

const FIX=(provCod)=>({
  usuarios:[{usr_id:"PRV-AGU",nombre:"Piladora San Agustín",rol:"proveedor",prov_cod:provCod}],
  pedidos:[
    {ped_id:"PD-0010",cli_id:"CLI-D01",prov_cod:"AGU",estado:"enviado_proveedor",factura:null,
     condicion:"credito",creado:"2026-07-10T06:38:39+00:00",es_demo:true},
    {ped_id:"PD-0099",cli_id:"CLI-D02",prov_cod:"ROS",estado:"enviado_proveedor",factura:null,
     condicion:"contado",creado:"2026-07-11T06:38:39+00:00",es_demo:true}],
  pedido_items:[{ped_id:"PD-0010",descripcion:"Arroz Conejo · Quintal",cantidad_qq:120,precio_usd:43},
                {ped_id:"PD-0099",descripcion:"Arroz Bomba · Quintal",cantidad_qq:60,precio_usd:45}],
  clientes:[{cli_id:"CLI-D01",nombre:"Comercial Nilo"},{cli_id:"CLI-D02",nombre:"Almacenes Fernando"}],
  solicitudes:[{sol_id:"SL-0003",tipo:"credito",origen_id:"FRL-RR",destino:"proveedor",prov_cod:"AGU",
     cli_id:null,detalle:"Ampliar crédito de $20.000 a $30.000",estado:"pendiente",motivo_resp:null,
     creado:"2026-07-08T10:00:00+00:00",es_demo:true}],
  v_ofertas_vigentes:[   /* la app lee la vista: solo lo que rige hoy */
    {oferta_id:"P-00017-QQ-AGU",prod_id:"P-00017",pres_cod:"QQ",presentacion:"Quintal",equiv_qq:1,
     prov_cod:"AGU",costo:29,precio_contado:35,precio_credito:36,activo:true,es_demo:false},
    {oferta_id:"P-00018-QQ-ROS",prod_id:"P-00018",pres_cod:"QQ",presentacion:"Quintal",equiv_qq:1,
     prov_cod:"ROS",costo:31,precio_contado:38,precio_credito:39,activo:true,es_demo:false}],
  productos:[{prod_id:"P-00017",nombre:"Arroz Super Capirona"},{prod_id:"P-00018",nombre:"Arroz Dallis"}],
});

function montar(conDatos, provCod){
  const FX=FIX(provCod===undefined?"AGU":provCod);
  const dom=new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w=dom.window;
  w.matchMedia=w.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  w.scrollTo=()=>{}; w.open=()=>null; w.print=()=>{}; w.navigator.vibrate=()=>{};
  w.speechSynthesis={speak(){},cancel(){},getVoices:()=>[]};
  w.Notification=function(){}; w.Notification.permission="denied"; w.Notification.requestPermission=async()=>"denied";
  const escrituras=[];
  const tabla=(n)=>{
    const datos = conDatos ? (FX[n]||[]) : [];
    const p=Promise.resolve({data:datos,error:null,count:0});
    ["select","eq","neq","in","order","limit","like","not","is","gte","lte"].forEach(m=>{ p[m]=()=>tabla(n); });
    p.maybeSingle=()=>Promise.resolve({data:datos[0]||null,error:null});
    p.single=p.maybeSingle;
    p.insert=(f)=>{ escrituras.push({t:n,op:"insert",f}); return Promise.resolve({data:null,error:null}); };
    p.upsert=(f)=>{ escrituras.push({t:n,op:"upsert",f}); return Promise.resolve({data:null,error:null}); };
    p.update=(f)=>{ escrituras.push({t:n,op:"update",f}); const q=Promise.resolve({data:null,error:null});
      ["eq","in","is"].forEach(m=>{q[m]=()=>q;}); return q; };
    p.delete=()=>{ const q=Promise.resolve({data:null,error:null}); q.eq=()=>q; return q; };
    return p;
  };
  w.SB={ auth:{ getSession:async()=>(conDatos?{data:{session:{user:{id:"auth-p",email:"piladora@ejemplo.com"}}}}:{data:{session:null}}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
    from:(n)=>tabla(n), rpc:async()=>({data:null}),
    channel:()=>({ on(){return this;}, subscribe(){return this;} }), removeChannel:()=>{},
    functions:{ invoke:async()=>({data:{enviados:0},error:null}) },
    storage:{ from:()=>({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) } };
  const ctx=dom.getInternalVMContext();
  vm.runInContext(react,ctx); vm.runInContext(reactDom,ctx); vm.runInContext(js,ctx);
  return { ctx, escrituras };
}

const guion=(lab)=>`(async()=>{
  var cont=document.createElement("div"); document.body.appendChild(cont);
  ReactDOM.flushSync(function(){ ReactDOM.createRoot(cont).render(React.createElement(App,{
    usuario:{nombre:"Piladora San Agustín",rol:"proveedor",real:true}, onSalir:function(){}, toast:function(){} })); });
  var esperar=function(ms){ return new Promise(function(r){ setTimeout(r,ms||60); }); };
  await esperar(260);
  var bs=cont.querySelectorAll(".nav button");
  for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(${JSON.stringify(lab)})>=0){ bs[i].click(); break; } }
  await esperar(260);
  return cont.textContent;
})()`;

(async()=>{
  console.log("═══ proveedor-freelance.html · con datos del sistema");
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Decidir"), m.ctx);
    comprobar("Decidir con sello de datos vivos", /🟢 Datos vivos/.test(t));
    comprobar("aparece el pedido por facturar de tu piladora", t.indexOf("Comercial Nilo")>=0);
    comprobar("NO aparece el pedido de otra piladora", t.indexOf("Almacenes Fernando")<0);
    comprobar("el detalle se arma con los quintales", t.indexOf("120 qq")>=0);
    comprobar("aparece la solicitud del freelance", t.indexOf("Ampliar crédito")>=0);
    comprobar("con su tipo en lenguaje del negocio", t.indexOf("Ampliación de crédito")>=0);
    comprobar("ya no se ve el pedido de ejemplo (Distribuidora Ríos)", t.indexOf("Distribuidora Ríos")<0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Precios"), m.ctx);
    comprobar("Precios con sello de datos vivos", /Precios\s*🟢 Datos vivos/.test(t));
    comprobar("aparece tu producto de verdad", t.indexOf("Arroz Super Capirona")>=0);
    comprobar("NO aparece el de otra piladora", t.indexOf("Arroz Dallis")<0);
    comprobar("ya no se ve el catálogo de ejemplo", t.indexOf("Arroz Conejo Economico")<0);
  }
  {
    const m=montar(true);
    const g=await vm.runInContext(`(async()=>{
      var cont=document.createElement("div"); document.body.appendChild(cont);
      ReactDOM.flushSync(function(){ ReactDOM.createRoot(cont).render(React.createElement(App,{
        usuario:{nombre:"Piladora",rol:"proveedor",real:true}, onSalir:function(){}, toast:function(){} })); });
      await new Promise(function(r){ setTimeout(r,300); });
      var bs=cont.querySelectorAll(".nav button"); var out="";
      for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf("Decidir")>=0){
        var b=bs[i].querySelector(".badge"); out = b? b.textContent : "0"; } }
      return out;
    })()`, m.ctx);
    comprobar("el globo de Decidir cuenta lo real (1 factura + 1 solicitud = 2)", g==="2");
  }
  console.log("═══ el freelance (sin piladora asignada) ve todo");
  {
    const m=montar(true,null);
    const t=await vm.runInContext(guion("Precios"), m.ctx);
    comprobar("sin piladora asignada entran los dos productos", t.indexOf("Arroz Super Capirona")>=0 && t.indexOf("Arroz Dallis")>=0);
  }
  console.log("═══ sin sesión");
  {
    const m=montar(false);
    const t=await vm.runInContext(guion("Decidir"), m.ctx);
    comprobar("sin datos sigue la demostración", /⚪ Demostración/.test(t) && t.indexOf("Distribuidora Ríos")>=0);
  }
  console.log("═══ lo que se decide, se guarda");
  {
    const m=montar(true);
    const r=await vm.runInContext(`(async()=>{
      var a=await guardarFactura("PD-0010","001-001-0004999");
      var b=await responderSolicitud("SL-0003","rechazada","No hay cupo este mes");
      return JSON.stringify({a:a,b:b});
    })()`, m.ctx);
    const ped=m.escrituras.find(x=>x.t==="pedidos"&&x.op==="update");
    const sol=m.escrituras.find(x=>x.t==="solicitudes"&&x.op==="update");
    comprobar("facturar guarda el número y el estado en el pedido",
      !!ped && ped.f.factura==="001-001-0004999" && ped.f.estado==="facturado");
    comprobar("y también el estado comercial", !!ped && ped.f.estado_comercial==="facturado");
    comprobar("rechazar una solicitud guarda el motivo",
      !!sol && sol.f.estado==="rechazada" && sol.f.motivo_resp==="No hay cupo este mes");
    comprobar("con su fecha de resolución", !!sol && !!sol.f.resuelto_en);
    const res=JSON.parse(r);
    comprobar("las dos escrituras responden que sí", res.a===true && res.b===true);
  }
  console.log("Resultado proveedor: "+ok+" ✓ · "+mal+" ✗");
  process.exit(mal?1:0);
})().catch(e=>{ console.log("✗ "+String(e&&e.stack||e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
