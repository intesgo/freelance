/* N5-apps · Renderiza cada PANTALLA de una app del celular contra el bundle real.
   Uso: node secciones_app.js <ruta-html> <Comp1> <Comp2> ... */
const fs=require("fs");
const { JSDOM } = require("jsdom");
const Babel=require("./rutas").Babel;
const ruta=process.argv[2];
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
w.speechSynthesis={speak(){},cancel(){},getVoices:()=>[]};
w.Notification=function(){}; w.Notification.permission="denied"; w.Notification.requestPermission=async()=>"denied";
const q=()=>{ const p=Promise.resolve({data:[],error:null});
  ["select","eq","neq","in","order","limit","like","not","maybeSingle","single","insert","update","upsert","delete"].forEach(m=>{p[m]=()=>q();});
  return p; };
w.SB={ auth:{ getSession:async()=>({data:{session:{user:{id:"u1",email:"intesgo@gmail.com"}}}}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
  from:()=>q(), rpc:async()=>({data:null}),
  functions:{ invoke:async()=>({data:{enviados:0},error:null}) },
  storage:{ from:()=>({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) } };
const vm=require("vm");
const ctx=dom.getInternalVMContext();
vm.runInContext(react,ctx); vm.runInContext(reactDom,ctx);
try{ vm.runInContext(js,ctx); }
catch(e){ console.log("✗ el archivo no evalúa: "+String(e.message).split("\n")[0]); process.exit(1); }

vm.runInContext(`
  window.__usuario = { nombre:"Richard Ramírez", codigo:"FRL-RR", zona:"Sesión real", rol:"freelance", real:true };
  window.__render = function(nombre){
    var C = eval(nombre);
    var cont = document.createElement("div");
    document.body.appendChild(cont);
    var raiz = ReactDOM.createRoot(cont);
    ReactDOM.flushSync(function(){
      raiz.render(React.createElement(C, {
        usuario: window.__usuario, toast:function(){}, go:function(){}, navegar:function(){},
        onSalir:function(){}, setTema:function(){}, setOscuro:function(){}, setFontGrande:function(){},
        tema:"campo", oscuro:false, fontGrande:false, prefsNotif:{}, setPrefsNotif:function(){},
        onAbrirPreguntas:function(){}, irCliente:function(){}, irProducto:function(){}, irFactura:function(){},
        chofer:"marlon", avisar:function(){}, decir:function(){},
        /* contexto que algunas apps pasan a sus módulos (proveedor) */
        ctx:{ pendientes:[], cat:[], setCat:function(){}, accion:function(){},
              prop:[], setProp:function(){}, cred:[], setCred:function(){}, contado:[] },
        irTab:function(){},
        /* ruta real de la demo para las pantallas del transportista */
        r: (typeof RUTAS!=="undefined" && RUTAS[0]) || undefined,
        onVolver:function(){}, onIrEntregas:function(){}, onVerCarga:function(){},
        onRutaCompleta:function(){}, refrescar:function(){}
      }));
    });
    return cont.textContent.length;
  };
`,ctx);

let ok=0, fallo=0;
for(const s of process.argv.slice(3)){
  try{
    const largo=vm.runInContext(`window.__render(${JSON.stringify(s)})`,ctx);
    if(largo>0){ ok++; console.log("  ✓ "+s+" ("+largo+")"); }
    else { fallo++; console.log("  ✗ "+s+" VACÍO"); }
  }catch(e){ fallo++; console.log("  ✗ "+s+" → "+String(e.message||e).split("\n")[0]); }
}
console.log("Resultado: "+ok+" ✓ · "+fallo+" ✗");
process.exit(fallo?1:0);
