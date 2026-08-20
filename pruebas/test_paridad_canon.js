#!/usr/bin/env node
/* PED_TESTS_PARIDAD · CANON P1/P2 idéntico en TODOS los canales.
   ═══════════════════════════════════════════════════════════════════════
   Regla del negocio: P1 = Crédito, P2 = Contado. Igual en la app del
   freelance, en Comisionista, en socio-comercial y en el Sistema Web. Si en
   CUALQUIER canal se invierte (P1 pasa a contado o P2 a crédito), el mismo
   pedido cobraría/afectaría el cupo distinto según por dónde se tomó. Esta
   prueba amarra los cuatro canales a la misma regla.

   No es regex de "existe el texto": EVALÚA el mapa efectivo. De cada canal se
   saca la expresión real `esCredito = …` del módulo de pedido y se corre con
   tipo P1 y P2 (la condición del vendedor no cambia P1/P2). Así, si alguien
   invierte la lógica, la evaluación cae aunque el texto siga por ahí.

   NACE ROJA: al final se invierte la regla en el fuente de cada canal, un
   canal a la vez, y se exige que la comprobación SE CAIGA.
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const R = require("./rutas");

const CANALES = ["freelance-completo", "Comisionista", "socio-comercial", "sistema-web"];
const fuente = (c) => fs.readFileSync(R.app(c), "utf-8");

/* ── De un fuente saca la expresión de pedido `esCredito = tipo==="P1" … condP3 …`.
      Hay canales (web) con otra `esCredito` distinta (form.condicionPago) en otro
      módulo: nos quedamos SOLO con la del pedido, la que mira tipo y condP3. ── */
function exprEsCredito(src) {
  const re = /const esCredito\s*=\s*(tipo===["']P1["'][^\n;]*?);/g;
  let mm;
  while ((mm = re.exec(src))) {
    if (/condP3/.test(mm[1])) return mm[1].trim();
  }
  return null;
}

/* Evalúa la expresión REAL del fuente como (tipo, condP3) → booleano. */
function evaluar(expr, tipo, condP3) {
  // eslint-disable-next-line no-new-func
  const fn = new Function("tipo", "condP3", "return (" + expr + ");");
  return fn(tipo, condP3);
}

/* Comprueba el canon sobre un fuente ya dado (bueno o mutado). Devuelve
   {ok, mal, fallos} para que sirva igual en la corrida normal y en el mutante. */
function canonDe(nombre, src) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => { if (c) ok++; else { mal++; fallos.push(nombre + ": " + t); } };

  /* 1 · el mapa de tipos dice P1=Crédito, P2=Contado (etiqueta al vendedor) */
  comprobar("P1 se rotula «Crédito»", /id:\s*"P1",\s*nombre:\s*"Crédito"/.test(src));
  comprobar("P2 se rotula «Contado»", /id:\s*"P2",\s*nombre:\s*"Contado"/.test(src));

  /* 2 · el mapa EFECTIVO: la expresión real esCredito, corrida con P1 y P2 */
  const expr = exprEsCredito(src);
  comprobar("tiene una regla esCredito de pedido (tipo/condP3)", !!expr);
  if (expr) {
    comprobar("P1 ⇒ crédito (con condición de contado y de crédito)",
      evaluar(expr, "P1", "contado") === true && evaluar(expr, "P1", "credito") === true);
    comprobar("P2 ⇒ contado (nunca crédito, ponga el vendedor lo que ponga)",
      evaluar(expr, "P2", "contado") === false && evaluar(expr, "P2", "credito") === false);
  }
  return { ok, mal, fallos };
}

(async () => {
  console.log("═══ Canon P1/P2 idéntico en los cuatro canales");
  let ok = 0, mal = 0;
  const bueno = {};
  for (const c of CANALES) {
    const src = fuente(c);
    bueno[c] = src;
    const r = canonDe(c, src);
    ok += r.ok; mal += r.mal;
    if (r.mal) r.fallos.forEach(f => console.log("  ✗ " + f));
    else console.log("  ✓ " + c + ": P1=Crédito, P2=Contado (mapa efectivo)");
  }

  /* ── NACE ROJA: se invierte la regla en cada canal y debe caerse ── */
  console.log("  · invirtiendo el canon en cada canal (la prueba debe caerse):");
  for (const c of CANALES) {
    const src = bueno[c];
    const expr = exprEsCredito(src);
    if (!expr) { mal++; console.log("  ✗ " + c + ": no se pudo ubicar esCredito para el mutante"); continue; }
    /* invierte: P1 deja de ser crédito (tipo==="P1" → tipo==="__nunca__") */
    const exprMut = expr.replace(/tipo===["']P1["']/, 'tipo==="__nunca__"');
    if (exprMut === expr) { mal++; console.log("  ✗ " + c + ": el mutante no cambió nada"); continue; }
    const srcMut = src.replace(expr, exprMut);
    const r = canonDe(c, srcMut);
    if (r.mal > 0) { ok++; console.log("  ✓ " + c + " invertido → la prueba se cae (" + r.mal + " fallo(s))"); }
    else { mal++; console.log("  ✗ " + c + " invertido → PASA IGUAL: no está midiendo el mapa efectivo"); }
  }

  console.log("Resultado canon-paridad: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
