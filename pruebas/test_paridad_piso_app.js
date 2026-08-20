/* PED_TESTS_PARIDAD */
/* ═══════════════════════════════════════════════════════════════════════
   EL PISO DEL PRECIO ESPECIAL (P5) LO PONE EL COSTO, NO EL CAPRICHO
   · freelance-completo (app del dueño)

   Regla del negocio (ancla PED_PISO_P5_V2): un Precio Especial (P5) puede
   bajar desde la base de venta, pero NUNCA por debajo del PISO:

       piso = costo(según la condición) × (1 + margen_mínimo/100)

   · a CONTADO el costo es `costoContado`; a CRÉDITO es `costo`.
   · un P5 por DEBAJO del piso NO se puede armar (el botón de solicitud queda
     deshabilitado, porque `valido` incluye `!bajoPisoP5`).
   · un P5 IGUAL o por ENCIMA del piso sí pasa.

   Con el mismo precio, la CONDICIÓN cambia el resultado: si el costo a contado
   es más barato que el de crédito, un precio puede estar sobre el piso de
   contado y a la vez bajo el de crédito. Esta prueba lo comprueba en las dos
   condiciones.

   CÓMO SE MIDE (importante): no se re-escribe la fórmula. Se EXTRAEN del código
   fuente las expresiones REALES —`esCredito`, `margenMinP5`, `pisoContadoP5`,
   `pisoCreditoP5`, `pisoUnidadP5`, `bajoPisoP5` y `valido`— y se EVALÚAN con
   `new Function` contra entradas controladas. Corre el código de verdad, no una
   copia. Por eso, si un mutante baja o quita el piso, la evaluación cambia y la
   prueba se cae. (Se usa evaluación de expresiones y no el render completo
   porque llegar al panel P5 del Pedido de freelance-completo con datos de
   demostración es frágil; la evaluación de las expresiones reales es
   determinista y mide exactamente la regla del piso.)

   NACE ROJA a propósito: al final se rompe la regla en el fuente, una a la vez,
   y se comprueba que la prueba SE CAE. Hay una rotura tonta además de la
   semántica.

   Uso: node test_paridad_piso_app.js [ruta.html]
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const R = require("./rutas");

const ruta = process.argv[2] || R.app("freelance-completo");
const nombreApp = ruta.split("/").pop();
const html = fs.readFileSync(ruta, "utf-8");
const jsx = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];

const ESPERADAS = 8;
const MUTANTES_ESPERADOS = 2;

/* ── Extrae del fuente un `const NOMBRE = …;` completo, tal cual está escrito.
      Si el trozo no aparece exactamente una vez, revienta: así un cambio de
      forma en el fuente no pasa como si nada. `ancla` es el arranque único de
      la sentencia; se corta en el primer `;`. ── */
function sacar(src, ancla) {
  const veces = src.split(ancla).length - 1;
  if (veces !== 1) throw new Error("el ancla «" + ancla + "» aparece " + veces + " veces (se esperaba 1)");
  const i = src.indexOf(ancla);
  const j = src.indexOf(";", i);
  if (j < 0) throw new Error("no hay «;» tras el ancla «" + ancla + "»");
  return src.slice(i, j + 1);
}

/* ── Arma la función que corre las expresiones REALES del fuente. Recibe el
      producto (costo/costoContado/margenMin), el tipo, la condición y el precio
      escrito, y devuelve { pisoUnidadP5, bajoPisoP5, valido }.
      Las demás piezas de `valido` (baseLista, precioOk, …) se pasan en verde
      para que `valido` dependa SOLO del piso: es lo que se está midiendo. ── */
function construirEvaluador(src) {
  const lineas = [
    sacar(src, "const esCredito ="),
    sacar(src, "const margenMinP5 ="),
    sacar(src, "const pisoContadoP5 ="),
    sacar(src, "const pisoCreditoP5 ="),
    sacar(src, "const pisoUnidadP5 ="),
    sacar(src, "const bajoPisoP5 ="),
    sacar(src, "const valido = cli && prov && prod && cantN>0"),
  ];
  const cuerpo = `
    "use strict";
    const precio = precioStr;
    const precioNum = parseFloat(precio) || 0;
    const esP5 = tipo === "P5";
    ${lineas.join("\n    ")}
    return { pisoUnidadP5:pisoUnidadP5, bajoPisoP5:bajoPisoP5, valido:valido };
  `;
  /* Todas las piezas ajenas al piso llegan en verde: así valido = !bajoPisoP5 */
  const f = new Function(
    "prod","tipo","condP3","precioStr",
    "cli","prov","cantN","baseLista","precioOk","p5Ok","p3Ok","bloqueado","bajoMinimo",
    cuerpo);
  return (prod, tipo, condP3, precioStr) =>
    f(prod, tipo, condP3, precioStr, true, true, 50, true, true, true, true, false, false);
}

