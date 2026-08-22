#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   TANDA 3 · PED_OPTIMISTA_QQ · la tarjeta optimista (la que aparece al
   instante de guardar, antes de recargar de la base) se expresa en
   QUINTALES, con la equivalencia real de cada línea.

   Cómo se prueba (comportamiento, no regex): se EXTRAE del fuente el bloque
   real que arma la tarjeta y se EVALÚA con un carrito de prueba. Así se corre
   el mismo código que se publica. Luego se muta ESE fragmento (volver a las
   cantidades crudas) y se comprueba que la batería SE CAE.

   CASO OBLIGATORIO: 50 arrobas a $10/arroba (equiv 0,25) → 12,5 qq a $40/qq,
   importe $500 (NO 50 qq a $10).
   Uso: node test_optimista_qq.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path"), vm = require("vm");
const raiz = path.join(__dirname, "..");
const app  = fs.readFileSync(path.join(raiz, "freelance-completo.html"), "utf8");
const comi = fs.readFileSync(path.join(raiz, "Comisionista.html"), "utf8");

/* ── Se EXTRAEN una sola vez los fragmentos reales del fuente ── */
const BLOQUE_APP   = /const equivLinea = it =>[\s\S]*?const precioProm = totalCant \? Math\.round\(\(importe\/totalCant\)\*100\)\/100 : 0;/;
const DEF_EQUIV    = /const equivLinea = it => \(it && it\.prod && Number\(it\.prod\.equiv\)>0\) \? Number\(it\.prod\.equiv\) : 1;/;
const LINEAS_COMI  = /const eq = equivLinea\(it\);[\s\S]*?const precioQqLinea = Math\.round\(\(\(Number\(it\.precio\)\|\|0\)\/eq\)\*100\)\/100;/;

const mApp = app.match(BLOQUE_APP);
const dComi = comi.match(DEF_EQUIV), lComi = comi.match(LINEAS_COMI);
if (!mApp) { console.error("✗ no se encontró el bloque optimista de freelance"); process.exit(1); }
if (!dComi || !lComi) { console.error("✗ no se encontró el bloque optimista de comisionista"); process.exit(1); }
const SNIP_APP  = mApp[0];                       // equivLinea + lineasQq + totalCant + importe + precioProm
const SNIP_COMI = dComi[0] + "\n" + lComi[0];    // equivLinea (def) + eq/qqLinea/precioQqLinea

/* corre el fragmento de freelance contra un carrito y devuelve la tarjeta calculada */
function tarjetaApp(snip, carrito) {
  const fn = new vm.Script("(function(carrito){ " + snip + " return {lineasQq, totalCant, importe, precioProm}; })");
  return fn.runInNewContext({ Math, Number })(carrito);
}
/* corre el fragmento de comisionista (una línea) y devuelve {cant, precio} en qq */
function lineaComi(snip, it) {
  const fn = new vm.Script("(function(it){ " + snip + " return { cant:qqLinea, precio:precioQqLinea }; })");
  return fn.runInNewContext({ Math, Number })(it);
}

/* carrito de prueba: 50 arrobas a $10 (equiv 0,25) + una segunda línea en Quintal */
const CARRITO = [
  { prodNombre:"Arroz Vela · Arroba", prod:{ equiv:0.25 }, cant:50, precio:10, credito:false, requiere:false, comisionTotal:0 },
  { prodNombre:"Arroz Vela · Quintal", prod:{ equiv:1 },    cant:8,  precio:44, credito:false, requiere:false, comisionTotal:0 },
];

