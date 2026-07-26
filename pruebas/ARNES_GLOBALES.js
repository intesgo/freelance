/* ═══════════════════════════════════════════════════════════════════════
   ARNÉS DE IDENTIFICADORES LIBRES · el que faltaba (FA-0003, 26 jul 2026)

   Qué caza: cualquier nombre que el código USA pero nadie DECLARA. Es la
   familia de bugs más cara de este proyecto — compila limpio, pasa Babel, y
   revienta recién al renderizar. Y como estas apps no tienen red de seguridad
   de React, un error de render NO rompe una sección: DESMONTA LA APP ENTERA y
   el usuario ve una pantalla en blanco donde sea que estuviera parado.

   Por qué no bastaban los arneses anteriores: renderizan componentes con una
   bolsa de props inventada. Si la bolsa trae `usuario` y la app real no se lo
   pasa, el bug es invisible por construcción. Este arnés no ejecuta nada: lee
   el código y pregunta quién declaró cada nombre.

   No grita por los accesos protegidos a propósito — `typeof X !== "undefined"`
   o dentro de un try — porque en este proyecto son un patrón legítimo: hay
   tablas que viven en unas apps y en otras no.

   Uso:  node ARNES_GLOBALES.js archivo1.html archivo2.html …
   Sale con código 1 si encuentra algo sin declarar y sin proteger.
   ═══════════════════════════════════════════════════════════════════════ */
const fs=require("fs");
const Babel=require("./rutas").Babel;

/* Nombres que sí existen aunque nadie los declare aquí: el navegador, las
   librerías que entran por CDN y las globales del entorno. */
const CONOCIDOS=new Set([
  "window","document","navigator","location","history","screen","console",
  "localStorage","sessionStorage","fetch","alert","confirm","prompt","atob","btoa",
  "setTimeout","clearTimeout","setInterval","clearInterval","requestAnimationFrame",
  "cancelAnimationFrame","Promise","Object","Array","String","Number","Boolean","Math",
  "JSON","Date","RegExp","Error","TypeError","Map","Set","WeakMap","WeakSet","Symbol",
  "Intl","URL","URLSearchParams","Blob","File","FileReader","FormData","Image","Audio",
  "Notification","AbortController","TextEncoder","TextDecoder","CustomEvent","Event",
  "MutationObserver","IntersectionObserver","ResizeObserver","structuredClone",
  "Uint8Array","Uint16Array","Uint32Array","Int8Array","Float32Array","Float64Array",
  "ArrayBuffer","DataView","isFinite","DOMParser","XMLSerializer","XMLHttpRequest",
  "isNaN","parseInt","parseFloat","encodeURIComponent","decodeURIComponent","escape",
  "arguments","undefined","NaN","Infinity","globalThis","self","top","parent","crypto","performance",
  "React","ReactDOM","Babel","supabase","XLSX","L","Chart","html2canvas","jspdf",
  "SpeechRecognition","webkitSpeechRecognition","speechSynthesis","SpeechSynthesisUtterance",
  "MediaRecorder","AudioContext","webkitAudioContext","caches","indexedDB","matchMedia",
  "getComputedStyle","scrollTo","open","print","process","require","module","exports",
]);

/* ¿el árbol contiene `typeof <nombre>`? */
function preguntaPorEl(nodo, nombre){
  if(!nodo || typeof nodo!=="object") return false;
  if(nodo.type==="UnaryExpression" && nodo.operator==="typeof"
     && nodo.argument && nodo.argument.type==="Identifier" && nodo.argument.name===nombre) return true;
  for(const k of Object.keys(nodo)){
    if(k==="loc"||k==="start"||k==="end"||k==="leadingComments"||k==="trailingComments") continue;
    const v=nodo[k];
    if(Array.isArray(v)){ for(const x of v) if(preguntaPorEl(x,nombre)) return true; }
    else if(v && typeof v==="object" && v.type){ if(preguntaPorEl(v,nombre)) return true; }
  }
  return false;
}

/* Una referencia está protegida si es el propio `typeof`, si vive dentro de un
   try, o si cuelga de una condición que preguntó `typeof <nombre>` antes. */
function estaProtegida(camino, nombre){
  const padre=camino.parent;
  if(padre && padre.type==="UnaryExpression" && padre.operator==="typeof") return true;
  let p=camino.parentPath;
  while(p){
    const n=p.node;
    if(n.type==="TryStatement") return true;
    if(n.type==="ConditionalExpression" && preguntaPorEl(n.test,nombre)) return true;
    if(n.type==="IfStatement" && preguntaPorEl(n.test,nombre)) return true;
    if(n.type==="LogicalExpression" && preguntaPorEl(n.left,nombre)) return true;
    p=p.parentPath;
  }
  return false;
}

let totalMal=0;
for(const ruta of process.argv.slice(2)){
  const nombre=ruta.split("/").pop();
  const html=fs.readFileSync(ruta,"utf-8");
  const m=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
  if(!m){ console.log("— "+nombre+": sin bloque babel, se omite"); continue; }
  const desfase=html.slice(0,m.index).split("\n").length-1;

  const sueltos=new Map();     /* nombre → primera línea desprotegida */
  const protegidos=new Set();
  Babel.transform(m[1], {
    presets:["react"],
    plugins:[function(){
      return { visitor:{ Identifier(camino){
        const nom=camino.node.name;
        if(CONOCIDOS.has(nom)) return;
        if(!camino.isReferencedIdentifier || !camino.isReferencedIdentifier()) return;
        if(camino.scope.hasBinding(nom, true)) return;
        if(estaProtegida(camino,nom)){ protegidos.add(nom); return; }
        if(!sueltos.has(nom)){
          const l=(camino.node.loc && camino.node.loc.start.line) || 0;
          sueltos.set(nom, l+desfase);
        }
      }}};
    }],
  });

  if(!sueltos.size){
    console.log("✓ "+nombre+": sin nombres sueltos"
      + (protegidos.size ? ("  (" + protegidos.size + " protegido(s) con typeof/try: "
          + [...protegidos].join(", ") + ")") : ""));
    continue;
  }
  console.log("✗ "+nombre+": "+sueltos.size+" nombre(s) usados sin declarar y SIN protección");
  for(const [nom,linea] of sueltos){ console.log("    · "+nom+"  → línea "+linea); totalMal++; }
}
console.log(totalMal ? ("\n"+totalMal+" identificador(es) sueltos. NO publicar: son pantallas en blanco esperando.")
                     : "\nSin identificadores sueltos.");
process.exit(totalMal?1:0);
