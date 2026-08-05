/* Prueba funcional del chat de las apps (extraído del compilado real de fc) */
const fs=require("fs");
const html=fs.readFileSync(require("path").join(require("./rutas").RAIZ,"dist","freelance-completo.html"),"utf-8");
const bundle=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
const i=bundle.indexOf("function ChatEquipo"), j=bundle.indexOf("function AdjuntoChatApp");
const k=bundle.indexOf("function Inicio(", j);
const cuerpo=bundle.slice(i,k);
let ok=0,fallo=0;
const prueba=(n,c)=>{ if(c){ok++;console.log("  ✓",n);} else {fallo++;console.log("  ✗ FALLO:",n);} };
function textoDe(n){ if(n==null||n===false) return "";
  if(typeof n==="string"||typeof n==="number") return String(n)+" ";
  if(Array.isArray(n)) return n.map(textoDe).join("");
  if(n&&n.props) return n.props.children?textoDe(n.props.children):""; return ""; }
function clicksDe(n,l){ if(!n||typeof n!=="object") return;
  if(Array.isArray(n)) return n.forEach(x=>clicksDe(x,l));
  if(n.props){ if(n.props.onClick) l.push({fn:n.props.onClick, t:textoDe(n).trim(),
    etiqueta:n.props["aria-label"]||""}); clicksDe(n.props.children,l); } }

function montar(valores, SB, extras){
  let idx=0; const sets={}; const efectos=[];
  const React={ createElement:(t,p,...h)=>typeof t==="function"?t({...(p||{}),children:h}):{t,props:{...(p||{}),children:h}},
    useEffect:(fn)=>efectos.push(fn), useRef:(v)=>({current:v}), Fragment:"f" };
  const sandbox={ React,
    useState:(v)=>{ const n=idx++; const val=(n in valores)?valores[n]:v; sets[n]=sets[n]||[];
      return [val, x=>sets[n].push(typeof x==="function"?x(val):x)]; },
    window:{SB}, navigator:{}, MediaRecorder:function(){}, Blob:function(){},
    Date, Math, String, Number, Object, Array, ...(extras||{}) };
  const fn=new Function(...Object.keys(sandbox), cuerpo+"\nreturn ChatEquipo;");
  const Comp=fn(...Object.values(sandbox));
  const avisos=[];
  const arbol=Comp({usuario:{nombre:"Richard"}, toast:m=>avisos.push(m)});
  return {arbol, sets, efectos, avisos, texto:textoDe(arbol)};
}

