#!/usr/bin/env node
/* WEB-01 · un solo título por pantalla. Cada pantalla mostraba su nombre dos veces
   (la cabecera y un <h1> interno). Se quitan los 11 internos: deben quedar solo 3
   <h1> (cabecera, ingreso, historial de cliente), y la cabecera pinta el icono.
   Atado a b169. */
const fs=require("fs"),path=require("path");
const web=fs.readFileSync(path.join(__dirname,"..","sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

const h1 = (web.match(/<h1/g)||[]).length;
ok(h1===3, "solo quedan 3 <h1> en el Sistema Web (cabecera, ingreso, historial) — hay "+h1);
ok(!/<h1 style=\{\{ fontSize:24/.test(web), "no quedan <h1> internos de 24px (los títulos duplicados)");

/* la cabecera recibe y pinta el icono de la sección */
ok(/function Header\(\{ titulo, sub, accion, ayuda, icon \}\)/.test(web), "la cabecera recibe el icono de la sección");
ok(/<Header icon=\{actualOk\.icon\}/.test(web), "el icono de la sección se pasa a la cabecera");
ok(/\{icon \? icon \+ " " : ""\}\{titulo\}/.test(web), "la cabecera pinta el icono antes del título");

/* (la comprobación de la ayuda de recepcion se retiró en WEB-02: ese módulo ya no existe) */

if(m){console.error(`WEB01-TITULOS: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`WEB01-TITULOS: ${b} ✓ · 0 ✗`);
