/* Prueba de que los 4 módulos de la barra inferior leen del sistema (b365).
   Corre contra el bundle real de fc en jsdom. Los datos del fixture son filas
   REALES copiadas de la base, para que el mapeo se pruebe con lo que hay. */
const fs=require("fs"), vm=require("vm");
const { JSDOM } = require("jsdom");
const Babel=require("./rutas").Babel;

const ruta=require("./rutas").app("freelance-completo");
const html=fs.readFileSync(ruta,"utf-8");
const jsx=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js=Babel.transform(jsx,{presets:["react"]}).code;
const react=require("./rutas").react();
const reactDom=require("./rutas").reactDom();

let ok=0, mal=0;
const comprobar=(t,c)=>{ if(c){ok++;console.log("  ✓ "+t);} else {mal++;console.log("  ✗ "+t);} };

const AYER=new Date(Date.now()-86400000).toISOString().slice(0,10);
const FIX={
  usuarios:[{usr_id:"FRL-RR",nombre:"Richard Ramírez",rol:"freelance"},
            {usr_id:"SC-D1",nombre:"Luis Paredes",rol:"comisionista"},
            {usr_id:"FRL-01",nombre:"Daniel Ríos",rol:"freelance"}],
  pedidos:[
    {ped_id:"PD-0010",cli_id:"CLI-D01",prov_cod:"PROV-A",ciudad:"Riobamba",estado:"enviado_proveedor",
     factura:null,condicion:"credito",creado:"2026-07-10T06:38:39.654043+00:00",es_demo:true},
    {ped_id:"PED-D1",cli_id:"CLI-D1",prov_cod:"AGU",ciudad:"Riobamba",estado:"facturado",
     factura:"F-DEMO-001",condicion:"credito",creado:"2026-07-24T19:04:30.885486+00:00",es_demo:true},
    {ped_id:"PD-0004",cli_id:"CLI-D01",prov_cod:"PROV-A",ciudad:"Riobamba",estado:"despachado",
     factura:"001-001-0004521",condicion:"credito",creado:"2026-07-10T06:38:39.654043+00:00",es_demo:true}],
  pedido_items:[
    {ped_id:"PED-D1",descripcion:"Arroz Super Capirona · Quintal",cantidad_qq:10.00,precio_usd:40.00},
    {ped_id:"PED-D1",descripcion:"Arroz Chifa Economico · Quintal",cantidad_qq:5.00,precio_usd:22.50}],
  clientes:[{cli_id:"CLI-D01",nombre:"Comercial Nilo"},{cli_id:"CLI-D1",nombre:"Tienda Demo El Ensayo"},
            {cli_id:"CLI-D02",nombre:"Almacenes Fernando"}],
  proveedores:[{prov_cod:"PROV-A",nombre:"Agrícola del Valle"},{prov_cod:"AGU",nombre:"Piladora San Agustín"}],
  comisiones:[{ped_id:"PED-D1",monto:22.50,estado:"Generada"},{ped_id:"PD-0004",monto:88.00,estado:"Pagada"}],
  solicitudes:[
    {sol_id:"SOL-D1",tipo:"cupo",origen_id:"SC-D1",destino:"freelance",prov_cod:null,cli_id:"CLI-D1",
     detalle:"Subir cupo de la tienda demo a 800 · demo",estado:"pendiente",motivo_resp:null,
     creado:"2026-07-24T19:04:30.885486+00:00",resuelto_en:null,es_demo:true},
    {sol_id:"SL-0001",tipo:"devolucion",origen_id:"FRL-RR",destino:"proveedor",prov_cod:"PROV-A",cli_id:null,
     detalle:"Devolución de 5 qq por humedad alta",estado:"rechazada",
     motivo_resp:"El lote salió aprobado en calidad",creado:"2026-07-10T06:38:39+00:00",
     resuelto_en:"2026-07-10T06:38:39+00:00",es_demo:true}],
  novedades:[
    {nov_id:"NV-0001",cli_id:"CLI-D01",tipo:"descuento",detalle:"NC por descuento $0.50/qq",
     estado:"aprobada",origen:"comercial",monto:50,factura:"001-001-0004521",
     creado:"2026-07-20T10:00:00+00:00",es_demo:false},
    {nov_id:"NV-0002",cli_id:"CLI-D02",tipo:"producto",detalle:"3 sacos mojados en la descarga",
     estado:"abierta",origen:"entrega",creado:"2026-07-22T15:00:00+00:00",es_demo:false}],
  agenda_actividades:[
    {act_id:"AG-1",usr_id:"FRL-RR",cli_id:"CLI-D01",cliente:"Comercial Nilo",fecha:new Date().toISOString().slice(0,10),
     hora:"09:00",tipo:"Visita",objetivo:"Tomar pedido de arroz",ubic:"Riobamba, Centro",dur:30,
     recordatorio:15,estado:"pendiente"}],
  cartera_cliente:[{mov_id:"MOV-D6",cli_id:"CLI-D02",doc:"F-4489",vence:AYER,monto:1000.00,estado:"pendiente"}],
  ubicaciones_cliente:[{cli_id:"CLI-D02",ciudad:"Riobamba",barrio:"La Merced",principal:true}],
};

