#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const web=fs.readFileSync(path.join(__dirname,"..","sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };
ok(/BASE_DOS_TARJETAS_WEB/.test(web),"ancla BASE_DOS_TARJETAS_WEB (dos bases en tarjetas grandes)");
ok(/COMPARA_CRED_CONTADO_WEB/.test(web),"ancla COMPARA_CRED_CONTADO_WEB (tabla precio sugerido / comisión)");
ok(/ALTA_PILADORA_WEB/.test(web),"ancla ALTA_PILADORA_WEB");
ok(/OCULTAR_PILADORA_WEB/.test(web),"ancla OCULTAR_PILADORA_WEB");
ok(/Ajustar precios|Ajustar por grano/.test(web),"se conserva 'Ajustar precios'");
if(m){console.error(`WEB-AL-DIA: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`WEB-AL-DIA: ${b} ✓ · 0 ✗`);