/* ══ La batería. Se corre igual contra el código bueno y contra los mutantes ══ */
function bateria(src, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };
  const cerca = (a, b) => Math.abs(a - b) < 0.005;

  let evaluar;
  try { evaluar = construirEvaluador(src); }
  catch (e) { return { ok:0, mal:1, fallos:["no se pudo leer la regla del piso: " + e.message] }; }

  /* Producto de prueba: costo a crédito 34, a contado 30, margen mínimo 10%.
     piso crédito = 34 × 1,10 = 37,40 · piso contado = 30 × 1,10 = 33,00 */
  const prod = { costo:34, costoContado:30, margenMin:10 };
  const ev = (tipo, cond, precio) => {
    try { return evaluar(prod, tipo, cond, precio); }
    catch (e) { return { pisoUnidadP5:"reventó", bajoPisoP5:"reventó", valido:"reventó" }; }
  };

  /* ── Valores del piso: la fórmula real da 37,40 (crédito) y 33,00 (contado) ── */
  comprobar("piso de CRÉDITO = costo 34 × (1 + 10%) = 37,40",
    cerca(ev("P5","credito","40").pisoUnidadP5, 37.40));
  comprobar("piso de CONTADO = costoContado 30 × (1 + 10%) = 33,00",
    cerca(ev("P5","contado","40").pisoUnidadP5, 33.00));

  /* ── CRÉDITO ── */
  comprobar("P5 crédito a $40 (sobre el piso 37,40): SE PUEDE armar",
    ev("P5","credito","40").valido === true && ev("P5","credito","40").bajoPisoP5 === false);
  comprobar("P5 crédito a $35 (bajo el piso 37,40): NO se puede armar (bloqueado)",
    ev("P5","credito","35").valido === false && ev("P5","credito","35").bajoPisoP5 === true);
  comprobar("P5 crédito a $37,40 (justo en el piso): SE PUEDE armar (igual pasa)",
    ev("P5","credito","37.40").valido === true && ev("P5","credito","37.40").bajoPisoP5 === false);

  /* ── CONTADO (mismo precio, otro piso) ── */
  comprobar("P5 contado a $34 (sobre el piso 33,00): SE PUEDE armar",
    ev("P5","contado","34").valido === true && ev("P5","contado","34").bajoPisoP5 === false);
  comprobar("MISMO precio $34, pero a CRÉDITO (bajo el piso 37,40): NO se puede armar",
    ev("P5","credito","34").valido === false);
  comprobar("P5 contado a $30 (bajo el piso 33,00): NO se puede armar (bloqueado)",
    ev("P5","contado","30").valido === false && ev("P5","contado","30").bajoPisoP5 === true);

  return { ok, mal, fallos };
}

/* ══ Las roturas a propósito: la prueba tiene que NACER ROJA ══ */
const MUTANTES = [
  /* (1) se BAJA/QUITA el piso: si «bajo el piso» ya no compara contra el piso
         sino contra 0, ningún precio queda nunca bajo el piso → un P5 regalado
         pasaría. Debe tumbar los casos «bajo el piso». */
  ["baja/quita el piso (precioNum < pisoUnidadP5 → precioNum < 0)",
    `precioNum < pisoUnidadP5`,
    `precioNum < 0`],
  /* (TONTA) el piso se pone en cero: si el piso unitario es 0, nunca hay «bajo
         el piso» y además los valores del piso dejan de dar 37,40 / 33,00. Una
         rotura boba que la prueba tiene que cazar. */
  ["TONTA · el piso unitario siempre es 0",
    `const pisoUnidadP5 = tipo==="P5" ? (esCredito ? pisoCreditoP5 : pisoContadoP5) : 0;`,
    `const pisoUnidadP5 = tipo==="P5" ? 0 : 0;`],
];

(() => {
  console.log("═══ El piso del precio especial (P5) · " + nombreApp);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const r = bateria(jsx, true);
  let ok = r.ok, mal = r.mal;

  if (ok + mal !== ESPERADAS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
      (ok + mal - 1) + ". Alguna se perdió o se agregó sin declararla.");
  }

  console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
  if (MUTANTES.length !== MUTANTES_ESPERADOS) {
    mal++;
    console.log("  ✗ AVISO: se declararon " + MUTANTES_ESPERADOS + " mutantes y hay " + MUTANTES.length + ".");
  }
  for (const [nombre, dee, a] of MUTANTES) {
    const veces = jsx.split(dee).length - 1;
    if (veces !== 1) {
      mal++;
      console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
      continue;
    }
    const mutado = jsx.replace(dee, a);
    let res;
    try { res = bateria(mutado, false); }
    catch (e) { res = { mal:1, fallos:["reventó: " + e.message] }; }
    if (res.mal > 0) {
      ok++;
      console.log(`  ✓ «${nombre}» → la prueba se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
    } else {
      mal++;
      console.log(`  ✗ «${nombre}» → la prueba PASA IGUAL: no está midiendo nada`);
    }
  }

  console.log("Resultado del piso de P5: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
