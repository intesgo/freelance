#!/usr/bin/env node
/* FE-01 · Tarifas, Chóferes y Estibadores (Sistema Web).
   Vigila que el módulo exista, esté enrutado, y que las tres pantallas
   escriban donde deben con el versionado de la regla FE-01. Atado a la
   versión b161 / caché v248: si se sube la versión, se ajusta aquí. */
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
const sw =fs.readFileSync(path.join(raiz,"sw.js"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* ── versión y caché ── */
ok(/const VERSION = \{ n:"192"/.test(web),"Sistema Web debe anunciar b192");
ok(/const CACHE = "freelance-v295"/.test(sw),"la caché debe renovarse a v295");

/* ── el módulo existe y está enrutado ── */
ok(/function TarifasFEWeb\(\{ usuario \}\)\{/.test(web),"existe el módulo TarifasFEWeb");
ok(/case "tarifasfe":/.test(web) && /return <TarifasFEWeb usuario=\{sesion\} \/>;/.test(web),
  "el menú «Tarifas de logística» (tarifasfe) enruta a TarifasFEWeb");
ok(/key:"tarifasfe",\s*ic:"[a-zA-Z]+",\s*icon:"[^"]*",\s*label:"Tarifas de logística"/.test(web),"la sección tarifasfe está en SECCIONES");  /* DISENO_BASE_ERP · ic:"<vectorial>" antes del emoji */

/* ── las tres anclas del alcance ── */
ok(/FE01_TARIFAS_ZONA/.test(web),"ancla FE01_TARIFAS_ZONA (cobro por zona)");
ok(/FE01_CHOFERES/.test(web),"ancla FE01_CHOFERES");
ok(/FE01_ESTIBADORES/.test(web),"ancla FE01_ESTIBADORES");

/* ── escribe donde debe ── */
ok(/from\("tarifas_fe"\)/.test(web),"guarda tarifas en tarifas_fe");
ok(/from\("zonas"\)/.test(web) && /\.eq\("activo",true\)/.test(web),"lista las zonas activas");
ok(/from\("estibadores"\)\s*\n?\s*\.insert\(\{[\s\S]{0,120}est_id/.test(web) || /from\("estibadores"\)\.insert/.test(web),
  "agrega estibadores en la tabla estibadores");
ok(/accion:"crear", nombre:nom, email:cor, rol:"transportista"/.test(web),
  "el alta de chofer REUSA cuentas-equipo con rol transportista");
ok(/capacidad_qq/.test(web) && /patch\.placa/.test(web),"el chofer guarda placa y capacidad en su ficha");

/* ── versionado FE-01: actualizar en sitio si es de hoy; si no, cerrar e insertar ── */
ok(/vigente_desde\)\.slice\(0,10\)===hoy/.test(web),"si la vigente es de HOY, actualiza en sitio");
ok(/update\(\{vigente_hasta:hoy\}\)/.test(web),"si es de otro día, cierra la vigente (vigente_hasta = hoy)");
ok(/tarifa_id:nuevoIdTF\(\)/.test(web),"inserta una fila nueva con id generado (tarifa_id sin default)");
ok(/ambito:"zona"/.test(web) && /ambito:"persona"/.test(web),"usa los ámbitos zona y persona");

/* ── ocultar/reactivar sin borrar ── */
ok(/from\("usuarios"\)\.update\(\{activo:!ocultar\}\)/.test(web),"ocultar/reactivar chofer usa usuarios.activo");
ok(/from\("estibadores"\)\.update\(\{activo:!ocultar\}\)/.test(web),"ocultar/reactivar estibador usa estibadores.activo");

if(m){console.error(`FE01-TARIFAS: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`FE01-TARIFAS: ${b} ✓ · 0 ✗`);
