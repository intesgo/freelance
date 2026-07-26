/* Regresión de FA-0003 · "la app se queda en blanco".
   Estas apps no tienen red de seguridad de React: un error al dibujar DESMONTA
   TODO. Así que la prueba es literal: monta la app, toca cada botón de la barra
   de abajo, y comprueba que después de cada toque la pantalla SIGUE teniendo
   contenido. Si queda vacía, la app se cayó.
   Uso: node test_no_se_cae.js <ruta.html> */
const fs=require("fs"), vm=require("vm");
const { JSDOM } = require("jsdom");
const Babel=require("./rutas").Babel;

const ruta=process.argv[2], nombre=ruta.split("/").pop();
const html=fs.readFileSync(ruta,"utf-8");
const jsx=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js=Babel.transform(jsx,{presets:["react"]}).code;
const react=require("./rutas").react();
const reactDom=require("./rutas").reactDom();

const dom=new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
  { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
const w=dom.window;
w.matchMedia=w.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
w.scrollTo=()=>{}; w.open=()=>null; w.print=()=>{}; w.navigator.vibrate=()=>{};
w.alert=()=>{}; w.confirm=()=>true;
w.speechSynthesis={speak(){},cancel(){},getVoices:()=>[]};
w.Notification=function(){}; w.Notification.permission="denied"; w.Notification.requestPermission=async()=>"denied";
const q=()=>{ const p=Promise.resolve({data:[],error:null,count:0});
  ["select","eq","neq","in","order","limit","like","not","is","gte","lte"].forEach(m=>{p[m]=()=>q();});
  p.maybeSingle=()=>Promise.resolve({data:null,error:null}); p.single=p.maybeSingle;
  p.insert=()=>Promise.resolve({error:null}); p.upsert=()=>Promise.resolve({error:null});
  p.update=()=>{ const r=Promise.resolve({error:null}); r.eq=()=>r; return r; };
  p.delete=()=>{ const r=Promise.resolve({error:null}); r.eq=()=>r; return r; };
  return p; };
w.SB={ auth:{ getSession:async()=>({data:{session:{user:{id:"u1",email:"intesgo@gmail.com"}}}}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
  from:()=>q(), rpc:async()=>({data:null}),
  channel:()=>({ on(){return this;}, subscribe(){return this;} }), removeChannel:()=>{},
  functions:{ invoke:async()=>({data:{},error:null}) },
  storage:{ from:()=>({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) } };

const ctx=dom.getInternalVMContext();
vm.runInContext(react,ctx); vm.runInContext(reactDom,ctx); vm.runInContext(js,ctx);

vm.runInContext(`(async()=>{
  var cont=document.createElement("div"); document.body.appendChild(cont);
  ReactDOM.flushSync(function(){ ReactDOM.createRoot(cont).render(React.createElement(App,{
    usuario:{nombre:"Richard Ramírez",codigo:"FRL-RR",rol:"freelance",real:true},
    onSalir:function(){}, toast:function(){} })); });
  var esperar=function(ms){ return new Promise(function(r){ setTimeout(r,ms||120); }); };
  await esperar(220);
  var vivo=function(){ return cont.textContent.length; };
  var base=vivo();
  var out=[["la app monta", base>0, base]];
  var bs=cont.querySelectorAll(".nav button");
  for(var i=0;i<bs.length;i++){
    var etiqueta=(bs[i].textContent||("botón "+(i+1))).replace(/[0-9]/g,"").trim() || ("botón "+(i+1));
    bs[i].click();
    await esperar(220);
    out.push(["sigue viva tras tocar "+etiqueta, vivo()>0, vivo()]);
    /* volver al inicio para el siguiente toque */
    var otra=cont.querySelectorAll(".nav button");
    if(!otra.length) break;   /* si la barra desapareció, la app se cayó */
    bs=otra;
  }
  return JSON.stringify(out);
})()`,ctx).then(t=>{
  const res=JSON.parse(t);
  let ok=0, mal=0;
  console.log("═══ "+nombre);
  for(const [txt,bien,largo] of res){
    if(bien){ ok++; console.log("  ✓ "+txt+" ("+largo+" caracteres en pantalla)"); }
    else { mal++; console.log("  ✗ "+txt+" · PANTALLA EN BLANCO"); }
  }
  console.log("Resultado "+nombre+": "+ok+" ✓ · "+mal+" ✗");
  process.exit(mal?1:0);
}).catch(e=>{ console.log("✗ "+nombre+" → "+String(e&&e.message||e).split("\n")[0]); process.exit(1); });
