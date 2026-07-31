/* Prueba del módulo Cuentas del equipo (sistema-web v47), contra el bundle real. */
const fs=require("fs"), vm=require("vm");
const { JSDOM } = require("jsdom");
const Babel=require("./rutas").Babel;

const ruta = process.env.SISTEMA_WEB || "/tmp/freelance_work/Freelance-Sistema/sistema-web.html";
const html=fs.readFileSync(ruta,"utf-8");
const jsx=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js=Babel.transform(jsx,{presets:["react"]}).code;
const react=require("./rutas").reactDev();
const reactDom=require("./rutas").reactDomDev();

let ok=0, mal=0;
const comprobar=(t,c)=>{ if(c){ok++;console.log("  ✓ "+t);} else {mal++;console.log("  ✗ "+t);} };
console.log("═══ Cuentas del equipo");

const PADRON=[
  {usr_id:"FRL-RR",nombre:"Richard Ramírez",rol:"freelance",email:"intesgo@gmail.com",prov_cod:null,activo:true,es_demo:false,tiene_acceso:true},
  {usr_id:"SC1",nombre:"Carlos Andrade",rol:"comisionista",email:null,prov_cod:null,activo:true,es_demo:false,tiene_acceso:false},
  {usr_id:"TR-01",nombre:"Marlon Cedeño",rol:"transportista",email:null,prov_cod:null,activo:false,es_demo:false,tiene_acceso:false},
];
const PILAS=[{prov_cod:"AGU",nombre:"Piladora San Agustín"},{prov_cod:"ROS",nombre:"Piladora Santa Rosa"}];

function montar(){
  const dom=new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.github.io/", runScripts:"outside-only", pretendToBeVisual:true });
  const w=dom.window;
  w.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{}; w.alert=()=>{}; w.print=()=>{};
  w.navigator.clipboard={ writeText:()=>Promise.resolve() };
  const llamadas=[];
  w.supa={
    auth:{ getSession:async()=>({data:{session:null}}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}) },
    from:()=>{ const p=Promise.resolve({data:[],error:null});
      ["select","eq","order","limit","in","is"].forEach(m=>{p[m]=()=>p;});
      p.maybeSingle=()=>Promise.resolve({data:null,error:null}); return p; },
    functions:{ invoke: async (nombre, opciones)=>{
      const c=(opciones&&opciones.body)||{};
      llamadas.push(c);
      if(c.accion==="listar") return { data:{ gente:PADRON, piladoras:PILAS }, error:null };
      if(c.accion==="crear")  return { data:{ ok:true, usr_id:"SC-02", enlace:"https://ejemplo/verify?token=abc" }, error:null };
      if(c.accion==="estado") return { data:{ ok:true }, error:null };
      if(c.accion==="enlace") return { data:{ ok:true, enlace:"https://ejemplo/verify?token=zzz" }, error:null };
      if(c.accion==="dar_acceso") return { data:{ ok:true, usr_id:c.usr_id, nombre:"Carlos Andrade",
        enlace:"https://ejemplo/verify?token=ya-estaba" }, error:null };
      if(c.accion==="parecidos") return { data:{ parecidos:
        /carlos/i.test(String(c.nombre||"")) ? [{usr_id:"SC1",nombre:"Carlos Andrade",rol:"comisionista"}] : [] }, error:null };
      return { data:{ error:"acción desconocida" }, error:null };
    }},
  };
  const ctx=dom.getInternalVMContext();
  vm.runInContext(react,ctx); vm.runInContext(reactDom,ctx); vm.runInContext(js,ctx);
  return { ctx, w, llamadas };
}

const m=montar();
vm.runInContext(`
  window.__cont = document.createElement("div"); document.body.appendChild(window.__cont);
  window.__raiz = ReactDOM.createRoot(window.__cont);
  ReactDOM.flushSync(function(){ window.__raiz.render(React.createElement(CuentasWeb,{usuario:{nombre:"Richard",rol:"freelance"}})); });
  window.__txt = function(){ return window.__cont.textContent || ""; };
  window.__click = function(texto){
    var bs = window.__cont.querySelectorAll("button, a");
    for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto)>=0){ bs[i].click(); return true; } }
    return false;
  };
  window.__poner = function(idx, valor){
    var ins = window.__cont.querySelectorAll("input, select");
    if(!ins[idx]) return false;
    var el = ins[idx];
    var proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    var set = Object.getOwnPropertyDescriptor(proto, "value").set;
    set.call(el, valor);
    el.dispatchEvent(new window.Event("input", { bubbles:true }));
    el.dispatchEvent(new window.Event("change", { bubbles:true }));
    return true;
  };
`, m.ctx);

