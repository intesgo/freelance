#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const app=fs.readFileSync(path.join(__dirname,"..","freelance-completo.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* 1 · base visible en los chips (ancla) */
ok(/BASE_EN_CHIPS/.test(app),"ancla BASE_EN_CHIPS");
/* 2 · nombre P1/P2 corregido (ancla) y coherencia P1=Crédito / P2=Contado */
ok(/FIX_TIPO_NOMBRE/.test(app),"ancla FIX_TIPO_NOMBRE");
ok(/P1[^\n]{0,30}Cr[eé]dito/.test(app)&&/P2[^\n]{0,30}Contado/.test(app),"P1=Crédito y P2=Contado coherentes");
/* no se pierde lo clave del pedido */
ok(/Tipo de precio|TIPO DE PRECIO/i.test(app),"se conserva 'Tipo de precio'");
ok(/Pb\.|precio_contado|baseContado/.test(app),"se conserva el precio base (Pb.)");

if(m){console.error(`PEDIDO-BASE-CHIPS: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`PEDIDO-BASE-CHIPS: ${b} ✓ · 0 ✗`);
