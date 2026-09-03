/* ═══════════════════════════════════════════════════════════════════════
   CUENTAS DEL EQUIPO · sistema-web · contra el bundle real

   Rediseño de sep/2026: la pantalla quedó más ordenada y segura. Esta prueba
   conserva lo que ya se medía (carga del padrón, alta con enlace, dar acceso a
   quien ya existe, homónimos, validaciones) y agrega lo nuevo del alcance:

     · estado ÚNICO y excluyente por persona (Activo / Sin acceso / De baja);
     · una persona de baja jamás cuenta como pendiente;
     · una persona inactiva no ofrece «Generar enlace» ni «Cambiar correo»;
     · «Dar de baja» NO llama al servidor hasta confirmar en el diálogo;
     · no se puede dar de baja a la cuenta con la que uno entró («Tu cuenta»);
     · «Cambiar correo» valida y usa el texto del contrato real (enlace de
       recuperación; la persona conserva su clave);
     · «Nueva cuenta» empieza buscando en el padrón (ruta recomendada) y el
       formulario de persona nueva exige elegir un rol.

   NO SE ESCRIBE EN LA BASE: el `supa` de aquí es un doble que responde con la
   forma de producción y ANOTA lo que se le manda (nada se envía de verdad).

   Uso: node test_cuentas.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs=require("fs"), vm=require("vm");
const { JSDOM } = require("jsdom");
const R=require("./rutas");

const ruta = process.argv[2] || process.env.SISTEMA_WEB || R.app("sistema-web");
const html=fs.readFileSync(ruta,"utf-8");
const jsx=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const js=R.Babel.transform(jsx,{presets:["react"]}).code;
const react=R.reactDev();
const reactDom=R.reactDomDev();

let ok=0, mal=0;
const comprobar=(t,c)=>{ if(c){ok++;console.log("  ✓ "+t);} else {mal++;console.log("  ✗ "+t);} };
console.log("═══ Cuentas del equipo (rediseño)");

/* Padrón de prueba, con la forma de producción (snake_case):
   FRL-RR · Richard  · freelance    · con acceso · ACTIVO   · es «Tu cuenta» (mismo correo del login)
   SC1    · Carlos   · comisionista · sin correo · pendiente (Sin acceso)   · tiene homónimo
   TR-01  · Marlon   · transportista· inactivo   · De baja  · nunca tuvo acceso
   MC-09  · Diana    · logística    · inactivo PERO tiene_acceso=true → SOLO «De baja» */
const PADRON=[
  {usr_id:"FRL-RR",nombre:"Richard Ramírez",rol:"freelance",   email:"intesgo@gmail.com",prov_cod:null,telefono:"0999000111",activo:true, es_demo:false,tiene_acceso:true},
  {usr_id:"SC1",   nombre:"Carlos Andrade", rol:"comisionista",email:null,               prov_cod:null,telefono:null,       activo:true, es_demo:false,tiene_acceso:false},
  {usr_id:"TR-01", nombre:"Marlon Cedeño",  rol:"transportista",email:null,              prov_cod:null,telefono:null,       activo:false,es_demo:false,tiene_acceso:false},
  {usr_id:"MC-09", nombre:"Diana Boada",    rol:"logistica",   email:"diana@ejemplo.com",prov_cod:null,telefono:null,       activo:false,es_demo:false,tiene_acceso:true},
];
const PILAS=[{prov_cod:"AGU",nombre:"Piladora San Agustín"},{prov_cod:"ROS",nombre:"Piladora Santa Rosa"}];

let FALLA_CAMBIO=false;   // se activa para probar que un error del servidor deja el formulario abierto

