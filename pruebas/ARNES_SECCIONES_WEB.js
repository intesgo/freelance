/* N5 · RENDER DE CADA SECCIÓN contra el bundle REAL (sin sustitutos).
   Evalúa todo sistema-web compilado en jsdom y renderiza cada componente de
   sección con React de verdad: caza ReferenceError de alcance (titSec, hooks
   sin React., helpers locales usados fuera de su módulo) que los arneses con
   stubs enmascaran. */
const fs=require("fs");
const { JSDOM } = require("jsdom");
const Babel=require("./rutas").Babel;
const html=fs.readFileSync(require("./rutas").app("sistema-web"),"utf-8");
const jsx=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js=Babel.transform(jsx,{presets:["react"]}).code;
const react=require("./rutas").react();
const reactDom=require("./rutas").reactDom();

const dom=new JSDOM(`<!doctype html><html><body><div id="root"></div><div id="app"></div></body></html>`,
  { url:"https://intesgo.github.io/", runScripts:"outside-only", pretendToBeVisual:true });
const w=dom.window;
w.matchMedia=w.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
w.scrollTo=()=>{}; w.open=()=>null; w.print=()=>{};
w.Notification=function(){}; w.Notification.permission="denied";
/* supabase con sesión y respuestas vacías: interesa el render, no los datos */
const q=()=>{ const p=Promise.resolve({data:[],error:null});
  ["select","eq","neq","in","order","limit","like","not","maybeSingle","single","insert","update","upsert","delete"].forEach(m=>{p[m]=()=>q();});
  return p; };
w.supa={ auth:{ getSession:async()=>({data:{session:{user:{id:"u1",email:"intesgo@gmail.com"}}}}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}), getUser:async()=>({data:{user:{id:"u1"}}}) },
  from:()=>q(), rpc:async()=>({data:null}),
  functions:{ invoke:async()=>({data:{enviados:0},error:null}) },
  storage:{ from:()=>({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) } };
w.XLSX=null;
const vm=require("vm");
const ctx=dom.getInternalVMContext();
vm.runInContext(react,ctx); vm.runInContext(reactDom,ctx);
vm.runInContext(js,ctx);

/* sesión simulada para los componentes que la reciben */
vm.runInContext(`
  window.__ses = { usuario:"richard", nombre:"Richard Ramírez", cargo:"admin",
    rol:"Administrador de Plataforma", empresaId:"ORG-001", secciones:[] };
  window.__render = function(nombre){
    var C = (typeof window[nombre]!=="undefined") ? window[nombre] : eval(nombre);
    var cont = document.createElement("div");
    document.body.appendChild(cont);
    var raiz = ReactDOM.createRoot(cont);
    ReactDOM.flushSync(function(){
      raiz.render(React.createElement(C, { usuario: window.__ses, navegar:function(){}, sesion: window.__ses }));
    });
    return cont.textContent.length;
  };
`,ctx);

const SECCIONES=process.argv.slice(2);
let ok=0, fallo=0;
for(const s of SECCIONES){
  try{
    const largo=vm.runInContext(`window.__render(${JSON.stringify(s)})`,ctx);
    if(largo>0){ ok++; console.log("  ✓ "+s+" renderiza ("+largo+" caracteres)"); }
    else { fallo++; console.log("  ✗ FALLO: "+s+" renderiza VACÍO"); }
  }catch(e){
    fallo++;
    console.log("  ✗ FALLO: "+s+" → "+String(e.message||e).split("\n")[0]);
  }
}
console.log("\nResultado: "+ok+" ✓ · "+fallo+" ✗");
process.exit(fallo?1:0);
