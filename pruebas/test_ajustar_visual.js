#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const fc=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* 1 · verde suave en seleccionados + resumen sticky + ejemplo (anclas) */
ok(/VERDE_SUAVE_AJUSTE/.test(fc)&&/VERDE_SUAVE_AJUSTE/.test(web),"ancla VERDE_SUAVE_AJUSTE");
ok(/RESUMEN_STICKY/.test(fc)&&/RESUMEN_STICKY/.test(web),"ancla RESUMEN_STICKY");
ok(/EJEMPLO_IMPACTO/.test(fc)&&/EJEMPLO_IMPACTO/.test(web),"ancla EJEMPLO_IMPACTO");
/* no se pierde lo clave de la pantalla */
ok(/Ver marcas/.test(fc)&&/Ver marcas/.test(web),"se conserva 'Ver marcas'");
ok(/Aplicar a/.test(fc)&&/Aplicar a/.test(web),"se conserva 'Aplicar a N marcas'");

if(m){console.error(`AJUSTAR-VISUAL: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`AJUSTAR-VISUAL: ${b} ✓ · 0 ✗`);
