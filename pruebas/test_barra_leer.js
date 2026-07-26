/* Prueba funcional de la barra que SE ESCONDE AL LEER (b364).
   Corre contra el bundle real de cada app, sin sustitutos. */
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

console.log("═══ "+nombre);

/* ── 1 · el CSS trae la regla que baja la barra y la transición ── */
const css=html.match(/<style>([\s\S]*?)<\/style>/g).join("\n");
comprobar("CSS: existe .nav.baja que la saca de pantalla",
  /\.nav\.baja\{[^}]*transform:[^}]*(120%|110%)/.test(css));
comprobar("CSS: la barra bajada no recibe toques",
  /\.nav\.baja\{[^}]*pointer-events:none/.test(css));
comprobar("CSS: la barra se desliza (no salta)",
  /\.nav\{transition:transform/.test(css));
comprobar("ya no queda el asa de la versión anterior",
  !/Mostrar la barra de abajo/.test(html) && !/barraAbierta/.test(html));
comprobar("el hook está declarado una sola vez",
  (html.match(/function useBarraAlLeer\(\)/g)||[]).length===1);
comprobar("el hook usa React.useState (nunca useState suelto)",
  /const \[visible,setVisible\]=React\.useState\(true\)/.test(html));
comprobar("escucha el scroll en fase de captura (listas internas incluidas)",
  /addEventListener\("scroll",alRodar,true\)/.test(html));
comprobar("quita los escuchas al desmontar",
  /removeEventListener\("scroll",alRodar,true\)/.test(html));
comprobar("un aviso nuevo la trae de vuelta",
  /if\(totalAvisos > refAvisos\.current\) setBarraVisible\(true\)/.test(html));
comprobar("en el chat la barra no se dibuja",
  /tab!=="mensajes" && <(div|nav) className=\{"nav"\+\(barraVisible\?"":" baja"\)\}/.test(html));

/* ── 2 · comportamiento real: montar la app y desplazarse ── */
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
  channel:()=>({ on(){return this;}, subscribe(){return this;} }), removeChannel:()=>{},
  functions:{ invoke:async()=>({data:{enviados:0},error:null}) },
  storage:{ from:()=>({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) } };

const ctx=dom.getInternalVMContext();
vm.runInContext(react,ctx); vm.runInContext(reactDom,ctx);
try{ vm.runInContext(js,ctx); }
catch(e){ console.log("  ✗ el archivo no evalúa: "+String(e.message).split("\n")[0]); process.exit(1); }

const guion=`(async()=>{
  var res=[];
  var cont=document.createElement("div"); document.body.appendChild(cont);
  var raiz=ReactDOM.createRoot(cont);
  ReactDOM.flushSync(function(){
    raiz.render(React.createElement(App,{ usuario:{nombre:"Richard Ramírez",codigo:"FRL-RR",rol:"freelance",real:true},
      onSalir:function(){}, toast:function(){} }));
  });
  var esperar=function(){ return new Promise(function(r){ setTimeout(r,30); }); };
  var barra=function(){ return cont.querySelector(".nav"); };
  await esperar();
  res.push(["la barra está a la vista al abrir", !!barra() && barra().className.indexOf("baja")<0]);

  /* una lista interna que se desplaza */
  var lista=document.createElement("div"); document.body.appendChild(lista);
  var pos=0; Object.defineProperty(lista,"scrollTop",{get:function(){return pos;},configurable:true});
  var rodar=function(y){ pos=y; lista.dispatchEvent(new window.Event("scroll")); };

  rodar(0); await esperar();          /* primer evento: solo toma referencia */
  rodar(400); await esperar();        /* baja leyendo */
  res.push(["al deslizar hacia abajo, la barra se va", !!barra() && barra().className.indexOf("baja")>=0]);

  rodar(300); await esperar();        /* sube */
  res.push(["al deslizar hacia arriba, vuelve", !!barra() && barra().className.indexOf("baja")<0]);

  rodar(900); await esperar();
  res.push(["vuelve a esconderse al seguir leyendo", !!barra() && barra().className.indexOf("baja")>=0]);

  rodar(10); await esperar();
  res.push(["al llegar al tope, siempre visible", !!barra() && barra().className.indexOf("baja")<0]);

  /* toque suelto con la barra escondida */
  rodar(600); await esperar();
  var escondida = barra().className.indexOf("baja")>=0;
  await new Promise(function(r){ setTimeout(r,320); });   /* deja pasar el desplazamiento */
  document.body.dispatchEvent(new window.Event("click",{bubbles:true}));
  await esperar();
  res.push(["un toque en la pantalla la trae de vuelta", escondida && barra().className.indexOf("baja")<0]);

  /* movimientos mínimos no la mueven */
  rodar(600); await esperar(); rodar(604); await esperar();
  res.push(["un temblor de dedo no la esconde", barra().className.indexOf("baja")<0]);
  return res;
})()`;

vm.runInContext(guion,ctx).then(res=>{
  res.forEach(r=>comprobar(r[0],r[1]));
  console.log("Resultado "+nombre+": "+ok+" ✓ · "+mal+" ✗");
  process.exit(mal?1:0);
}).catch(e=>{ console.log("  ✗ "+String(e&&e.message||e).split("\n")[0]); process.exit(1); });
