/* Menús tras mover Mensajes a la barra inferior (fc, comi, socio) */
const fs=require("fs");
let ok=0,fallo=0;
const prueba=(n,c)=>{ if(c){ok++;console.log("  ✓",n);} else {fallo++;console.log("  ✗ FALLO:",n);} };
const bundle=(f)=>{ const h=fs.readFileSync(require("path").join(require("./rutas").RAIZ,"dist",f),"utf-8");
  return [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0]; };
const entre=(js,d,h)=>{ const i=js.indexOf(d); const j=js.indexOf(h,i); return i<0?"":js.slice(i,j); };
const veces=(t,k)=>(t.match(new RegExp('"'+k+'"\\s*,','g'))||[]).length;

/* ── fc: 13 módulos en el menú (Mensajes se fue a la barra) + 5 grupos ── */
{
  const js=bundle("freelance-completo.html");
  const mods=["midia","verificacion","boveda","equipo","autorizaciones","ruta","potenciales",
    "proveedores","portafolio","productos","stock","documentos","ajustes"];
  const malos=mods.filter(k=>(js.match(new RegExp('irDesdeDrawer\\("'+k+'"\\)','g'))||[]).length!==1);
  prueba("fc: los 13 módulos del menú, una vez cada uno"+(malos.length?" ("+malos+")":""), !malos.length);
  prueba("fc: quedan 5 grupos y el de Comunicación se retiró",
    ["\"dinero\"","\"equipo\"","\"comercial\"","\"docs\"","\"config\""].every(g=>js.includes("secMenu==="+g))
    && !js.includes('secMenu==="com"'));
  prueba("fc: el menú abre en Dinero y cobranza", /useState\("dinero"\)/.test(js));
}
/* ── Comisionista y proveedor ── */
for(const [f,mods,conMensajes] of [
    ["Comisionista.html",["comisiones","midia","boveda","productos","precios","ajustes"],false],
    ["proveedor-freelance.html",["carga","notas","retenciones","guias","conciliacion","bancos","prop","catalogo","reportes","ajustes"],false]]){
  const menu=entre(bundle(f),"const GRUPOS","const item");
  const nom=f.split(".")[0].slice(0,13);
  const malos=mods.filter(k=>veces(menu,k)!==1);
  prueba(nom+": cada módulo del menú aparece una vez"+(malos.length?" ("+malos+")":""), !malos.length);
  prueba(nom+(conMensajes?": Mensajes sigue en su grupo del menú":": Mensajes ya no está en el menú"),
    conMensajes ? menu.includes('"mensajes"') : !menu.includes('"mensajes"'));
}
/* ── socio y transportista ── */
{
  const lista=entre(bundle("socio-comercial.html"),'drawer-body',"filter");
  prueba("socio: Mensajes ya no está en el menú", !lista.includes('"mensajes"'));
  prueba("socio: conserva sus otros módulos",
    ["clientes","cartera","cheques","comisiones","productos","precios","stock","ajustes"].every(k=>lista.includes('"'+k+'"')));
}
{
  const lista=entre(bundle("transportista-app.html"),"const ITEMS","];");
  prueba("transportista: Mensajes encabeza su menú (no tiene barra inferior)",
    lista.indexOf('"mensajes"')>=0 && lista.indexOf('"mensajes"') < lista.indexOf('"pagos"'));
}
console.log("\nResultado: "+ok+" ✓ · "+fallo+" ✗");
process.exit(fallo?1:0);
