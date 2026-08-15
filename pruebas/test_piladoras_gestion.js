#!/usr/bin/env node
/* PILADORAS-GESTION — arnés PARCIAL (no registrado en pruebas.js todavía).
   Construidos ya: AJUSTAR_PRECIOS_FULL, NIVEL_GRANO, CONTEO_PILADORAS_REAL, RUC_CONDICIONES.
   Pendientes hasta que Cowork confirme el esquema/RLS de `proveedores`:
   ALTA_PILADORA (insert) y OCULTAR_PILADORA (ocultar/reactivar). Ver §9. */
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const fc=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* 1 · Ajustar precios pantalla completa con familia + nivel (anclas) */
ok(/AJUSTAR_PRECIOS_FULL/.test(fc)&&/AJUSTAR_PRECIOS_FULL/.test(web),"ancla AJUSTAR_PRECIOS_FULL");
ok(/NIVEL_GRANO/.test(fc)&&/NIVEL_GRANO/.test(web),"ancla NIVEL_GRANO (Especial/Bueno/Económico)");
/* 2 · conteo real */
ok(!/PROVEEDORES\.length\}\s*piladoras/.test(fc),"el menú ya no cuenta PROVEEDORES (quemado)");
ok(/CONTEO_PILADORAS_REAL/.test(fc),"ancla CONTEO_PILADORAS_REAL");
/* 3 · RUC */
ok(/RUC_CONDICIONES/.test(fc)&&/RUC_CONDICIONES/.test(web),"ancla RUC_CONDICIONES");
/* 4 · alta */
ok(/ALTA_PILADORA/.test(fc)&&/ALTA_PILADORA/.test(web),"ancla ALTA_PILADORA");
/* 5 · ocultar/reactivar */
ok(/OCULTAR_PILADORA/.test(fc)&&/OCULTAR_PILADORA/.test(web),"ancla OCULTAR_PILADORA");
/* no se pierde lo clave */
ok(/Historial de precios/.test(fc)&&/Historial de precios/.test(web),"se conserva 'Historial de precios'");

if(m){console.error(`PILADORAS-GESTION: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`PILADORAS-GESTION: ${b} ✓ · 0 ✗`);
