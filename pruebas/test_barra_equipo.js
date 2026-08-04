/* Prueba de que la barra inferior del equipo (Comisionista / Socio) lee del sistema.
   Uso: node test_barra_equipo.js <ruta.html>
   Corre contra el bundle real en jsdom, con filas copiadas de la base. */
const fs=require("fs"), vm=require("vm");
const { JSDOM } = require("jsdom");
const Babel=require("./rutas").Babel;

const ruta=process.argv[2];
const nombre=ruta.split("/").pop();
const html=fs.readFileSync(ruta,"utf-8");
const jsx=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js=Babel.transform(jsx,{presets:["react"]}).code;
const react=require("./rutas").react();
const reactDom=require("./rutas").reactDom();

let ok=0, mal=0;
const comprobar=(t,c)=>{ if(c){ok++;console.log("  ✓ "+t);} else {mal++;console.log("  ✗ "+t);} };
const HOY=new Date().toISOString().slice(0,10);
const AYER=new Date(Date.now()-86400000).toISOString().slice(0,10);

const FIX=(rol)=>({
  usuarios:[{usr_id:"SC-D1",nombre:"Luis Paredes",rol:rol},
            {usr_id:"SC-D2",nombre:"María Espinoza",rol:"comisionista"}],
  pedidos:[
    {ped_id:"PD-0010",cli_id:"CLI-D01",sub_id:"SC-D1",prov_cod:"PROV-A",estado:"enviado_proveedor",
     factura:null,condicion:"credito",creado:"2026-07-10T06:38:39+00:00",es_demo:true},
    {ped_id:"PD-0006",cli_id:"CLI-D04",sub_id:"SC-D2",prov_cod:"PROV-A",estado:"cliente_pago",
     factura:"F-4590",condicion:"contado",creado:"2026-07-10T06:38:39+00:00",es_demo:true}],
  pedido_items:[{ped_id:"PD-0010",descripcion:"Arroz Super Capirona · Quintal",cantidad_qq:10,precio_usd:40}],
  clientes:[{cli_id:"CLI-D01",nombre:"Comercial Nilo"},{cli_id:"CLI-D04",nombre:"Bodega San Miguel"},
            {cli_id:"CLI-D02",nombre:"Almacenes Fernando"}],
  proveedores:[{prov_cod:"PROV-A",nombre:"Agrícola del Valle"}],
  comisiones:[{com_id:"C1",ped_id:"PD-0010",sub_id:"SC-D1",monto:124.50,estado:"Generada"},
              {com_id:"C2",ped_id:"PD-0004",sub_id:"SC-D1",monto:88.00,estado:"Pagada"},
              {com_id:"C3",ped_id:"PD-0006",sub_id:"SC-D2",monto:66.15,estado:"Pagada"}],
  novedades:[{nov_id:"NV-0001",cli_id:"CLI-D01",tipo:"descuento",detalle:"NC por descuento $0.50/qq",
     estado:"aprobada",origen:"comercial",creado:"2026-07-20T10:00:00+00:00",es_demo:false}],
  agenda_actividades:[{act_id:"AG-1",usr_id:"SC-D1",cli_id:"CLI-D01",cliente:"Comercial Nilo",
     fecha:HOY,hora:"09:00",tipo:"Visita",objetivo:"Tomar pedido de arroz",ubic:"Riobamba",
     dur:30,recordatorio:15,estado:"pendiente"}],
  cartera_cliente:[{mov_id:"MOV-D6",cli_id:"CLI-D02",doc:"F-4489",vence:AYER,monto:1000.00,estado:"pendiente"}],
  ubicaciones_cliente:[],
});

