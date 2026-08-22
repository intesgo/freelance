#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   PED_MONTO_SUMA_LINEAS · el "Monto del pedido" es la SUMA de las líneas
   (Σ round(qq×precio, 2)), NO cantidad × precio promedio.

   El promedio redondeado pierde centavos: un pedido de
   50 qq×$42 + 12,5 qq×$43 + 10 qq×$47 = $3.107,50, pero
   72,5 qq × 42,86 (promedio) = $3.107,35 (−$0,15).

   Cómo se prueba: se EXTRAE del fuente la función real `montoDePedido` y se
   EVALÚA con ese pedido. Luego se muta la función (volver a cant×precio) y se
   comprueba que la batería SE CAE.
   Uso: node test_monto_suma_lineas.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path"), vm = require("vm");
const raiz = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(raiz, "freelance-completo.html"), "utf8");

/* ── se extrae la función real (una sola vez) ── */
const RE = /function montoDePedido\(p\)\{[\s\S]*?\n\}/;
const m = app.match(RE);
if (!m) { console.error("✗ no se encontró la función montoDePedido en freelance"); process.exit(1); }
const SNIP = m[0];

function correr(snip, p) {
  const fn = new vm.Script("(function(){ " + snip + " return montoDePedido; })()");
  return fn.runInNewContext({ Math, Number, Array })(p);
}

/* el pedido del caso obligatorio (PD-260822080542200-E693): promedio NO redondo */
const PEDIDO = { cant:72.5, precio:42.86,   // promedio redondeado (lo que había antes)
  lineas:[ {qq:50,precio:42}, {qq:12.5,precio:43}, {qq:10,precio:47} ] };

function bateria(snip) {
  const fallos = [];
  const ok = (c, msg, extra) => { if (!c) fallos.push(msg + (extra ? " ("+extra+")" : "")); };

  const monto = correr(snip, PEDIDO);
  ok(monto === 3107.5, "el caso obligatorio da $3.107,50 (suma exacta de las líneas)", "dio="+monto);
  ok(monto !== 3107.35, "NO da $3.107,35 (cantidad × precio promedio, que pierde 15 centavos)", "dio="+monto);

  /* coincide con la suma al centavo de las líneas del detalle */
  const sumaDetalle = Math.round(PEDIDO.lineas.reduce((s,l)=>s+Math.round(l.qq*l.precio*100)/100,0)*100)/100;
  ok(monto === sumaDetalle, "el monto coincide al centavo con la suma de las líneas del detalle", "monto="+monto+" detalle="+sumaDetalle);

  /* fallback sin líneas: cae a cant×precio (tarjetas sin detalle) */
  ok(correr(snip, { cant:10, precio:5 }) === 50, "sin líneas cae a cant×precio (compat)", "dio="+correr(snip,{cant:10,precio:5}));

  /* fallback por importe expuesto: usa el importe exacto si no hay líneas */
  ok(correr(snip, { cant:10, precio:4.99, importe:52.37 }) === 52.37, "sin líneas pero con importe expuesto, usa el importe exacto", "dio="+correr(snip,{cant:10,precio:4.99,importe:52.37}));

  return fallos;
}

console.log("═══ PED_MONTO_SUMA_LINEAS · el monto del pedido es la suma de sus líneas · freelance");
let bien = 0, mal = 0;
const sanos = bateria(SNIP);
if (!sanos.length) { bien += 5; console.log("  ✓ 5 comprobaciones sanas"); }
else { mal += sanos.length; sanos.forEach(f => console.error("  ✗ " + f)); }

/* ── MUTANTE · volver a cantidad × precio promedio para el monto ── */
console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
const mutado = "function montoDePedido(p){ return Math.round((Number(p&&p.cant)||0)*(Number(p&&p.precio)||0)*100)/100; }";
if (mutado === SNIP) { mal++; console.error("  ✗ el mutante quedó igual al original (no muta nada)"); }
else {
  const fallos = bateria(mutado);
  if (fallos.length) { bien++; console.log("  ✓ «volver a cant × precio promedio para el monto» → la prueba se cae ("+fallos.length+" fallo(s))"); }
  else { mal++; console.error("  ✗ el mutante NO hizo caer la prueba"); }
}

if (mal) { console.error(`Resultado monto-suma-lineas: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado monto-suma-lineas: ${bien} ✓ · 0 ✗`);
