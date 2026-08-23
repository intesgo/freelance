/* Prueba de que los 4 módulos de la barra inferior leen del sistema (b365).
   Corre contra el bundle real de fc en jsdom con fixtures completamente
   sintéticos y marcados como demostración. */
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

/* «hoy» y «ayer» en Ecuador (America/Guayaquil), la misma cuenta que hoyEC() en la
   app. Con UTC (toISOString) la madrugada 00:00–05:00 adelantaba un día, y la Agenda
   —que filtra por el día de Ecuador— dejaba de contar el fixture de hoy. */
const HOY_EC=new Date().toLocaleString("sv-SE",{timeZone:"America/Guayaquil"}).slice(0,10);
const AYER=new Date(new Date(HOY_EC+"T12:00:00Z").getTime()-86400000).toISOString().slice(0,10);
const FIX={
  usuarios:[{usr_id:"USR-DEMO-01",nombre:"Usuario Demo Principal",rol:"freelance"},
            {usr_id:"USR-DEMO-02",nombre:"Usuario Demo Dos",rol:"comisionista"},
            {usr_id:"USR-DEMO-03",nombre:"Usuario Demo Tres",rol:"freelance"}],
  pedidos:[
    {ped_id:"PED-DEMO-01",cli_id:"CLI-DEMO-01",prov_cod:"PROV-DEMO-01",ciudad:"Ciudad Demo",estado:"enviado_proveedor",
     factura:null,condicion:"credito",creado:"2026-07-10T06:38:39.654043+00:00",es_demo:true},
    {ped_id:"PED-DEMO-02",cli_id:"CLI-DEMO-02",prov_cod:"PROV-DEMO-02",ciudad:"Ciudad Demo",estado:"facturado",
     factura:"FAC-DEMO-01",condicion:"credito",creado:"2026-07-24T19:04:30.885486+00:00",es_demo:true},
    {ped_id:"PED-DEMO-03",cli_id:"CLI-DEMO-01",prov_cod:"PROV-DEMO-01",ciudad:"Ciudad Demo",estado:"despachado",
     factura:"FAC-DEMO-02",condicion:"credito",creado:"2026-07-10T06:38:39.654043+00:00",es_demo:true}],
  pedido_items:[
    {ped_id:"PED-DEMO-02",descripcion:"Producto Demo A · Unidad",cantidad_qq:10.00,precio_usd:40.00},
    {ped_id:"PED-DEMO-02",descripcion:"Producto Demo B · Unidad",cantidad_qq:5.00,precio_usd:22.50}],
  clientes:[{cli_id:"CLI-DEMO-01",nombre:"Cliente Demo Norte",tipo:"Empresa"},{cli_id:"CLI-DEMO-02",nombre:"Cliente Demo Central",tipo:"Empresa"},
            {cli_id:"CLI-DEMO-03",nombre:"Cliente Demo Sur",tipo:"Empresa"}],
  proveedores:[{prov_cod:"PROV-DEMO-01",nombre:"Proveedor Demo Uno"},{prov_cod:"PROV-DEMO-02",nombre:"Proveedor Demo Dos"}],
  comisiones:[{ped_id:"PED-DEMO-02",monto:20.00,estado:"Generada"},{ped_id:"PED-DEMO-03",monto:80.00,estado:"Pagada"}],
  solicitudes:[
    {sol_id:"SOL-DEMO-01",tipo:"cupo",origen_id:"USR-DEMO-02",destino:"freelance",prov_cod:null,cli_id:"CLI-DEMO-02",
     detalle:"Solicitud sintética de cupo",estado:"pendiente",motivo_resp:null,
     creado:"2026-07-24T19:04:30.885486+00:00",resuelto_en:null,es_demo:true},
    {sol_id:"SOL-DEMO-02",tipo:"devolucion",origen_id:"USR-DEMO-01",destino:"proveedor",prov_cod:"PROV-DEMO-01",cli_id:null,
     detalle:"Devolución sintética",estado:"rechazada",
     motivo_resp:"Respuesta sintética",creado:"2026-07-10T06:38:39+00:00",
     resuelto_en:"2026-07-10T06:38:39+00:00",es_demo:true}],
  novedades:[
    {nov_id:"NOV-DEMO-01",cli_id:"CLI-DEMO-01",tipo:"descuento",detalle:"NC demo por descuento",
     estado:"aprobada",origen:"comercial",monto:50,factura:"FAC-DEMO-02",
     creado:"2026-07-20T10:00:00+00:00",es_demo:true},
    {nov_id:"NOV-DEMO-02",cli_id:"CLI-DEMO-03",tipo:"producto",detalle:"Novedad demo de entrega",
     estado:"abierta",origen:"entrega",creado:"2026-07-22T15:00:00+00:00",es_demo:true}],
  agenda_actividades:[
    {act_id:"ACT-DEMO-01",usr_id:"USR-DEMO-01",cli_id:"CLI-DEMO-01",cliente:"Cliente Demo Norte",fecha:HOY_EC,
     hora:"09:00",tipo:"Visita",objetivo:"Tomar pedido demo",ubic:"Ciudad Demo",dur:30,
     recordatorio:15,estado:"pendiente"}],
  cartera_cliente:[{mov_id:"MOV-DEMO-01",cli_id:"CLI-DEMO-03",doc:"FAC-DEMO-03",vence:AYER,monto:1000.00,estado:"pendiente"}],
  ubicaciones_cliente:[{cli_id:"CLI-DEMO-03",ciudad:"Ciudad Demo",barrio:"Sector Demo",principal:true}],
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
  w.SB={ auth:{ getSession:async()=>(conDatos?{data:{session:{user:{id:"auth-demo",email:"usuario@example.invalid"}}}}:{data:{session:null}}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
    from:(n)=>tabla(n),
    /* SOLIC_RPC · resolver una solicitud ahora va por rpc("responder_solicitud",…),
       no por UPDATE directo: se anotan las llamadas para poder comprobarlas. */
    rpc:async(nombre,args)=>{ if(nombre==="mi_org_activa") return {data:"ORG-001",error:null};
      escrituras.push({t:"rpc",op:nombre,f:args||{}}); return {data:null,error:null}; },
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
    raiz.render(React.createElement(App,{ usuario:{nombre:"Usuario Demo Principal",codigo:"USR-DEMO-01",rol:"freelance",real:true},
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

/* Igual que `guion`, pero además abre la sub-vista «Resumen» de Pedidos: desde
   ago/2026 la entrada de Pedidos es liviana (pestañas + lista) y el panorama
   —dónde están los pedidos y por proveedor— vive tras el botón «Ver resumen». */
const guionResumen=(tab)=>`(async()=>{
  var cont=document.createElement("div"); document.body.appendChild(cont);
  var raiz=ReactDOM.createRoot(cont);
  ReactDOM.flushSync(function(){
    raiz.render(React.createElement(App,{ usuario:{nombre:"Usuario Demo Principal",codigo:"USR-DEMO-01",rol:"freelance",real:true},
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
  await esperar(150);
  var abrir=function(txt){
    var bs=cont.querySelectorAll("button");
    for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(txt)>=0){ bs[i].click(); return true; } }
    return false;
  };
  abrir("Ver resumen");
  await esperar(120);
  return cont.textContent;
})()`;

(async()=>{
  console.log("═══ CON datos del sistema");
  {
    const m=montar(true);
    const pedidos=await vm.runInContext(guion("Pedidos"), m.ctx);
    comprobar("Pedidos muestra el sello de datos vivos", /Pedidos\s*🟢 Datos vivos/.test(pedidos));
    comprobar("Pedidos trae el cliente sintético", pedidos.indexOf("CLIENTE DEMO NORTE")>=0);
    /* El estado y el proveedor viven en la sub-vista «Resumen» (entrada liviana). */
    const resumen=await vm.runInContext(guionResumen("Pedidos"), montar(true).ctx);
    comprobar("el estado guardado se traduce al del negocio (en Resumen)", resumen.indexOf("Enviado al proveedor")>=0);
    comprobar("el proveedor sale por su nombre sintético (en Resumen)", resumen.indexOf("Proveedor Demo Uno")>=0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Solicitudes"), m.ctx);
    comprobar("Solicitudes muestra el sello de datos vivos", /Solicitudes\s*🟢 Datos vivos/.test(t));
    comprobar("la solicitud recibida viene del fixture", t.indexOf("SOL-DEMO-01")>=0 && t.indexOf("CLIENTE DEMO CENTRAL")>=0);
    comprobar("se ve quién la pidió (del padrón sintético)", t.indexOf("Usuario Demo Dos")>=0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Novedades"), m.ctx);
    comprobar("Novedades muestra el sello de datos vivos", /Novedades\s*🟢 Datos vivos/.test(t));
    comprobar("el reclamo comercial guardado aparece", t.indexOf("NC demo por descuento")>=0);
    comprobar("la novedad de entrega también (una sola tabla)", t.indexOf("Novedad demo de entrega")>=0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Agenda"), m.ctx);
    comprobar("Agenda muestra el sello de datos vivos", /Agenda\s*🟢 Datos vivos/.test(t));
    comprobar("la actividad programada aparece", t.indexOf("Tomar pedido demo")>=0);
    comprobar("sugiere el cobro de la factura vencida", t.indexOf("Sugerido · cobrar FAC-DEMO-03")>=0);
    comprobar("la sugerencia sale con el cliente correcto", t.indexOf("CLIENTE DEMO SUR")>=0);
  }
  {
    /* los globos de la barra cuentan lo que hay de verdad */
    const m=montar(true);
    const t=await vm.runInContext(`(async()=>{
      var cont=document.createElement("div"); document.body.appendChild(cont);
      ReactDOM.flushSync(function(){ ReactDOM.createRoot(cont).render(React.createElement(App,{
        usuario:{nombre:"Usuario Demo Principal",codigo:"USR-DEMO-01",rol:"freelance",real:true}, onSalir:function(){}, toast:function(){} })); });
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
    comprobar("el globo de Pedidos ya no inventa pendientes", g["Pedidos"]==="0"||g["Pedidos"]===undefined);
  }
  console.log("═══ Lo que se decide, se guarda");
  {
    const m=montar(true);
    const r=await vm.runInContext(`(async()=>{
      var a=await responderSolicitud("SOL-DEMO-01","aprobada","Respuesta de prueba");
      var b=await guardarActividad({act_id:"SG-MOV-DEMO-01", cli:"Cliente Demo Sur", cli_id:"CLI-DEMO-03",
        fecha:"2026-07-26", hora:"", tipo:"Cobro", objetivo:"Sugerido · cobrar FAC-DEMO-03",
        ubic:"Ciudad Demo", dur:20, recordatorio:15, estado:"completada", resultado:"Resultado demo"});
      var c=await guardarNovedad({cli:"Cliente Demo Norte", prov:"Proveedor Demo Uno",
        tipo:"descuento", detalle:"Novedad sintética", monto:12.5});
      return JSON.stringify({a:a,b:b,c:c});
    })()`, m.ctx);
    const res=JSON.parse(r);
    const e=m.escrituras;
    const sol=e.find(x=>x.t==="rpc"&&x.op==="responder_solicitud");
    const ups=e.find(x=>x.t==="agenda_actividades"&&x.op==="upsert");
    const ins=e.find(x=>x.t==="novedades"&&x.op==="insert");
    comprobar("aprobar una solicitud la resuelve por el RPC (no UPDATE directo)", !!sol && sol.f.p_sol_id==="SOL-DEMO-01" && sol.f.p_aprueba===true);
    comprobar("la respuesta (motivo) viaja al RPC con la solicitud", !!sol && sol.f.p_motivo==="Respuesta de prueba");
    comprobar("completar una sugerencia la vuelve actividad guardada", !!ups && ups.f.act_id==="SG-MOV-DEMO-01" && ups.f.estado==="completada");
    comprobar("la actividad se guarda a nombre de quien la hace", !!ups && ups.f.usr_id==="USR-DEMO-01");
    comprobar("un reclamo nuevo se inserta en novedades", !!ins && ins.f.origen==="comercial" && ins.f.estado==="enviada");
    comprobar("el reclamo queda amarrado al cliente por su código", !!ins && ins.f.cli_id==="CLI-DEMO-01");
    comprobar("y al proveedor por su código", !!ins && ins.f.prov_cod==="PROV-DEMO-01");
    comprobar("el reclamo lleva quién lo reportó (padrón, no texto libre)", !!ins && ins.f.reporto==="USR-DEMO-01");
    /* responderSolicitud ahora devuelve {ok,motivo} (para avisar si la base
       rechaza); antes devolvía un booleano. Se acepta cualquiera de las dos. */
    comprobar("las tres escrituras responden que sí",
      (res.a===true || (res.a && res.a.ok===true)) && res.b===true && !!res.c);
  }
  console.log("═══ SIN sesión (la app no puede quedarse en blanco)");
  {
    const m=montar(false);
    const t=await vm.runInContext(guion("Pedidos"), m.ctx);
    comprobar("sin datos, Pedidos no inventa una demostración", !/Pedidos\s*⚪ Demostración/.test(t));
    const t2=await vm.runInContext(guion("Agenda"), m.ctx);
    comprobar("sin datos, la Agenda no filtra el fixture sintético", t2.indexOf("Tomar pedido demo")<0 && t2.indexOf("FAC-DEMO-03")<0);
  }
  console.log("Resultado: "+ok+" ✓ · "+mal+" ✗");
  process.exit(mal?1:0);
})().catch(e=>{ console.log("✗ "+String(e&&e.stack||e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