function montar(conDatos, rol){
  const FX=FIX(rol||"comisionista");
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
  w.SB={ auth:{ getSession:async()=>(conDatos?{data:{session:{user:{id:"auth-x",email:"luis@ejemplo.com"}}}}:{data:{session:null}}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
    from:(n)=>tabla(n), rpc:async()=>({data:null}),
    channel:()=>({ on(){return this;}, subscribe(){return this;} }), removeChannel:()=>{},
    functions:{ invoke:async()=>({data:{enviados:0},error:null}) },
    storage:{ from:()=>({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) } };
  const ctx=dom.getInternalVMContext();
  vm.runInContext(react,ctx); vm.runInContext(reactDom,ctx); vm.runInContext(js,ctx);
  return { ctx, escrituras };
}

const guion=(tab)=>`(async()=>{
  var cont=document.createElement("div"); document.body.appendChild(cont);
  ReactDOM.flushSync(function(){ ReactDOM.createRoot(cont).render(React.createElement(App,{
    usuario:{nombre:"Luis Paredes",codigo:"SC-D1",rol:"comisionista",real:true},
    onSalir:function(){}, toast:function(){} })); });
  var esperar=function(ms){ return new Promise(function(r){ setTimeout(r,ms||60); }); };
  await esperar(260);
  var bs=cont.querySelectorAll(".nav button");
  for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(${JSON.stringify(tab)})>=0){ bs[i].click(); break; } }
  await esperar(260);
  return cont.textContent;
})()`;

(async()=>{
  console.log("═══ "+nombre+" · con datos del sistema");
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Pedidos"), m.ctx);
    comprobar("Pedidos con sello de datos vivos", /Pedidos\s*🟢 Datos vivos/.test(t));
    comprobar("aparece su pedido de verdad (Comercial Nilo)", t.indexOf("Comercial Nilo")>=0);
    comprobar("NO aparece el pedido de otro vendedor (Bodega San Miguel)", t.indexOf("Bodega San Miguel")<0);
    comprobar("ya no se ve el ejemplo (Comercial Mendoza)", t.indexOf("Comercial Mendoza")<0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Novedades"), m.ctx);
    comprobar("Novedades con sello de datos vivos", /Novedades\s*🟢 Datos vivos/.test(t));
    comprobar("la respuesta del proveedor viene de la base", t.indexOf("NC por descuento")>=0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Agenda"), m.ctx);
    comprobar("Agenda con sello de datos vivos", /Agenda\s*🟢 Datos vivos/.test(t));
    comprobar("su actividad programada aparece", t.indexOf("Tomar pedido de arroz")>=0);
    comprobar("sugiere el cobro de la factura vencida", t.indexOf("Sugerido · cobrar F-4489")>=0);
  }
  {
    const m=montar(true);
    const t=await vm.runInContext(guion("Comisiones"), m.ctx);
    comprobar("Comisiones con sello de datos vivos", /🟢 Datos vivos/.test(t));
    comprobar("suma lo ya pagado ($88,00)", t.indexOf("88,00")>=0 || t.indexOf("88.00")>=0);
    comprobar("y lo que falta liberar ($124,50)", t.indexOf("124,50")>=0 || t.indexOf("124.50")>=0);
    comprobar("no mezcla la comisión de otro vendedor ($66,15)", t.indexOf("66,15")<0 && t.indexOf("66.15")<0);
  }
  {
    const m=montar(true);
    const g=JSON.parse(await vm.runInContext(`(async()=>{
      var cont=document.createElement("div"); document.body.appendChild(cont);
      ReactDOM.flushSync(function(){ ReactDOM.createRoot(cont).render(React.createElement(App,{
        usuario:{nombre:"Luis Paredes",codigo:"SC-D1",rol:"comisionista",real:true}, onSalir:function(){}, toast:function(){} })); });
      await new Promise(function(r){ setTimeout(r,300); });
      var out={}; var bs=cont.querySelectorAll(".nav button");
      for(var i=0;i<bs.length;i++){ var b=bs[i]; var gl=b.querySelector(".badge");
        var txt=(b.textContent||"").replace(/[0-9]/g,"");
        ["Novedades","Pedidos","Agenda","Comisiones","Mensajes"].forEach(function(k){
          if(txt.indexOf(k)>=0) out[k]= gl? gl.textContent : "0"; }); }
      return JSON.stringify(out);
    })()`, m.ctx));
    comprobar("el globo de Novedades cuenta la respuesta real (1)", g["Novedades"]==="1");
    comprobar("el globo de Agenda cuenta lo de hoy (2)", g["Agenda"]==="2");
    comprobar("el globo de Comisiones cuenta lo que falta liberar (1)", g["Comisiones"]==="1");
  }
  console.log("═══ el freelance ve todo el equipo");
  {
    const m=montar(true,"freelance");
    const t=await vm.runInContext(guion("Pedidos"), m.ctx);
    comprobar("con rol freelance entran los pedidos de todo el equipo", /2\s*Pedidos/.test(t) || t.indexOf("Bodega San Miguel")>=0 || /2 pedido/.test(t));
  }
  console.log("═══ sin sesión");
  {
    const m=montar(false);
    const t=await vm.runInContext(guion("Pedidos"), m.ctx);
    comprobar("sin datos sigue la demostración", /Pedidos\s*⚪ Demostración/.test(t) && t.indexOf("Comercial Mendoza")>=0);
  }
  console.log("═══ lo que se marca, se guarda");
  {
    const m=montar(true);
    const r=await vm.runInContext(`(async()=>{
      var b=await guardarActividad({act_id:"SG-MOV-D6", cli:"Almacenes Fernando", cli_id:"CLI-D02",
        fecha:"${HOY}", hora:"", tipo:"Cobro", nota:"Sugerido · cobrar F-4489", hecho:true});
      return JSON.stringify({b:b});
    })()`, m.ctx);
    const ups=m.escrituras.find(x=>x.t==="agenda_actividades"&&x.op==="upsert");
    comprobar("marcar hecha una sugerencia la guarda como actividad", !!ups && ups.f.act_id==="SG-MOV-D6" && ups.f.estado==="completada");
    comprobar("queda a nombre de quien la hizo", !!ups && ups.f.usr_id==="SC-D1");
    comprobar("con el objetivo escrito", !!ups && String(ups.f.objetivo).indexOf("F-4489")>=0);
    comprobar("y responde que sí", JSON.parse(r).b===true);
  }
  console.log("Resultado "+nombre+": "+ok+" ✓ · "+mal+" ✗");
  process.exit(mal?1:0);
})().catch(e=>{ console.log("✗ "+String(e&&e.stack||e).split("\n").slice(0,3).join(" | ")); process.exit(1); });
