#!/usr/bin/env node
/* PED_ORIGEN_CANAL · cada app manda su origen al crear el pedido.
   ═══════════════════════════════════════════════════════════════════════
   La base ya tiene pedidos.origen_canal y registrar_pedido_atomico lee
   p_payload->>'origen_canal'. Cada app debe mandarlo con su valor fijo, dentro
   del payload que va a registrar_pedido_atomico, justo después de `condicion`.
   Si a alguna se le olvida (o se le cambia el valor), el pedido quedaría sin
   origen ('desconocido') y esta prueba se cae.
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const R = require("./rutas");

/* app → valor esperado de origen_canal */
const CANALES = {
  "freelance-completo": "freelance",
  "Comisionista":       "comisionista",
  "socio-comercial":    "socio",
  "sistema-web":        "web",
};

let b = 0, m = 0;
const ok = (c, x) => { if (c) b++; else { m++; console.error("✗ " + x); } };

for (const [app, valor] of Object.entries(CANALES)) {
  const src = fs.readFileSync(R.app(app), "utf-8");
  /* 1 · manda origen_canal con el valor de esta app */
  ok(new RegExp('origen_canal:"' + valor + '"').test(src),
    app + ' · manda origen_canal:"' + valor + '"');
  /* 2 · lleva su ancla */
  ok(/PED_ORIGEN_CANAL/.test(src), app + " · tiene el ancla PED_ORIGEN_CANAL");
  /* 3 · va DENTRO del payload de registrar_pedido_atomico, pegado a `condicion`
     (no en cualquier lado): condicion, … origen_canal:"valor" en el mismo objeto */
  ok(new RegExp('condicion[,\\s][\\s\\S]{0,60}origen_canal:"' + valor + '"').test(src),
    app + " · el origen_canal va junto a condicion, dentro del payload del pedido");
  /* 4 · no se coló otro valor de canal en esta app (cada una manda el suyo) */
  const otros = Object.values(CANALES).filter(v => v !== valor);
  ok(!otros.some(v => new RegExp('origen_canal:"' + v + '"').test(src)),
    app + " · no manda el origen_canal de otra app");
}

if (m) { console.error(`ORIGEN-CANAL: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`ORIGEN-CANAL: ${b} ✓ · 0 ✗`);