function montar(conDatos){
  const dom=new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w=dom.window;
  w.matchMedia=w.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  w.scrollTo=()=>{}; w.open=()=>null; w.print=()=>{}; w.navigator.vibrate=()=>{};
  w.speechSynthesis={speak(){},cancel(){},getVoices:()=>[]};
  w.Notification=function(){}; w.Notification.permission="denied"; w.Notification.requestPermission=async()=>"denied";
  const escrituras=[];
  const tabla=(n)=>{
    const datos = conDatos ? (FIX[n]||[]) : [];
    const p=Promise.resolve({data:datos,error:null});
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
  w.SB={ auth:{ getSession:async()=>(conDatos?{data:{session:{user:{id:"auth-rr",email:"intesgo@gmail.com"}}}}:{data:{session:null}}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
    from:(n)=>tabla(n), rpc:async()=>({data:null}),
    channel:()=>({ on(){return this;}, subscribe(){return this;} }), removeChannel:()=>{},
    functions:{ invoke:async()=>({data:{enviados:0},error:null}) },
    storage:{ from:()=>({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) } };
  const ctx=dom.getInternalVMContext();
  vm.runInContext(react,ctx); vm.runInContext(reactDom,ctx); vm.runInContext(js,ctx);
  return { ctx, w, escrituras };
}

const guion=(tab)=>`(async()=>{
  var cont=document.createElement("div"); document.body.appendChild(cont);
  var raiz=ReactDOM.createRoot(cont);
  ReactDOM.flushSync(function(){
    raiz.render(React.createElement(App,{ usuario:{nombre:"Richard Ramírez",codigo:"FRL-RR",rol:"freelance",real:true},
      onSalir:function(){}, toast:function(){} }));
  });
  var esperar=function(ms){ return new Promise(function(r){ setTimeout(r,ms||60); }); };
  await esperar(120);
  var ir=function(nombre){
    var bs=cont.querySelectorAll(".nav button");
    for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(nombre)>=0){ bs[i].click(); return true; } }
    return false;
  };
  ir(${JSON.stringify(tab)});
  await esperar(120);
  return cont.textContent;
})()`;

(async()=>{
  console.log("═══ CON datos del sistema");
  {
    const m=montar(true);
    const pedidos=await vm.runInContext(guion("Mis pedidos"), m.ctx);
    comprobar("Mis pedidos muestra el sello de datos vivos", /Mis pedidos\s*🟢 Datos vivos/.test(pedidos));
    comprobar("Mis pedidos trae clientes de verdad (Comercial Nilo)", pedidos.indexOf("Comercial Nilo")>=0);
    comprobar("Mis pedidos ya no muestra el ejemplo (Comercial Mendoza)", pedidos.indexOf("Comercial Mendoza")<0);
    comprobar("el estado guardado se traduce al del negocio", pedidos.indexOf("Enviado al proveedor")>=0);
    comprobar("el proveedor sale por su nombre", pedidos.indexOf("Agrícola del Valle")>=0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Solicitudes"), m.ctx);
    comprobar("Solicitudes muestra el sello de datos vivos", /Solicitudes\s*🟢 Datos vivos/.test(t));
    comprobar("la solicitud recibida viene de la base", t.indexOf("SOL-D1")>=0 && t.indexOf("Tienda Demo El Ensayo")>=0);
    comprobar("se ve quién la pidió (del padrón de usuarios)", t.indexOf("Luis Paredes")>=0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Novedades"), m.ctx);
    comprobar("Novedades muestra el sello de datos vivos", /Novedades\s*🟢 Datos vivos/.test(t));
    comprobar("el reclamo comercial guardado aparece", t.indexOf("NC por descuento")>=0);
    comprobar("la novedad de entrega también (una sola tabla)", t.indexOf("mojados en la descarga")>=0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Agenda"), m.ctx);
    comprobar("Agenda muestra el sello de datos vivos", /Agenda\s*🟢 Datos vivos/.test(t));
    comprobar("la actividad programada aparece", t.indexOf("Tomar pedido de arroz")>=0);
    comprobar("sugiere el cobro de la factura vencida", t.indexOf("Sugerido · cobrar F-4489")>=0);
    comprobar("la sugerencia sale con el cliente correcto", t.indexOf("Almacenes Fernando")>=0);
  }
  {
    /* los globos de la barra cuentan lo que hay de verdad */
    const m=montar(true);
    const t=await vm.runInContext(`(async()=>{
      var cont=document.createElement("div"); document.body.appendChild(cont);
      ReactDOM.flushSync(function(){ ReactDOM.createRoot(cont).render(React.createElement(App,{
        usuario:{nombre:"Richard Ramírez",codigo:"FRL-RR",rol:"freelance",real:true}, onSalir:function(){}, toast:function(){} })); });
      await new Promise(function(r){ setTimeout(r,150); });
      var out={};
      var bs=cont.querySelectorAll(".nav button");
      for(var i=0;i<bs.length;i++){ var b=bs[i]; var g=b.querySelector(".badge");
        out[(b.textContent||"").replace(/[0-9]/g,"").trim()] = g? g.textContent : "0"; }
      return JSON.stringify(out);
    })()`, m.ctx);
    const g=JSON.parse(t);
    comprobar("el globo de Solicitudes cuenta la pendiente real (1)", g["Solicitudes"]==="1");
    comprobar("el globo de Novedades cuenta la respuesta recibida (1)", g["Novedades"]==="1");
    comprobar("el globo de Agenda cuenta lo de hoy (2: 1 agendada + 1 sugerida)", g["Agenda"]==="2");
    comprobar("el globo de Mis pedidos ya no inventa pendientes", g["Mis pedidos"]==="0"||g["Mis pedidos"]===undefined);
  }
  console.log("═══ Lo que se decide, se guarda");
  {
    const m=montar(true);
    const r=await vm.runInContext(`(async()=>{
      var a=await responderSolicitud("SOL-D1","aprobada","Aprobado por volumen");
      var b=await guardarActividad({act_id:"SG-MOV-D6", cli:"Almacenes Fernando", cli_id:"CLI-D02",
        fecha:"2026-07-26", hora:"", tipo:"Cobro", objetivo:"Sugerido · cobrar F-4489",
        ubic:"Riobamba", dur:20, recordatorio:15, estado:"completada", resultado:"Cobrado"});
      var c=await guardarNovedad({cli:"Comercial Nilo", prov:"Agrícola del Valle",
        tipo:"descuento", detalle:"NC por descuento de prueba", monto:12.5});
      return JSON.stringify({a:a,b:b,c:c});
    })()`, m.ctx);
    const res=JSON.parse(r);
    const e=m.escrituras;
    const upd=e.find(x=>x.t==="solicitudes"&&x.op==="update");
    const ups=e.find(x=>x.t==="agenda_actividades"&&x.op==="upsert");
    const ins=e.find(x=>x.t==="novedades"&&x.op==="insert");
    comprobar("aprobar una solicitud la guarda en la base", !!upd && upd.f.estado==="aprobada" && !!upd.f.resuelto_en);
    comprobar("la respuesta escrita queda con la solicitud", !!upd && upd.f.motivo_resp==="Aprobado por volumen");
    comprobar("completar una sugerencia la vuelve actividad guardada", !!ups && ups.f.act_id==="SG-MOV-D6" && ups.f.estado==="completada");
    comprobar("la actividad se guarda a nombre de quien la hace", !!ups && ups.f.usr_id==="FRL-RR");
    comprobar("un reclamo nuevo se inserta en novedades", !!ins && ins.f.origen==="comercial" && ins.f.estado==="enviada");
    comprobar("el reclamo queda amarrado al cliente por su código", !!ins && ins.f.cli_id==="CLI-D01");
    comprobar("y a la piladora por su código", !!ins && ins.f.prov_cod==="PROV-A");
    comprobar("el reclamo lleva quién lo reportó (padrón, no texto libre)", !!ins && ins.f.reporto==="FRL-RR");
    comprobar("las tres escrituras responden que sí", res.a===true && res.b===true && !!res.c);
  }
  console.log("═══ SIN sesión (la app no puede quedarse en blanco)");
  {
    const m=montar(false);
    const t=await vm.runInContext(guion("Mis pedidos"), m.ctx);
    comprobar("sin datos, Mis pedidos sigue con la demostración", /Mis pedidos\s*⚪ Demostración/.test(t) && t.indexOf("Comercial Mendoza")>=0);
    const t2=await vm.runInContext(guion("Agenda"), m.ctx);
    comprobar("sin datos, la Agenda conserva su ejemplo", /Agenda\s*⚪ Demostración/.test(t2));
  }
  console.log("Resultado: "+ok+" ✓ · "+mal+" ✗");
  process.exit(mal?1:0);
})().catch(e=>{ console.log("✗ "+String(e&&e.stack||e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
