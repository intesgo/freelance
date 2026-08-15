#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const fc=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* a · marca plegable con detalle diferido (ancla) */
ok(/MARCA_PLEGABLE/.test(fc)&&/MARCA_PLEGABLE/.test(web),"ancla MARCA_PLEGABLE (detalle diferido)");
/* b · resumen costo–base crédito (ancla) */
ok(/RESUMEN_CRED/.test(fc)&&/RESUMEN_CRED/.test(web),"ancla RESUMEN_CRED");
/* c · buscador con uFuzzy, sin CDN nuevo */
ok(/uFuzzy/.test(fc)&&/uFuzzy/.test(web),"buscador reusa uFuzzy");
/* e · columna crédito resaltada (ancla) */
ok(/CRED_AMBAR/.test(fc)&&/CRED_AMBAR/.test(web),"ancla CRED_AMBAR");
/* no se pierde lo clave */
ok(/Ajustar por grano/.test(fc)&&/Ajustar por grano/.test(web),"se conserva 'Ajustar por grano'");
ok(/Historial de precios/.test(fc)&&/Historial de precios/.test(web),"se conserva 'Historial de precios'");

if(m){console.error(`COSTOS-RENDER: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`COSTOS-RENDER: ${b} ✓ · 0 ✗`);