/* ── batería (recibe los fragmentos, para poder correrla también sobre los mutados) ── */
function bateria(snipApp, snipComi) {
  const fallos = [];
  const ok = (c, msg, extra) => { if (!c) fallos.push(msg + (extra ? " ("+extra+")" : "")); };

  /* FREELANCE · caso obligatorio (solo la 1ª línea, para el número exacto) */
  const t1 = tarjetaApp(snipApp, [CARRITO[0]]);
  ok(t1.lineasQq.length === 1, "freelance · una entrada por línea", "líneas="+t1.lineasQq.length);
  ok(t1.lineasQq[0].qq === 12.5, "freelance · 50 arrobas → 12,5 qq en la línea", "qq="+t1.lineasQq[0].qq);
  ok(t1.lineasQq[0].precio === 40, "freelance · $10/arroba → $40/qq en la línea", "precio="+t1.lineasQq[0].precio);
  ok(t1.totalCant === 12.5, "freelance · el total de la tarjeta es 12,5 qq (no 50)", "totalCant="+t1.totalCant);
  ok(t1.precioProm === 40, "freelance · el precio promedio es $40/qq (no $10)", "precioProm="+t1.precioProm);
  ok(t1.importe === 500, "freelance · el dinero se conserva: importe $500", "importe="+t1.importe);

  /* FREELANCE · dos líneas → UNA tarjeta con sus dos líneas en qq, dinero conservado */
  const t2 = tarjetaApp(snipApp, CARRITO);
  ok(t2.lineasQq.length === 2, "freelance · dos productos = una tarjeta con dos líneas en qq", "líneas="+t2.lineasQq.length);
  ok(t2.totalCant === 20.5, "freelance · total = 12,5 + 8 = 20,5 qq", "totalCant="+t2.totalCant);
  ok(t2.importe === 500 + 352, "freelance · importe = $500 + $352 = $852 (dinero conservado)", "importe="+t2.importe);

  /* COMISIONISTA · la línea optimista también sale en qq */
  const lc = lineaComi(snipComi, CARRITO[0]);
  ok(lc.cant === 12.5, "comisionista · 50 arrobas → 12,5 qq en la tarjeta", "cant="+lc.cant);
  ok(lc.precio === 40, "comisionista · $10/arroba → $40/qq en la tarjeta", "precio="+lc.precio);

  return fallos;
}

console.log("═══ TANDA 3 · PED_OPTIMISTA_QQ · la tarjeta optimista en quintales (freelance + comisionista)");
let bien = 0, mal = 0;
const sanos = bateria(SNIP_APP, SNIP_COMI);
if (!sanos.length) { bien += 11; console.log("  ✓ 11 comprobaciones sanas (freelance 9 · comisionista 2)"); }
else { mal += sanos.length; sanos.forEach(f => console.error("  ✗ " + f)); }

/* ── MUTANTES · romper el fragmento a propósito: la batería debe caer ── */
const CRUDO = [
  [/const qqLinea = Math\.round\(\(Number\(it\.cant\)\|\|0\)\*eq\*100\)\/100;/, "const qqLinea = Number(it.cant)||0;"],
  [/const precioQqLinea = Math\.round\(\(\(Number\(it\.precio\)\|\|0\)\/eq\)\*100\)\/100;/, "const precioQqLinea = Number(it.precio)||0;"],
];
function mutar(snip, reps) { let s = snip; for (const [de, a] of reps) { if (!de.test(s)) return null; s = s.replace(de, a); } return s; }

const MUTANTES = [
  ["freelance vuelve a las cantidades crudas (it.cant/it.precio) en la tarjeta", () => bateria(mutar(SNIP_APP, CRUDO), SNIP_COMI)],
  ["comisionista vuelve a las cantidades crudas (it.cant/it.precio) en la tarjeta", () => bateria(SNIP_APP, mutar(SNIP_COMI, CRUDO))],
];
console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
for (const [nombre, corre] of MUTANTES) {
  let fallos;
  try { fallos = corre(); } catch (e) { fallos = ["excepción: " + e.message]; }
  if (fallos === null) { mal++; console.error("  ✗ «"+nombre+"» no se pudo aplicar (fragmento no encontrado)"); }
  else if (fallos.length) { bien++; console.log("  ✓ «"+nombre+"» → la prueba se cae ("+fallos.length+" fallo(s))"); }
  else { mal++; console.error("  ✗ «"+nombre+"» NO hizo caer la prueba (mutante no detectado)"); }
}

if (mal) { console.error(`Resultado optimista-qq: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado optimista-qq: ${bien} ✓ · 0 ✗`);