function montar(){
  const dom=new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`,
    { url:"https://intesgo.app/home/", runScripts:"outside-only", pretendToBeVisual:true });
  const w=dom.window;
  w.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{}; w.alert=()=>{}; w.print=()=>{}; w.open=()=>null;
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
      if(c.accion==="cambiar_correo"){ if(FALLA_CAMBIO) return { data:{ error:"Ese correo ya está en uso." }, error:null };
        return { data:{ ok:true, enlace:"https://ejemplo/recuperar?token=recu" }, error:null }; }
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
  ReactDOM.flushSync(function(){ window.__raiz.render(React.createElement(CuentasWeb,{usuario:{usuario:"intesgo@gmail.com",nombre:"Richard Ramírez",rol:"freelance"}})); });
  window.__txt = function(){ return window.__cont.textContent || ""; };
  window.__flush = function(){ ReactDOM.flushSync(function(){}); };
  window.__click = function(texto){
    var bs = window.__cont.querySelectorAll("button, a");
    for(var i=0;i<bs.length;i++){ if((bs[i].textContent||"").indexOf(texto)>=0){ bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } }
    return false;
  };
  window.__clickAria = function(label){
    var bs = window.__cont.querySelectorAll("button, a");
    for(var i=0;i<bs.length;i++){ if((bs[i].getAttribute("aria-label")||"")===label){ bs[i].dispatchEvent(new window.MouseEvent("click",{bubbles:true})); return true; } }
    return false;
  };
  window.__set = function(sel, valor){
    var el = window.__cont.querySelector(sel);
    if(!el) return false;
    var proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    var set = Object.getOwnPropertyDescriptor(proto, "value").set;
    set.call(el, valor);
    el.dispatchEvent(new window.Event("input", { bubbles:true }));
    el.dispatchEvent(new window.Event("change", { bubbles:true }));
    return true;
  };
  window.__has = function(sel){ return !!window.__cont.querySelector(sel); };
  window.__val = function(sel){ var e=window.__cont.querySelector(sel); return e ? (e.value||"") : ""; };
  window.__fila = function(usr){ var e=window.__cont.querySelector('[data-usr="'+usr+'"]'); return e ? (e.textContent||"") : ""; };
`, m.ctx);

const esperar=(ms)=>new Promise(r=>setTimeout(r,ms||120));
const txt=()=>vm.runInContext("window.__txt()", m.ctx);
const click=(t)=>vm.runInContext('window.__click('+JSON.stringify(t)+')', m.ctx);
const clickAria=(t)=>vm.runInContext('window.__clickAria('+JSON.stringify(t)+')', m.ctx);
const set=(sel,val)=>vm.runInContext('window.__set('+JSON.stringify(sel)+','+JSON.stringify(val)+')', m.ctx);
const has=(sel)=>vm.runInContext('window.__has('+JSON.stringify(sel)+')', m.ctx);
const val=(sel)=>vm.runInContext('window.__val('+JSON.stringify(sel)+')', m.ctx);
const fila=(usr)=>vm.runInContext('window.__fila('+JSON.stringify(usr)+')', m.ctx);
const flush=()=>vm.runInContext("window.__flush()", m.ctx);

