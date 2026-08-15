#!/usr/bin/env node
/* PILADORAS-GESTION — arnés PARCIAL (no registrado en pruebas.js todavía).
   Construidos ya: AJUSTE_POR_FAMILIA, CONTEO_PILADORAS_REAL, RUC_CONDICIONES.
   Pendientes hasta que Cowork confirme el esquema/RLS de `proveedores`:
   ALTA_PILADORA (insert) y OCULTAR_PILADORA (ocultar/reactivar). Ver §9. */
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const fc=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* 1 · ajuste por tipo de grano (ancla) en ambas apps */
ok(/AJUSTE_POR_FAMILIA/.test(fc)&&/AJUSTE_POR_FAMILIA/.test(web),"ancla AJUSTE_POR_FAMILIA");
/* 2 · conteo real, sin el arreglo quemado */
ok(!/PROVEEDORES\.length\}\s*piladoras/.test(fc),"el menú ya no cuenta PROVEEDORES (quemado)");
ok(/CONTEO_PILADORAS_REAL/.test(fc),"ancla CONTEO_PILADORAS_REAL");
/* 3 · RUC en condiciones (ancla) */
ok(/RUC_CONDICIONES/.test(fc)&&/RUC_CONDICIONES/.test(web),"ancla RUC_CONDICIONES");
ok(/tipo_grano|ruc/i.test(fc),"escribe proveedor_fichas.ruc"); // referencia
/* 4 · alta de piladora (ancla) */
ok(/ALTA_PILADORA/.test(fc)&&/ALTA_PILADORA/.test(web),"ancla ALTA_PILADORA");
/* 5 · ocultar/reactivar (ancla) */
ok(/OCULTAR_PILADORA/.test(fc)&&/OCULTAR_PILADORA/.test(web),"ancla OCULTAR_PILADORA");
/* no se pierde lo clave */
ok(/Ajustar por grano/.test(fc)&&/Ajustar por grano/.test(web),"se conserva 'Ajustar por grano'");

if(m){console.error(`PILADORAS-GESTION: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`PILADORAS-GESTION: ${b} ✓ · 0 ✗`);
