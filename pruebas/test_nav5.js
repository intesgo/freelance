/* Mensajes accesible desde la barra/acceso fijo en LAS 5 APPS */
const fs=require("fs");
let ok=0,fallo=0;
const prueba=(n,c)=>{ if(c){ok++;console.log("  ✓",n);} else {fallo++;console.log("  ✗ FALLO:",n);} };
const bundle=(f)=>{ const h=fs.readFileSync(require("path").join(require("./rutas").RAIZ,"dist",f),"utf-8");
  return [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0]; };
const entre=(js,d,h)=>{ const i=js.indexOf(d); const j=js.indexOf(h,i); return i<0?"":js.slice(i,j); };

/* las 5 tienen contador en vivo */
for(const f of ["freelance-completo.html","Comisionista.html","socio-comercial.html","proveedor-freelance.html","transportista-app.html"]){
  const js=bundle(f); const nom=f.split(".")[0].slice(0,13);
  prueba(nom+": globo de no leídos en vivo", js.includes("sinLeerChat") && js.includes('"chat-badge"'));
}
/* barra inferior con Mensajes al final */
for(const [f,patron] of [["freelance-completo.html",'tocarTab("mensajes")'],
                          ["Comisionista.html",'tocarTab("mensajes")'],
                          ["socio-comercial.html",'tocarTab("mensajes")'],
                          ["proveedor-freelance.html",'irTab("mensajes")']]){
  const js=bundle(f); const nom=f.split(".")[0].slice(0,13);
  prueba(nom+": Mensajes es botón de la barra inferior", js.includes(patron));
}
/* proveedor: Reportes salió de la barra y está en el menú */
{
  const js=bundle("proveedor-freelance.html");
  /* el compilado formatea con saltos: se toma el tramo de la barra por longitud */
  const iNav=Math.max(js.indexOf('className: "nav"'), js.indexOf('className:"nav"'));
  const nav=js.slice(iNav, iNav+1400);
  const menu=entre(js,"const GRUPOS","const item");
  prueba("proveedor: Reportes ya no ocupa lugar en la barra", !nav.includes('"Reportes"'));
  prueba("proveedor: Reportes quedó en el menú", menu.includes('"reportes"'));
  prueba("proveedor: la barra sigue con 5 botones", (nav.match(/createElement\(NavBtn/g)||[]).length===5);
}
/* transportista: acceso fijo que se oculta dentro del chat */
{
  const js=bundle("transportista-app.html");
  prueba("transportista: acceso fijo a Mensajes", /seccion !== "mensajes"|seccion!=="mensajes"/.test(js) && js.includes('setSeccion("mensajes")'));
}
console.log("\nResultado: "+ok+" ✓ · "+fallo+" ✗");
process.exit(fallo?1:0);
