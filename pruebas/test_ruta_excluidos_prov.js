#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   PROVEEDOR · al facturar NO se muestran las líneas excluidas de la ruta activa
   (CAMBIO C de DESPACHO_PARCIAL). Guard de fuente sobre proveedor-freelance.html:
   el loader lee ruta_pedidos.items_excluidos de la ruta ACTIVA del pedido y saca
   esas líneas del array `its` (así no se muestran ni cuentan en el total).
   La base ya rechaza facturar lo excluido; esto es solo claridad visual.
   Uso: node test_ruta_excluidos_prov.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const prov = fs.readFileSync(path.join(__dirname, "..", "proveedor-freelance.html"), "utf8");

let bien = 0, mal = 0;
const prueba = (ok, msg) => { if (ok) bien++; else { mal++; console.error("✗ " + msg); } };

prueba(/DISENO_LOGISTICA_DESPACHO_PARCIAL/.test(prov), "queda el ancla DISENO_LOGISTICA_DESPACHO_PARCIAL en el proveedor");
prueba(/from\("ruta_pedidos"\)/.test(prov) && /items_excluidos/.test(prov),
  "el loader lee ruta_pedidos.items_excluidos");
prueba(/\.eq\("estado_asignacion","activo"\)/.test(prov),
  "solo se miran las líneas excluidas de la ruta ACTIVA (estado_asignacion = activo)");
prueba(/\.in\("ped_id",pedIds\)/.test(prov),
  "se consulta solo por los pedidos que el proveedor va a facturar");
prueba(/const exclPorPed\s*=\s*\{\}/.test(prov) && /exclPorPed\[r\.ped_id\]\s*=\s*new Set/.test(prov),
  "se arma el índice de líneas excluidas por pedido (Set de item_id)");
prueba(/items\.filter\(i=>i\.ped_id===p\.ped_id\s*&&\s*!\(fuera && fuera\.has\(String\(i\.item_id\)\)\)\)/.test(prov),
  "las líneas excluidas se SACAN de `its` (no se muestran ni cuentan en el total)");

if (mal) { console.error(`Resultado RUTA-EXCLUIDOS-PROV: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado RUTA-EXCLUIDOS-PROV: ${bien} ✓ · 0 ✗`);