(async()=>{
  /* 1 · sin sesión: mensaje honesto, sin romper */
  {
    const SB={ auth:{ getSession: async()=>({data:{session:null}}) } };
    const r=montar({5:"sin-sesion"}, SB);
    prueba("sin sesión: invita a entrar por el portal", r.texto.includes("Entra con tu cuenta"));
    await r.efectos[0]();
    prueba("sin sesión: no revienta y marca el estado", r.sets[5] && r.sets[5][0]==="sin-sesion");
  }
  /* 2 · con sesión: carga contactos y mensajes, y se suscribe al tiempo real */
  {
    let suscrito=false, tablas=[];
    const datos={
      usuarios:[{usr_id:"LOG-01",nombre:"Diana Boada",rol:"logistica",activo:true},
                {usr_id:"SC1",nombre:"Carlos Andrade",rol:"comisionista",activo:true}],
      chat_mensajes:[{msg_id:"CH-1",de_usr:"LOG-01",para_usr:"FRL-RR",tipo:"texto",texto:"¿Salió el viaje?",creado:"2026-07-25T14:30:00Z",leido:false}],
    };
    function consulta(t){
      tablas.push(t);
      const api={};
      ["select","neq","eq","order"].forEach(m=>api[m]=()=>api);
      api.limit=async()=>({data:datos[t]||[]});
      api.maybeSingle=async()=>({data: t==="usuarios" ? {usr_id:"FRL-RR"} : null});
      api.then=(f)=>Promise.resolve({data:datos[t]||[]}).then(f);
      api.update=()=>({ eq:()=>({ eq:()=>({ eq:async()=>({}) }) }) });
      api.insert=async(fila)=>{ datos.__insert=fila; return {error:null}; };
      return api;
    }
    const SB={ auth:{ getSession: async()=>({data:{session:{user:{id:"u1",email:"intesgo@gmail.com"}}}}) },
      from:consulta,
      channel:()=>({ on:function(){return this;}, subscribe:function(){ suscrito=true; return this; } }),
      removeChannel:()=>{} };
    const r=montar({}, SB);
    await r.efectos[0]();
    await new Promise(x=>setTimeout(x,40));
    prueba("con sesión: identifica quién soy en el padrón", r.sets[0] && r.sets[0][0]==="FRL-RR");
    prueba("con sesión: lista a los compañeros con su rol",
      r.sets[1] && r.sets[1][0].length===2 && r.sets[1][0][0].nombre==="Diana Boada" && r.sets[1][0][0].rol==="Logística");
    prueba("con sesión: trae la conversación y sabe quién escribió",
      r.sets[2] && r.sets[2][0][0].con==="LOG-01" && r.sets[2][0][0].mio===false);
    prueba("con sesión: queda escuchando en tiempo real", suscrito && r.sets[5][0]==="vivo");
  }
  /* 3 · lista de conversaciones y no leídos */
  {
    const msgs=[{id:"CH-1",con:"LOG-01",mio:false,tipo:"texto",texto:"¿Salió el viaje?",hora:"14:30",leido:false}];
    const conts=[{id:"LOG-01",nombre:"Diana Boada",rol:"Logística",ico:"🗺️"}];
    const r=montar({0:"FRL-RR",1:conts,2:msgs,3:null,5:"vivo"}, {});
    prueba("lista: muestra el contacto, su último mensaje y el no leído",
      r.texto.includes("Diana Boada") && r.texto.includes("¿Salió el viaje?") && r.texto.includes("1"));
    prueba("lista: sello en vivo", r.texto.includes("En vivo"));
  }
  /* 4 · enviar un mensaje escribe en la base con el remitente correcto */
  {
    let insertado=null;
    const SB={ from:()=>({ insert: async(f)=>{ insertado=f; return {error:null}; },
      update:()=>({ eq:()=>({ eq:()=>({ eq:async()=>({}) }) }) }) }) };
    const msgs=[]; const conts=[{id:"LOG-01",nombre:"Diana",rol:"Logística",ico:"🗺️"}];
    const r=montar({0:"FRL-RR",1:conts,2:msgs,3:"LOG-01",4:"Ya salió, gracias",5:"vivo",7:false}, SB);
    const clicks=[]; clicksDe(r.arbol,clicks);
    const enviar=clicks.find(c=>c.etiqueta==="Enviar" || c.t.includes("Enviar"));
    await enviar.fn(); await new Promise(x=>setTimeout(x,30));
    prueba("enviar: guarda el mensaje con emisor y destinatario correctos",
      insertado && insertado.de_usr==="FRL-RR" && insertado.para_usr==="LOG-01"
      && insertado.texto==="Ya salió, gracias" && insertado.tipo==="texto" && insertado.es_demo===false);
    prueba("enviar: aparece al instante en la conversación",
      r.sets[2] && r.sets[2].some(l=>Array.isArray(l) && l.some(m=>m.texto==="Ya salió, gracias" && m.mio)));
  }
  /* 5 · detalles visuales nuevos: separador por día, palomitas y agrupado */
  {
    const hoy=new Date().toISOString().slice(0,10);
    const ayer=new Date(new Date().getTime()-86400000).toISOString().slice(0,10);
    const msgs=[
      {id:"A",con:"LOG-01",mio:false,tipo:"texto",texto:"Ayer te escribí",hora:"09:00",fecha:ayer,leido:true},
      {id:"B",con:"LOG-01",mio:true,tipo:"texto",texto:"Hola",hora:"18:39",fecha:hoy,leido:false},
      {id:"C",con:"LOG-01",mio:true,tipo:"texto",texto:"¿Salió el viaje?",hora:"18:40",fecha:hoy,leido:true},
    ];
    const conts=[{id:"LOG-01",nombre:"Diana Boada",rol:"Logística",ico:"🗺️"}];
    const r=montar({0:"FRL-RR",1:conts,2:msgs,3:"LOG-01",4:"",5:"vivo"}, {});
    prueba("separadores por día (Ayer / Hoy)", r.texto.includes("Ayer") && r.texto.includes("Hoy"));
    prueba("palomita simple en lo enviado y doble en lo leído",
      r.texto.includes("✓") && r.texto.includes("✓✓"));
    prueba("estado vacío con invitación clara",
      /Escríbele a\s+Diana Boada/.test(montar({0:"FRL-RR",1:conts,2:[],3:"LOG-01",5:"vivo"},{}).texto));
    prueba("el botón enviar se apaga sin texto",
      /background:\s*txt\.trim\(\)\s*\?/.test(cuerpo));
  }
  console.log("\nResultado: "+ok+" ✓ · "+fallo+" ✗");
  process.exit(fallo?1:0);
})();
