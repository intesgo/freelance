#!/usr/bin/env node
const fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, "..");
const fc  = fs.readFileSync(path.join(raiz, "freelance-completo.html"), "utf8");
const web = fs.readFileSync(path.join(raiz, "sistema-web.html"), "utf8");
let bien = 0, mal = 0;
const ok = (c, m) => { if (c) bien++; else { mal++; console.error("✗ " + m); } };

/* A · la leyenda gris ya no está en ninguna de las dos apps */
ok(!/Costo<\/b> = lo que cotiza la piladora/.test(fc)  && !/cambiarlo aquí NO toca a otras piladoras/.test(fc),
   "freelance: se quitó la leyenda gris");
ok(!/Costo<\/b> = lo que cotiza la piladora/.test(web) && !/cambiarlo aquí NO toca a otras piladoras/.test(web),
   "sistema web: se quitó la leyenda gris");

/* B · fecha de modificación en la tarjeta (ancla) */
ok(/FECHA_MODIF_TARJETA/.test(fc),  "freelance: ancla FECHA_MODIF_TARJETA");
ok(/FECHA_MODIF_TARJETA/.test(web), "sistema web: ancla FECHA_MODIF_TARJETA");

/* C · botón Historial de precios */
ok(/Historial de precios/.test(fc),  "freelance: botón Historial de precios");
ok(/Historial de precios/.test(web), "sistema web: botón Historial de precios");

/* D · Antes → Ahora al editar (ancla) */
ok(/ANTES_AHORA/.test(fc),  "freelance: ancla ANTES_AHORA");
ok(/ANTES_AHORA/.test(web), "sistema web: ancla ANTES_AHORA");

if (mal) { console.error(`PUNTO2: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`PUNTO2: ${bien} ✓ · 0 ✗`);
