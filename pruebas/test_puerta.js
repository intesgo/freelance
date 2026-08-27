/* Prueba de la puerta única: sin sesión no se entra, con sesión se entra solo.
   Uso: node test_puerta.js <ruta.html> */
const fs=require("fs"), vm=require("vm");
const { JSDOM } = require("jsdom");
const Babel=require("./rutas").Babel;

const ruta=process.argv[2], nombre=ruta.split("/").pop();
/* PROVEEDOR_LOGIN_PROPIO · la app del proveedor tiene su propio login (correo + clave dentro
   de la app), no el enlace al portal. El resto de apps siguen con el portal. */
const esProv=/proveedor/i.test(nombre);
const html=fs.readFileSync(ruta,"utf-8");
const jsx=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js=Babel.transform(jsx,{presets:["react"]}).code;
const react=require("./rutas").react();
const reactDom=require("./rutas").reactDom();

let ok=0, mal=0;
const comprobar=(t,c)=>{ if(c){ok++;console.log("  ✓ "+t);} else {mal++;console.log("  ✗ "+t);} };

console.log("═══ "+nombre);

/* ── lo que ya no debe estar en un archivo publicado ── */
comprobar("no quedan claves de demostración en el archivo",
  !/clave\s*:\s*"(1234|admin123)"/.test(html));
comprobar("no se imprime ninguna credencial en la pantalla de entrada",
  !/Demostraci[oó]n\s*[—–-]\s*[A-Z]+\s*\/\s*\d/.test(html));
comprobar("ya no hay lista de usuarios embebida",
  !/const\s+USUARIOS\s*=\s*\{/.test(html));
comprobar("la huella dejó de ser puerta de entrada",
  !/verificarHuella\([^)]*\)\.then\([^)]*setPaso\("sync"\)/s.test(html));
comprobar("existe la puerta (PuertaPortal)", /function PuertaPortal/.test(html));
if(esProv){
  comprobar("proveedor · login propio (correo + clave), sin enlace al portal",
    /signInWithPassword/.test(html) && !/href="\.\/index\.html"/.test(html));
  comprobar("proveedor · recuperación de clave propia (resetPasswordForEmail)",
    /resetPasswordForEmail/.test(html));
}else{
  comprobar("el enlace lleva al portal", /href="\.\/index\.html"/.test(html));
  comprobar("hay recuperación de clave", /index\.html#olvido/.test(html));
}
comprobar("cerrar sesión cierra de verdad (signOut)",
  /function salirDeVerdad/.test(html) && /auth\.signOut\(\)/.test(html));
comprobar("la puerta comprueba que la cuenta siga activa", /activo === false/.test(html));

/* ── comportamiento real ── */
function montar(conSesion, activo){
  const dom=new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/freelance/", runScripts:"outside-only", pretendToBeVisual:true });
  const w=dom.window;
  w.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{}; w.open=()=>null; w.print=()=>{}; w.navigator.vibrate=()=>{}; w.alert=()=>{};
  w.speechSynthesis={speak(){},cancel(){},getVoices:()=>[]};
  w.Notification=function(){}; w.Notification.permission="denied"; w.Notification.requestPermission=async()=>"denied";
  const salidas=[];
  const q=(tabla)=>{ const datos = tabla==="usuarios"
      ? [{usr_id:"SC-D1",nombre:"Luis Paredes",rol:"comisionista",activo:activo}] : [];
    const p=Promise.resolve({data:datos,error:null,count:0});
    ["select","eq","neq","in","order","limit","like","not","is"].forEach(m=>{p[m]=()=>q(tabla);});
    p.maybeSingle=()=>Promise.resolve({data:datos[0]||null,error:null}); p.single=p.maybeSingle;
    p.insert=()=>Promise.resolve({error:null}); p.upsert=()=>Promise.resolve({error:null});
    p.update=()=>{ const r=Promise.resolve({error:null}); r.eq=()=>r; return r; };
    p.delete=()=>{ const r=Promise.resolve({error:null}); r.eq=()=>r; return r; };
    return p; };
  w.SB={ auth:{
      getSession:async()=>(conSesion?{data:{session:{user:{id:"u1",email:"luis@ejemplo.com"}}}}:{data:{session:null}}),
      signOut:async()=>{ salidas.push("signOut"); return {}; },
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
    from:(t)=>q(t), rpc:async()=>({data:null}),
    channel:()=>({on(){return this;},subscribe(){return this;}}), removeChannel:()=>{},
    functions:{ invoke:async()=>({data:{},error:null}) },
    storage:{ from:()=>({ upload:async()=>({}), createSignedUrl:async()=>({data:null}) }) } };
  const ctx=dom.getInternalVMContext();
  vm.runInContext(react,ctx); vm.runInContext(reactDom,ctx); vm.runInContext(js,ctx);
  return { ctx, salidas };
}

const guion = `(async()=>{
  var cont=document.createElement("div"); document.body.appendChild(cont);
  ReactDOM.flushSync(function(){ ReactDOM.createRoot(cont).render(React.createElement(typeof Root!=="undefined"?Root:App)); });
  await new Promise(function(r){ setTimeout(r,600); });
  return (document.body.innerText||cont.textContent||"");
})()`;

(async()=>{
  const sin = await vm.runInContext(guion, montar(false,true).ctx);
  if(esProv){
    comprobar("SIN sesión (proveedor): se ve el formulario de correo y clave (botón Ingresar)", /Ingresar/i.test(sin));
  }else{
    comprobar("SIN sesión: se ve la invitación a entrar por el portal", /portal/i.test(sin));
    comprobar("SIN sesión: no pide usuario ni clave aquí", !/contrase|Iniciar sesi/i.test(sin));
  }

  const con = await vm.runInContext(guion, montar(true,true).ctx);
  comprobar("CON sesión: entra sin preguntar nada", !/Ir al portal/i.test(con) && con.length > 200);

  const baja = montar(true,false);
  const t = await vm.runInContext(guion, baja.ctx);
  comprobar("cuenta dada de baja: no entra y se le cierra la sesión",
    (esProv ? /Ingresar/i.test(t) : /portal/i.test(t)) && baja.salidas.indexOf("signOut") >= 0);

  console.log("Resultado "+nombre+": "+ok+" ✓ · "+mal+" ✗");
  process.exit(mal?1:0);
})().catch(e=>{ console.log("✗ "+String(e&&e.message||e).split("\n")[0]); process.exit(1); });