(async()=>{
  await esperar(260); flush();
  let t=txt();

  /* ── CARGA Y LISTA ── */
  comprobar("carga el padrón al abrir", t.indexOf("Richard Ramírez")>=0 && t.indexOf("Carlos Andrade")>=0);
  comprobar("tras cargar, la conexión dice «Conectado»", t.indexOf("Conectado")>=0);
  comprobar("marca a quien todavía no tiene acceso («Sin acceso»)", t.indexOf("Sin acceso")>=0);
  comprobar("marca a quien está de baja («De baja»)", t.indexOf("De baja")>=0);
  comprobar("no repite el título del módulo dentro del componente", t.indexOf("Cuentas del equipo")<0);
  comprobar("ya no usa la etiqueta vieja «Con acceso»", t.indexOf("Con acceso")<0);

  /* ── ESTADO ÚNICO Y EXCLUYENTE ── */
  comprobar("clasifica Activo / Sin acceso / De baja según la regla",
    /Activo/.test(fila("FRL-RR")) && /Sin acceso/.test(fila("SC1")) && /De baja/.test(fila("TR-01")));
  const fD=fila("MC-09");
  comprobar("una persona inactiva muestra ÚNICAMENTE «De baja» (aunque conserve tiene_acceso)",
    fD.indexOf("De baja")>=0 && fD.indexOf("Activo")<0 && fD.indexOf("Sin acceso")<0);
  comprobar("no aparecen dos estados principales en una misma fila",
    (function(){ var uno=true; ["FRL-RR","SC1","TR-01","MC-09"].forEach(function(u){
      var f=fila(u); var n=(/Activo/.test(f)?1:0)+(/Sin acceso/.test(f)?1:0)+(/De baja/.test(f)?1:0); if(n!==1) uno=false; }); return uno; })());
  comprobar("la persona inactiva NO ofrece «Generar enlace»", fD.indexOf("Generar enlace")<0);
  comprobar("la persona inactiva NO ofrece «Cambiar correo»", fD.indexOf("Cambiar correo")<0);
  comprobar("la persona inactiva ofrece «Reactivar»", fD.indexOf("Reactivar")>=0);

  /* ── CONTADORES ── */
  comprobar("el contador de pendientes excluye a los inactivos (Pendientes · 1)", /Pendientes\s*·\s*1/.test(t));
  comprobar("los inactivos se cuentan como De baja (De baja · 2)", /De baja\s*·\s*2/.test(t));
  comprobar("los activos se cuentan bien (Activos · 1)", /Activos\s*·\s*1/.test(t));

  /* ── BÚSQUEDA Y FILTROS ── */
  set("#cuentas-buscar","marlon"); await esperar(120); flush(); t=txt();
  comprobar("la búsqueda por nombre filtra la lista", t.indexOf("Marlon Cedeño")>=0 && t.indexOf("Richard Ramírez")<0);
  set("#cuentas-buscar","comisionista"); await esperar(120); flush(); t=txt();
  comprobar("la búsqueda también encuentra por rol", t.indexOf("Carlos Andrade")>=0 && t.indexOf("Marlon Cedeño")<0);
  set("#cuentas-buscar","diana@ejemplo.com"); await esperar(120); flush(); t=txt();
  comprobar("la búsqueda también encuentra por correo", t.indexOf("Diana Boada")>=0);
  set("#cuentas-buscar","FRL-RR"); await esperar(120); flush(); t=txt();
  comprobar("la búsqueda también encuentra por código", t.indexOf("Richard Ramírez")>=0 && t.indexOf("Carlos Andrade")<0);
  set("#cuentas-buscar",""); await esperar(80); flush();
  click("Pendientes"); await esperar(120); flush(); t=txt();
  comprobar("el filtro «Pendientes» muestra solo a quien está sin acceso y activo",
    t.indexOf("Carlos Andrade")>=0 && t.indexOf("Marlon Cedeño")<0 && t.indexOf("Diana Boada")<0);
  click("De baja"); await esperar(120); flush(); t=txt();
  comprobar("el filtro «De baja» muestra solo a los inactivos",
    t.indexOf("Marlon Cedeño")>=0 && t.indexOf("Diana Boada")>=0 && t.indexOf("Carlos Andrade")<0);
  click("Todos"); await esperar(120); flush();

  /* ── «TU CUENTA» Y AUTO-BAJA ── */
  comprobar("marca la cuenta con la que uno entró como «Tu cuenta»", fila("FRL-RR").indexOf("Tu cuenta")>=0);
  clickAria("Más acciones para Richard Ramírez"); await esperar(120); flush();
  comprobar("el menú de la propia cuenta NO ofrece «Dar de baja»", fila("FRL-RR").indexOf("Dar de baja")<0);
  comprobar("pero sí ofrece las acciones normales (Cambiar correo)", fila("FRL-RR").indexOf("Cambiar correo")>=0);
  clickAria("Más acciones para Richard Ramírez"); await esperar(80); flush();  // cerrar

  /* ── NUEVA CUENTA: empieza en el padrón (recomendado) ── */
  click("Nueva cuenta"); await esperar(150); flush(); t=txt();
  comprobar("el panel «Nueva cuenta» empieza en «Persona del padrón», marcado recomendado",
    t.indexOf("recomendado")>=0 && has("#nc-padron"));
  comprobar("y explica por qué buscar primero en el padrón", /conservar su código/.test(t));

  /* persona nueva: exige rol y valida correo/piladora */
  click("Persona nueva"); await esperar(120); flush(); t=txt();
  comprobar("«Persona nueva» abre el formulario con «Nombre completo»", has("#nc-nombre"));
  comprobar("el rol arranca sin elegir («Selecciona un rol»)", /Selecciona un rol/.test(t));
  set("#nc-nombre","Ana Torres"); set("#nc-correo","ana-arroba-nada"); await esperar(100);
  click("Crear cuenta"); await esperar(150); flush(); t=txt();
  comprobar("no deja crear con un correo mal escrito", /correo no se ve bien/.test(t));
  set("#nc-correo","ana@ejemplo.com"); await esperar(80);
  click("Crear cuenta"); await esperar(150); flush(); t=txt();
  comprobar("no deja crear sin elegir un rol", /Selecciona un rol para esta persona/.test(t));
  set("#nc-rol","proveedor"); await esperar(120); flush(); t=txt();
  comprobar("al elegir piladora aparece de cuál y por qué es obligatorio",
    t.indexOf("¿De qué piladora?")>=0 && /vería los pedidos de todas/.test(t));
  click("Crear cuenta"); await esperar(150); flush(); t=txt();
  comprobar("proveedor sigue exigiendo elegir piladora", /Elige de qué piladora/.test(t));
  set("#nc-rol","admin"); await esperar(120); flush(); t=txt();
  comprobar("un rol privilegiado (Administrador) avisa antes de confirmar", /permisos amplios/.test(t));
  set("#nc-rol","comisionista"); await esperar(120);
  click("Crear cuenta"); await esperar(320); flush(); t=txt();
  const alta=m.llamadas.find(c=>c.accion==="crear");
  comprobar("crea mandando nombre, correo y rol al servidor",
    !!alta && alta.nombre==="Ana Torres" && alta.email==="ana@ejemplo.com" && alta.rol==="comisionista");
  comprobar("no manda piladora cuando el rol no es piladora", !!alta && !alta.prov_cod);
  comprobar("muestra el enlace de invitación de un solo uso",
    t.indexOf("Acceso creado para")>=0 && val("#result-enlace").indexOf("verify?token=abc")>=0 && /un solo uso/.test(t));
  comprobar("ofrece copiar el enlace y mandarlo por WhatsApp",
    t.indexOf("Copiar enlace")>=0 && t.indexOf("Enviar por WhatsApp")>=0);
  click("Cerrar"); await esperar(120); flush();

  /* ── DAR ACCESO A QUIEN YA ESTÁ EN EL PADRÓN ── */
  click("Nueva cuenta"); await esperar(140); flush();
  set("#nc-padron","carlos"); await esperar(140); flush(); t=txt();
  comprobar("busca en el padrón a la gente sin acceso", t.indexOf("Carlos Andrade")>=0);
  click("Carlos Andrade"); await esperar(150); flush(); t=txt();
  comprobar("al elegirla, ofrece darle acceso conservando su código e historial",
    /conserva su código/.test(t) && has("#acc-correo"));
  set("#acc-correo","no-es-correo"); await esperar(100);
  click("Dar acceso y generar enlace"); await esperar(200); flush(); t=txt();
  comprobar("no da acceso con un correo mal escrito",
    /correo no se ve bien/.test(t) && !m.llamadas.some(c=>c.accion==="dar_acceso"));
  set("#acc-correo","carlos@ejemplo.com"); await esperar(100);
  click("Dar acceso y generar enlace"); await esperar(350); flush(); t=txt();
  const acceso=m.llamadas.find(c=>c.accion==="dar_acceso");
  comprobar("da acceso al usr_id que ya existía, no a uno nuevo",
    !!acceso && acceso.usr_id==="SC1" && acceso.email==="carlos@ejemplo.com");
  comprobar("y muestra su enlace de invitación", val("#result-enlace").indexOf("ya-estaba")>=0);
  click("Cerrar"); await esperar(120); flush();

  /* ── HOMÓNIMO EN EL ALTA NUEVA ── */
  click("Nueva cuenta"); await esperar(140); flush();
  click("Persona nueva"); await esperar(120); flush();
  vm.runInContext(`(function(){
    var el=window.__cont.querySelector("#nc-nombre");
    var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
    set.call(el,"Carlos Andrade");
    el.dispatchEvent(new window.Event("input",{bubbles:true}));
    el.dispatchEvent(new window.FocusEvent("focusout",{bubbles:true}));
  })()`, m.ctx);
  await esperar(400); flush(); t=txt();
  comprobar("avisa que ese nombre ya está en el padrón", /ya está en el padrón/.test(t));
  comprobar("y ofrece darle acceso sobre su ficha de siempre", /Dar acceso a Carlos Andrade · SC1/.test(t));
  vm.runInContext('window.__cont.dispatchEvent(new window.KeyboardEvent("keydown",{key:"Escape",bubbles:true}))', m.ctx);
  await esperar(120); flush(); t=txt();
  comprobar("Escape cierra el panel de nueva cuenta", !has("#nc-nombre") && !has("#nc-padron"));

  /* ── DAR DE BAJA: CON CONFIRMACIÓN ── */
  const antesBaja=m.llamadas.filter(c=>c.accion==="estado").length;
  clickAria("Más acciones para Carlos Andrade"); await esperar(120); flush();
  click("Dar de baja"); await esperar(150); flush(); t=txt();
  comprobar("«Dar de baja» abre confirmación y NO llama al servidor todavía",
    /¿Dar de baja a Carlos Andrade\?/.test(t) && m.llamadas.filter(c=>c.accion==="estado").length===antesBaja);
  comprobar("la confirmación explica que pierde el acceso pero conserva su historial",
    /perderá inmediatamente el acceso/.test(t) && /no se eliminarán/.test(t));
  click("Cancelar"); await esperar(150); flush();
  comprobar("cancelar la baja no manda ninguna solicitud", m.llamadas.filter(c=>c.accion==="estado").length===antesBaja);
  clickAria("Más acciones para Carlos Andrade"); await esperar(120); flush();
  click("Dar de baja"); await esperar(150); flush();
  click("Confirmar baja"); await esperar(300); flush(); t=txt();
  const baja=m.llamadas.find(c=>c.accion==="estado");
  comprobar("confirmar la baja envía usr_id y activo:false", !!baja && baja.usr_id==="SC1" && baja.activo===false);
  comprobar("y lo confirma en pantalla", /ya no puede entrar/.test(t));

  /* ── CAMBIAR CORREO ── */
  clickAria("Más acciones para Richard Ramírez"); await esperar(120); flush();
  click("Cambiar correo"); await esperar(150); flush(); t=txt();
  comprobar("«Cambiar correo» abre el formulario con el correo actual", has("#camb-correo") && t.indexOf("intesgo@gmail.com")>=0);
  set("#camb-correo","no-es-correo"); await esperar(100);
  click("Guardar correo"); await esperar(200); flush(); t=txt();
  comprobar("rechaza un correo mal escrito", /correo no se ve bien/.test(t) && !m.llamadas.some(c=>c.accion==="cambiar_correo"));
  set("#camb-correo","intesgo@gmail.com"); await esperar(100);
  click("Guardar correo"); await esperar(200); flush(); t=txt();
  comprobar("rechaza el mismo correo actual", /ya es su correo actual/.test(t) && !m.llamadas.some(c=>c.accion==="cambiar_correo"));
  /* error del servidor: el formulario queda abierto */
  FALLA_CAMBIO=true;
  set("#camb-correo","nuevo@ejemplo.com"); await esperar(100);
  click("Guardar correo"); await esperar(250); flush(); t=txt();
  comprobar("un error del servidor deja el formulario abierto con el motivo",
    has("#camb-correo") && /ya está en uso/.test(t));
  FALLA_CAMBIO=false;
  set("#camb-correo","nuevo@ejemplo.com"); await esperar(100);
  click("Guardar correo"); await esperar(300); flush(); t=txt();
  const camb=m.llamadas.find(c=>c.accion==="cambiar_correo" && c.email==="nuevo@ejemplo.com");
  comprobar("un cambio válido envía accion:cambiar_correo con usr_id y el correo nuevo",
    !!camb && camb.usr_id==="FRL-RR" && camb.email==="nuevo@ejemplo.com");
  comprobar("el éxito usa el texto del contrato real (recuperación · conserva su clave)",
    /Correo actualizado para/.test(t) && /conserva su clave/.test(t) && val("#result-enlace").indexOf("recuperar?token=recu")>=0);
  comprobar("no promete «crear una clave nueva» en el cambio de correo", t.indexOf("crea tu clave")<0);
  click("Cerrar"); await esperar(120); flush();

  console.log("Resultado: "+ok+" ✓ · "+mal+" ✗ · "+(ok+mal)+" comprobaciones");
  process.exit(mal?1:0);
})().catch(e=>{ console.log("✗ "+String(e&&e.stack||e).split("\n").slice(0,3).join("\n")); process.exit(1); });
