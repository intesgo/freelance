#!/usr/bin/env node
/* PED P1-4b · Cupo de crédito y piso de P5, igualados entre app y web.
   Decisiones: exceso de cupo = PERMITIR CON AUTORIZACIÓN (no bloquear);
   P5 bajo el COSTO+margen_min de la piladora = BLOQUEAR; el flete/estibada NO
   entran al piso (se cobran aparte, fe02). La condición del P5 la ELIGE el
   usuario (contado/crédito). Este arnés cae si algo se revierte. */
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
const app=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* ── anclas ── */
ok(/PED_CUPO_WEB/.test(web), "web · ancla PED_CUPO_WEB presente");
ok(/PED_PISO_P5_V2/.test(web) && /PED_PISO_P5_V2/.test(app), "ancla PED_PISO_P5_V2 en web y app");

/* ── A · CUPO (web): cuenta SOLO crédito del carrito, excluye contado y P5 ── */
ok(/carrito\.filter\(it=>it\.credito && it\.tipo!=="P5"\)/.test(web),
  "web · el cupo cuenta solo líneas a crédito del carrito (excluye contado y P5)");
ok(/const exponeCupo = \(esCredito && !esP5\) \? totalLinea : 0;/.test(web),
  "web · la línea en curso expone cupo solo si es crédito y NO P5");
ok(/const excedeCupo = cli && !cli\.bloqueado && esCredito && !esP5 &&[\s\S]{0,120}creditoEnCarritoWeb \+ exponeCupo > cli\.cupo/.test(web),
  "web · excedeCupo se calcula sobre el crédito real (no sobre todo el carrito)");
/* ── A · el exceso NO bloquea: pasa a autorización ── */
ok(/const valido = cli && !cli\.bloqueado && prod && cantNum>0 && baseLista && precioOk && p5Ok && !bajoPiso;/.test(web),
  "web · valido YA NO incluye !excedeCupo (el exceso no bloquea)");
ok(!/&& !excedeCupo/.test(web), "web · no queda ningún '&& !excedeCupo' que bloquee el armado");
ok(/const requiereAutorizacion = \(esP5 && !esFreelanceWeb\) \|\| excedeCupo;/.test(web),
  "web · el exceso de cupo → requiere autorización (como la app)");

/* ── App (referencia del cupo): ya cuenta solo crédito, exceso → autorización ── */
ok(/carrito\.filter\(it=>it\.credito\)\.reduce/.test(app), "app · el cupo cuenta solo líneas a crédito (referencia)");
ok(/const requiereAutorizacion = esP5 \|\| excedeCupo;/.test(app), "app · exceso de cupo → autorización (no bloquea)");

/* ── B · La CONDICIÓN del P5 la elige el usuario (contado/crédito), no es fija ── */
ok(/const esCredito = tipo==="P1" \|\| \(\(tipo==="P3"\|\|tipo==="P5"\) && condP3==="credito"\);/.test(web),
  "web · el P5 toma la condición elegida (esCredito sin caso fijo de P5)");
ok(/const esCredito = tipo==="P1" \|\| \(\(tipo==="P3"\|\|tipo==="P4"\|\|tipo==="P5"\) && condP3==="credito"\);/.test(app),
  "app · el P5 toma la condición elegida (esCredito con P5)");

/* ── B · PISO de P5 = COSTO(condición) × (1 + margen_min/100), SIN flete/estibada.
   Costo por condición: crédito→costo; contado→costoContado. margen_min de la
   oferta (si falta, 0). NO es la base de venta. ── */
ok(/margenMin: Number\(o\.margen_min\) \|\| 0/.test(web), "web · el catálogo trae margen_min de la oferta");
ok(/const pisoCreditoP5 = prod \? Math\.round\(\(Number\(prod\.costo\)\|\|0\) \* \(1 \+ margenMinP5\/100\)/.test(web),
  "web · piso P5 crédito = costo × (1 + margen_min/100)");
ok(/const pisoContadoP5 = prod \? Math\.round\(\(Number\(prod\.costoContado\)\|\|Number\(prod\.costo\)\|\|0\) \* \(1 \+ margenMinP5\/100\)/.test(web),
  "web · piso P5 contado = costoContado × (1 + margen_min/100)");
ok(!/const pisoUnidad = Math\.round\(baseP5/.test(web), "web · el piso YA NO es la base de la oferta (baseP5)");
ok(/const bajoPiso = pisoConocido && esFreelanceWeb/.test(web), "web · se conserva el bloqueo bajoPiso para P5");

/* ── B · PISO de P5 en la APP (costo × margen según condición) ── */
ok(/margenMin:Number\(o\.margen_min\)\|\|0/.test(app), "app · el catálogo trae margen_min de la oferta");
ok(/const pisoCreditoP5 = prod \? Math\.round\(\(Number\(prod\.costo\)\|\|0\) \* \(1 \+ margenMinP5\/100\)/.test(app),
  "app · piso P5 crédito = costo × (1 + margen_min/100)");
ok(/const pisoContadoP5 = prod \? Math\.round\(\(Number\(prod\.costoContado\)\|\|Number\(prod\.costo\)\|\|0\) \* \(1 \+ margenMinP5\/100\)/.test(app),
  "app · piso P5 contado = costoContado × (1 + margen_min/100)");
ok(/const bajoPisoP5 = tipo==="P5" && pisoUnidadP5>0 && precio!=="" && precioNum>0 && precioNum < pisoUnidadP5;/.test(app),
  "app · bloquea P5 por debajo del piso (costo + margen)");
ok(/const valido = cli && prov && prod &&[\s\S]{0,160}&& !bajoPisoP5/.test(app),
  "app · valido incluye !bajoPisoP5 (P5 bajo el piso NO se puede armar)");
ok(/esP5 \|\| excedeCupo/.test(app),
  "app · P5 (válido) sigue yendo a autorización");

if(m){console.error(`P1-4-CUPO-P5: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`P1-4-CUPO-P5: ${b} ✓ · 0 ✗`);
