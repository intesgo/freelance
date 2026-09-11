#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const fc=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* 1 · la Ficha existe en ambas. En la app del dueño sigue siendo una pestaña
   («Ficha»); en el Sistema Web se muestra DIRECTA — PILADORAS_SOLO_FICHA: se quitó
   la pestaña exterior «Ficha / Costos y precios» porque los costos viven en «Precios». */
ok(/>Ficha</.test(fc),"la app del dueño conserva la pestaña 'Ficha'");
ok(/PILADORAS_SOLO_FICHA/.test(web),"en el Sistema Web la Ficha se muestra directa (sin pestaña de costos)");
ok(/FICHA_AGRUPA/.test(fc)&&/FICHA_AGRUPA/.test(web),"ancla FICHA_AGRUPA (agrupa Representantes/Condiciones/Documentos)");
/* 2 · tarjeta de marca distinguida (ancla) */
ok(/TARJETA_MARCA/.test(fc)&&/TARJETA_MARCA/.test(web),"ancla TARJETA_MARCA");
/* 3 · modal agrupado por familia (ancla) */
ok(/MODAL_TG_FAMILIA/.test(fc)&&/MODAL_TG_FAMILIA/.test(web),"ancla MODAL_TG_FAMILIA");
/* no se perdió nada clave */
ok(/Historial de precios/.test(fc)&&/Historial de precios/.test(web),"se conserva 'Historial de precios'");
ok(/Ajustar por grano/.test(fc)&&/Ajustar por grano/.test(web),"se conserva 'Ajustar por grano'");

if(m){console.error(`FICHA-VISUAL: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`FICHA-VISUAL: ${b} ✓ · 0 ✗`);
