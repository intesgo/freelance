#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   DISENO_MODAL_SCROLL · el modal «Asignar / Replicar piladoras» (CatalogoWeb)
   se arma en TRES zonas: cabecera fija · cuerpo con scroll · pie fijo con UN
   solo botón de guardar SIEMPRE visible. Antes, con muchas piladoras el panel
   crecía a lo largo (961px medidos) y el botón Guardar quedaba fuera de la
   pantalla. Además, todos los demás modales del Sistema Web y de la app del
   proveedor quedan topados a la altura de la pantalla (maxHeight + overflow)
   para que nunca boten un botón fuera de vista.

   Inspección del fuente (no navegador). Igual estilo que test_cambios_*.
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");
const web = fs.readFileSync(path.join(raiz, "sistema-web.html"), "utf8");
const prov = fs.readFileSync(path.join(raiz, "proveedor-freelance.html"), "utf8");
let b = 0, m = 0;
const ok = (c, x) => { if (c) b++; else { m++; console.error("✗ " + x); } };

/* Aislar el JSX del modal reestructurado (desde su ancla hasta el cierre del IIFE) */
const iniModal = web.indexOf("DISENO_MODAL_SCROLL · panel en tres zonas");
const finModal = web.indexOf("Barra flotante: qué hacer con lo marcado");
ok(iniModal !== -1 && finModal !== -1 && finModal > iniModal,
   "se encuentra el bloque del modal DISENO_MODAL_SCROLL");
const modal = web.slice(iniModal, finModal);

/* 1 · el panel tope su altura y esconda el desborde (para que las zonas manden) */
ok(/maxHeight:"90vh"/.test(modal) && /overflow:"hidden"/.test(modal),
   "el panel del modal declara maxHeight y overflow:\"hidden\"");

/* 2 · el panel es una columna flex (cabecera / cuerpo / pie apilados) */
ok(/display:"flex"/.test(modal) && /flexDirection:"column"/.test(modal),
   "el panel del modal usa display:flex + flexDirection:column");

/* 3 · el CUERPO con scroll · overflowY:auto y minHeight:0 (la trampa del flexbox) */
ok(/overflowY:"auto"[^}]*minHeight:0|minHeight:0[^}]*overflowY:"auto"/.test(modal) ||
   (/overflowY:"auto"/.test(modal) && /minHeight:0/.test(modal)),
   "el cuerpo del modal tiene overflowY:\"auto\" y minHeight:0 (sin minHeight:0 no aparece el scroll)");

/* 4 · el PIE fijo · flexShrink:0 y una línea superior (borderTop) que lo separa */
ok(/flexShrink:0[^}]*borderTop|borderTop[^}]*flexShrink:0/.test(modal) ||
   (/flexShrink:0/.test(modal) && /borderTop/.test(modal)),
   "el pie del modal es fijo (flexShrink:0) y lleva borderTop");

/* 5 · UN SOLO botón de guardar en el modal → una sola llamada a replicarEnBloque */
const llamadas = (modal.match(/replicarEnBloque\(/g) || []).length;
ok(llamadas === 1,
   "hay EXACTAMENTE una llamada a replicarEnBloque en el modal (un solo botón de guardar), no " + llamadas);

/* 6 · el rótulo del botón: sin piladoras → «Guardar tipo de marca»; con piladoras
       → «Asignar/Replicar en N piladora(s)». Se verifica evaluando la misma
       lógica que trae el fuente. */
ok(/rotuloBtn = \(!sinPiladoras && selPiladoras\.length>0\)/.test(web) &&
   /"Guardar tipo de marca"/.test(web) &&
   /" piladora" \+ \(selPiladoras\.length===1 \? "" : "s"\)/.test(web) &&
   !/useState\([^)]*rotuloBtn/.test(web),
   "el rótulo del botón se deriva de sinPiladoras/selPiladoras (no es useState)");
const rotulo = (sinPiladoras, replicarProvCod, sel) =>
  (!sinPiladoras && sel.length > 0)
    ? ((replicarProvCod ? "Replicar" : "Asignar") + " en " + sel.length + " piladora" + (sel.length === 1 ? "" : "s"))
    : "Guardar tipo de marca";
ok(rotulo(true, false, []) === "Guardar tipo de marca",
   "sin piladoras seleccionadas el botón dice «Guardar tipo de marca»");
ok(rotulo(false, false, ["A", "B", "C"]) === "Asignar en 3 piladoras",
   "con 3 piladoras el botón dice «Asignar en 3 piladoras»");
ok(rotulo(false, true, ["A"]) === "Replicar en 1 piladora",
   "replicando en 1 piladora el botón dice «Replicar en 1 piladora» (singular)");

/* 7 · TODOS los demás modales quedan topados a la altura de la pantalla.
       Ningún panel de modal (stopPropagation + fondo blanco + borderRadius:16)
       del Sistema Web puede quedarse sin maxHeight — salvo el reestructurado,
       que en su lugar usa overflow:hidden + las tres zonas. */
const rePanel = /<div onClick=\{e=>e\.stopPropagation\(\)\} style=\{\{ background:"#fff", borderRadius:16[^\n]*\}\}>/g;
let mBad = 0, mTot = 0, mm;
while ((mm = rePanel.exec(web)) !== null) {
  mTot++;
  const linea = mm[0];
  const topado = /maxHeight:/.test(linea);          // topa la altura
  const esZonas = /overflow:"hidden"/.test(linea);  // el modal en tres zonas
  if (!topado && !esZonas) { mBad++; console.error("   ↳ panel sin maxHeight: " + linea.slice(0, 90) + "…"); }
}
ok(mTot >= 12, "se detectan los paneles de modal del Sistema Web (encontrados " + mTot + ")");
ok(mBad === 0, "todos los paneles de modal del Sistema Web topan su altura (maxHeight) o son el de tres zonas — sin topar: " + mBad);

/* 8 · regresión: ningún panel de modal del Sistema Web con padding:"24px" pero
       sin maxHeight (era la firma exacta del panel que botaba el botón). */
ok(!/borderRadius:16[^\n]*padding:"24px"(?![^\n]*maxHeight)/.test(web) &&
   !/borderRadius:16(?![^\n]*maxHeight)[^\n]*padding:"24px"/.test(web),
   "no queda ningún panel con padding:\"24px\" sin maxHeight (regresión del botón fuera de vista)");

/* La app del proveedor: sus dos modales de confirmación (anular / rechazar)
   también topados. */
const provPaneles = (prov.match(/onClick=\{e=>e\.stopPropagation\(\)\} style=\{\{background:"#fff",borderRadius:16[^\n]*maxHeight:"92vh",overflowY:"auto"\}\}/g) || []).length;
ok(provPaneles >= 2,
   "los dos modales de la app del proveedor (anular/rechazar) topan su altura (encontrados " + provPaneles + ")");

if (m) { console.error(`MODAL-SCROLL: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`MODAL-SCROLL: ${b} ✓ · 0 ✗`);
