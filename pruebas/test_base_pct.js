#!/usr/bin/env node
const fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, "..");
const fc = fs.readFileSync(path.join(raiz, "freelance-completo.html"), "utf8");
const web = fs.readFileSync(path.join(raiz, "sistema-web.html"), "utf8");
let bien = 0, mal = 0;
const ok = (c, m) => { if (c) bien++; else { mal++; console.error("✗ " + m); } };

/* P1 · Base = Costo + X% (réplica de la lógica correcta) */
const r4 = n => Math.round((Number(n) || 0) * 10000) / 10000;
const baseDesdeCosto = (costo, pct) => r4(costo * (1 + pct / 100));
ok(baseDesdeCosto(18, 12)  === 20.16, "Base 18 + 12% = 20,16");
ok(baseDesdeCosto(19, 12)  === 21.28, "Base 19 + 12% = 21,28");
ok(baseDesdeCosto(17, 0)   === 17,    "0% deja la base = costo");
ok(baseDesdeCosto(26.5, 30) === 34.45, "Base 26,50 + 30% = 34,45");

/* P1 · el % del base sale del costo, en AMBAS apps */
ok(/BASE_PCT_SOBRE_COSTO/.test(fc),  "freelance: ancla BASE_PCT_SOBRE_COSTO");
ok(/BASE_PCT_SOBRE_COSTO/.test(web), "sistema web: ancla BASE_PCT_SOBRE_COSTO");

/* P3 · el mismo-día actualiza en el sitio (no crea otra versión) */
ok(/vigente_desde\s*===?\s*hoy|MISMO_DIA_ACTUALIZA/.test(fc),  "freelance: maneja el guardar del mismo día");
ok(/vigente_desde\s*===?\s*hoy|MISMO_DIA_ACTUALIZA/.test(web), "sistema web: maneja el guardar del mismo día");

/* Versionado intacto */
ok(/vigente_hasta/.test(fc)  && /vigente_desde/.test(fc),  "freelance: versionado intacto");
ok(/vigente_hasta/.test(web) && /vigente_desde/.test(web), "sistema web: versionado intacto");

if (mal) { console.error(`BASE-PCT: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`BASE-PCT: ${bien} ✓ · 0 ✗`);
