#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const fc=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* Las 9 variedades y el nombre de familia, en AMBAS apps */
const cods=["C0901","C0902","C0903","L1101","L1102","L1103","F1401","F1402","F1403"];
cods.forEach(c=>{ ok(fc.includes(c),"freelance falta "+c); ok(web.includes(c),"web falta "+c); });
ok(/Grano Ferón/.test(fc)&&/Grano Ferón/.test(web),"familia 'Grano Ferón' con tilde en ambas");
ok(/Bueno/.test(fc)&&/Bueno/.test(web),"se mantiene el nivel 'Bueno'");

/* El guardado escribe tipo_grano (ancla) en ambas apps */
ok(/GUARDA_TIPO_GRANO/.test(fc),"freelance: ancla GUARDA_TIPO_GRANO");
ok(/GUARDA_TIPO_GRANO/.test(web),"sistema web: ancla GUARDA_TIPO_GRANO");

if(m){console.error(`TIPO-GRANO: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`TIPO-GRANO: ${b} ✓ · 0 ✗`);
