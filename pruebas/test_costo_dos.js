#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   COSTO DE COMPRA EN DOS · contado y crédito (App Freelance)

   El precio de VENTA ya se mostraba en dos (contado/crédito); el COSTO de
   compra se mostraba como un solo número, aunque la base ya guarda los dos
   (ofertas_piladora.costo = crédito, .costo_contado = contado). Ahora el
   módulo de Precios muestra AMBOS costos:
     · helper costoCompra(p): saca crédito y contado de p.costo/p.costoContado
       o de p.costos (por piladora); devuelve null en el que NO exista, para
       no pintar «$0,00» como si fuera un costo real.
     · la tarjeta «Compra» del detalle y la fila de la lista muestran los dos.
     · la utilidad/margen se rotula «sobre costo crédito» para no confundir.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const fl = fs.readFileSync(path.join(__dirname, "..", "freelance-completo.html"), "utf8");

let bien = 0, mal = 0;
const prueba = (ok, msg) => { if (ok) bien++; else { mal++; console.error("✗ " + msg); } };

/* ── El helper que saca los dos costos ── */
prueba(/function costoCompra\(p\)\{/.test(fl), "existe el helper costoCompra(p)");
prueba(/const cred = \(Number\(p&&p\.costo\)>0\) \? Number\(p\.costo\) : minPos\(costos\.map\(c=>c\.costoCredito\)\)/.test(fl),
  "el crédito sale de p.costo o de p.costos (costoCredito)");
prueba(/const cont = \(Number\(p&&p\.costoContado\)>0\) \? Number\(p\.costoContado\) : minPos\(costos\.map\(c=>c\.costoContado\)\)/.test(fl),
  "el contado sale de p.costoContado o de p.costos (costoContado)");
prueba(/const minPos = \(arr\)=>\{ const v=\(arr\|\|\[\]\)\.map\(Number\)\.filter\(n=>n>0\); return v\.length\?Math\.min\(\.\.\.v\):null; \}/.test(fl),
  "minPos ignora 0/null y devuelve null si no hay ninguno (no pinta $0)");

/* ── Los dos costos, disponibles también en el catálogo demo ── */
prueba(/costoContado: pr\.costoContado != null \? pr\.costoContado : Math\.round\(pr\.baseCredito\*0\.870\*100\)\/100/.test(fl),
  "el catálogo demo también trae costoContado (para verse en la práctica)");

/* ── La tarjeta «Compra» del detalle muestra crédito Y contado ── */
prueba(/const cc=costoCompra\(p\); return \(<>/.test(fl), "el detalle calcula ambos costos con costoCompra");
prueba(/\{cc\.cred!=null\?money\(cc\.cred\):"—"\}/.test(fl) && /crédito<\/div>/.test(fl), "la tarjeta Compra muestra el costo a crédito (o guion)");
prueba(/\{cc\.cont!=null\?money\(cc\.cont\):"—"\}/.test(fl) && /contado<\/div>/.test(fl), "la tarjeta Compra muestra el costo a contado (o guion)");

/* ── La lista también muestra los dos (créd / cont) ── */
prueba(/créd<\/span>/.test(fl) && /cont<\/span>/.test(fl), "la fila de la lista muestra costo a crédito y a contado");

/* ── El margen queda rotulado «sobre costo crédito» ── */
prueba(/Utilidad calculada sobre el costo a crédito\./.test(fl), "se rotula que la utilidad es sobre el costo a crédito");
prueba(/s\/ crédito/.test(fl), "el margen sugerido por canal se rotula «s/ crédito»");

/* ── No se tocó la lógica de cálculo (la utilidad sigue contra el crédito) ── */
prueba(/const bruta=Math\.round\(\(p\.baseCredito-\(p\.costo\|\|0\)\)\*100\)\/100/.test(fl), "la fórmula de utilidad NO cambió (sigue sobre el costo a crédito)");

if (mal) { console.error(`Resultado COSTO-DOS: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado COSTO-DOS: ${bien} ✓ · 0 ✗`);
