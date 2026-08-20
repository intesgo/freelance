#!/usr/bin/env node
/* PED P1-4 · Cupo de crédito y piso de P5, igualados entre app y web.
   Decisiones: exceso de cupo = PERMITIR CON AUTORIZACIÓN (no bloquear);
   P5 bajo el costo de la piladora = BLOQUEAR; el flete/estibada NO entran al
   piso (se cobran aparte, fe02). Este arnés cae si algo se revierte. */
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
const app=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* ── anclas ── */
ok(/PED_CUPO_WEB/.test(web), "web · ancla PED_CUPO_WEB presente");
ok(/PED_PISO_P5/.test(web) && /PED_PISO_P5/.test(app), "ancla PED_PISO_P5 en web y app");

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

/* ── B · PISO de P5 = BASE de la oferta según la condición, SIN flete/estibada.
   Igual que el servidor (v_base): crédito→baseCredito (respaldo a contado);
   contado→baseContado. ── */
ok(/const baseP5 = prod \? \(esCredito \? \(Number\(prod\.baseCredito\)\|\|Number\(prod\.baseContado\)\|\|0\) : \(Number\(prod\.baseContado\)\|\|0\)\) : 0;/.test(web),
  "web · el piso de P5 es la base de la oferta según la condición (no un costo único)");
ok(/const pisoUnidad = Math\.round\(baseP5 \* 100\) \/ 100;/.test(web),
  "web · pisoUnidad se calcula desde baseP5");
ok(!/costoUnidad \+ \(fletePiso \+ estibadaPiso\)/.test(web),
  "web · el piso YA NO suma flete/estibada (no doble-cuenta)");
ok(/const bajoPiso = pisoConocido && esFreelanceWeb/.test(web), "web · se conserva el bloqueo bajoPiso para P5");

/* ── B · PISO de P5 en la APP (base según condición) ── */
ok(/const baseP5 = prod \? \(esCredito \? \(Number\(prod\.baseCredito\)\|\|Number\(prod\.baseContado\)\|\|0\) : \(Number\(prod\.baseContado\)\|\|0\)\) : 0;/.test(app),
  "app · piso de P5 = base de la oferta según la condición");
ok(/const bajoPisoP5 = tipo==="P5" && baseP5>0 && precio!=="" && precioNum>0 && precioNum < baseP5;/.test(app),
  "app · bloquea P5 por debajo de la base de la oferta");
ok(/const valido = cli && prov && prod &&[\s\S]{0,140}&& !bajoPisoP5/.test(app),
  "app · valido incluye !bajoPisoP5 (P5 bajo la base NO se puede armar)");
ok(/P5 sigue yendo a autorización/.test(app) || /esP5 \|\| excedeCupo/.test(app),
  "app · P5 (válido) sigue yendo a autorización");

if(m){console.error(`P1-4-CUPO-P5: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`P1-4-CUPO-P5: ${b} ✓ · 0 ✗`);