(async()=>{
  const esperar=(ms)=>new Promise(r=>setTimeout(r,ms||120));
  await esperar(250);
  let t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("carga el padrón al abrir", t.indexOf("Richard Ramírez")>=0 && t.indexOf("Carlos Andrade")>=0);
  comprobar("marca a quien todavía no tiene acceso", t.indexOf("Sin acceso")>=0);
  comprobar("marca a quien está de baja", t.indexOf("De baja")>=0);
  comprobar("avisa cuántos faltan por habilitar", /2 personas sin acceso/.test(t));
  comprobar("dice que la clave no pasa por las manos de Richard", /clave nunca pasa por tus manos/.test(t));

  vm.runInContext('window.__click("Nueva cuenta")', m.ctx);
  await esperar(150);
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("el formulario se abre", t.indexOf("Nombre completo")>=0);

  /* correo mal escrito */
  vm.runInContext('window.__poner(1,"Ana Torres"); window.__poner(2,"ana-arroba-nada")', m.ctx);
  await esperar(120);
  vm.runInContext('window.__click("Crear cuenta")', m.ctx);
  await esperar(200);
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("no deja crear con un correo mal escrito", /correo no se ve bien/.test(t));

  /* piladora sin elegir */
  vm.runInContext('window.__poner(2,"ana@ejemplo.com"); window.__poner(3,"proveedor")', m.ctx);
  await esperar(150);
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("al elegir piladora aparece de cuál", t.indexOf("¿De qué piladora?")>=0);
  comprobar("explica por qué es obligatorio", /vería los pedidos de todas/.test(t));
  vm.runInContext('window.__click("Crear cuenta")', m.ctx);
  await esperar(200);
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("no deja crear una piladora sin decir cuál", /Elige de qué piladora/.test(t));

  /* alta buena · DES-012 · desde el sistema web ya nadie se crea con el
     nombre viejo: el formulario solo ofrece "comisionista". */
  vm.runInContext('window.__poner(3,"comisionista")', m.ctx);
  await esperar(150);
  vm.runInContext('window.__click("Crear cuenta")', m.ctx);
  await esperar(300);
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("crea y muestra el enlace de invitación", t.indexOf("Cuenta creada para")>=0 && t.indexOf("verify?token=abc")>=0);
  comprobar("ofrece mandarlo por WhatsApp", t.indexOf("Enviar por WhatsApp")>=0);
  const alta=m.llamadas.find(c=>c.accion==="crear");
  comprobar("manda al servidor el nombre, el correo y el rol",
    !!alta && alta.nombre==="Ana Torres" && alta.email==="ana@ejemplo.com" && alta.rol==="comisionista");
  comprobar("no manda piladora cuando el rol no es piladora", !!alta && !alta.prov_cod);

  /* baja */
  vm.runInContext('window.__click("Dar de baja")', m.ctx);
  await esperar(250);
  const baja=m.llamadas.find(c=>c.accion==="estado");
  comprobar("dar de baja avisa al servidor con el usuario correcto", !!baja && baja.activo===false && !!baja.usr_id);
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("y lo confirma en pantalla", /ya no puede entrar/.test(t));

  /* ── v2 · dar acceso a quien YA está en el padrón ──
     El error fácil: crear una ficha nueva para alguien que ya trabaja con
     Richard. Quedaría dos veces y sus pedidos viejos, huérfanos. */
  vm.runInContext('window.__click("Dar acceso")', m.ctx);
  await esperar(200);
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("ofrece dar acceso a quien ya está en el padrón", /mantiene su código/.test(t));
  comprobar("explica que conserva su historial", /todo lo que ya hizo/.test(t));

  /* el correo mal escrito tampoco pasa por este camino */
  const idCorreo = vm.runInContext(`(function(){
    var ins = window.__cont.querySelectorAll("input");
    for(var i=0;i<ins.length;i++){ if((ins[i].placeholder||"").indexOf("correo@") >= 0) return i; }
    return -1; })()`, m.ctx);
  comprobar("el formulario de acceso pide el correo", idCorreo >= 0);
  vm.runInContext('window.__poner('+idCorreo+',"esto-no-es-correo")', m.ctx);
  await esperar(120);
  vm.runInContext('window.__click("Crear acceso")', m.ctx);
  await esperar(200);
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("no da acceso con un correo mal escrito",
    /correo no se ve bien/.test(t) && !m.llamadas.some(c=>c.accion==="dar_acceso"));

  vm.runInContext('window.__poner('+idCorreo+',"carlos@ejemplo.com")', m.ctx);
  await esperar(120);
  vm.runInContext('window.__click("Crear acceso")', m.ctx);
  await esperar(350);
  const acceso = m.llamadas.find(c=>c.accion==="dar_acceso");
  comprobar("manda al servidor el usuario que ya existe, no uno nuevo",
    !!acceso && acceso.usr_id==="SC1" && acceso.email==="carlos@ejemplo.com");
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("y muestra su enlace de invitación", /ya-estaba/.test(t));

  /* ── el aviso de homónimo en el formulario de alta ── */
  vm.runInContext('window.__click("Nueva cuenta")', m.ctx);
  await esperar(200);
  vm.runInContext(`(function(){
    var ins = window.__cont.querySelectorAll("input");
    for(var i=0;i<ins.length;i++){
      if((ins[i].placeholder||"").indexOf("Carlos Andrade") >= 0){
        var set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
        set.call(ins[i], "Carlos Andrade");
        ins[i].dispatchEvent(new window.Event("input",{bubbles:true}));
        ins[i].dispatchEvent(new window.FocusEvent("focusout",{bubbles:true}));   /* React escucha focusout, no blur */
        return true;
      }
    }
    return false; })()`, m.ctx);
  await esperar(400);
  t=vm.runInContext("window.__txt()", m.ctx);
  comprobar("avisa que ese nombre ya está en el padrón", /ya está en el padrón/.test(t));
  comprobar("y ofrece darle acceso sobre su ficha de siempre", /Dar acceso a Carlos Andrade · SC1/.test(t));

  console.log("Resultado: "+ok+" ✓ · "+mal+" ✗");
  process.exit(mal?1:0);
})().catch(e=>{ console.log("✗ "+String(e&&e.message||e).split("\n")[0]); process.exit(1); });
