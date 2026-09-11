#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   CAT_NUEVO_PROD_PILADORA_FIJA · «Nuevo producto» usa la piladora ya elegida.
   En Productos (CatalogoWeb), si hay una piladora seleccionada, el modal de alta
   la recibe como `provFijo` y la usa fija (línea de solo lectura), sin volver a
   pedir «De la lista / Piladora nueva / buscador». En «Todos los productos» el
   chooser sigue como hoy. Inspección del fuente.
   ═══════════════════════════════════════════════════════════════════════ */
const fs=require("fs"), path=require("path");
const web=fs.readFileSync(path.join(__dirname,"..","sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* 1 · CatalogoWeb resuelve provFijo desde `proveedores` por nombre y lo pasa al modal */
ok(/const provFijo = \(provSel && provSel !== TODOS_OPC\)/.test(web) &&
   /proveedores\.find\(x => x\.nombre === provSel\) \|\| \{ nombre: provSel \}/.test(web),
   "CatalogoWeb resuelve provFijo desde la lista de proveedores por nombre");
ok(/<ModalNuevoProducto [^>]*provFijo=\{provFijo\}/.test(web), "se pasa provFijo al modal");
/* en «Todos los productos» (provSel===TODOS_OPC) provFijo es null → chooser normal */
ok(/\|\| \{ nombre: provSel \}\)\s*:\s*null;/.test(web),
   "en «Todos los productos» provFijo queda null (chooser normal)");

/* 2 · el modal acepta provFijo y deriva provFijado */
ok(/function ModalNuevoProducto\(\{ money, usuario, provFijo, onCerrar \}\)/.test(web), "el modal acepta la prop provFijo");
ok(/const provFijado = !!\(provFijo && \(provFijo\.prov_cod \|\| provFijo\.nombre\)\);/.test(web),
   "el modal deriva provFijado de provFijo");

/* 3 · el proveedor del modal arranca en provFijo cuando está fijo (para guardar con su prov_cod) */
ok(/useState\(provFijado \? provFijo : null\)/.test(web), "provSel del modal arranca en provFijo cuando está fijo");

/* 4 · con piladora fija se muestra la línea de solo lectura y NO el chooser */
ok(/Piladora: 🏭 \{provFijo\.nombre\}/.test(web),
   "con piladora fija sale la línea «Piladora: 🏭 <nombre>»");
/* el chooser (botones + buscador) queda en la rama del ELSE de provFijado (la línea fija va primero) */
{ const iFijada=web.indexOf("Piladora: 🏭 {provFijo.nombre}");
  const iElse=web.indexOf(": (<>", iFijada);
  const iChooser=web.indexOf("Escribe para buscar una piladora", iFijada);
  ok(iFijada>0 && iElse>iFijada && iChooser>iElse,
     "el chooser (botones + buscador) queda en la rama del else, después de la línea fija"); }

/* 5 · el guardado sigue usando provSel.prov_cod (no se tocó) */
ok(/const provCod = provSel && provSel\.prov_cod;/.test(web), "el guardado sigue usando provSel.prov_cod");

if(m){ console.error(`NUEVO-PROD-PILADORA: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`NUEVO-PROD-PILADORA: ${b} ✓ · 0 ✗`);
