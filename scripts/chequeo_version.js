#!/usr/bin/env node
/* ══ CHEQUEO RÁPIDO DE VERSIÓN (corre en segundos, ANTES de la batería) ══
   Objetivo: no esperar ~6 min de pruebas ni publicar algo que NADIE verá porque
   se olvidó subir los números. Reglas del CLAUDE.md §4 (dos motores distintos):

     · Sistema Web  → la barra «Actualizar» la dispara version.json (= VERSION.n).
       Si tocaste sistema-web.html pero VERSION.n quedó igual a lo publicado, NADIE
       ve el cambio. (Es exactamente lo que pasó cuando quedó pegada en 197.)
     · Apps móviles → la barra la dispara el service worker (CACHE en sw.js).
       Cada publicación debe subir CACHE; si no, el teléfono sigue sirviendo la
       copia guardada.

   FALLA-CERRADO solo ante un problema CONFIRMADO (tocaste algo y el número NO se
   movió respecto de lo publicado). Ante cualquier duda de infra (no se pudo leer
   lo publicado, primera publicación, etc.) DEJA PASAR: nunca bloquea un deploy
   legítimo por un tropiezo del propio chequeo.

   Entradas por variables de entorno (las arma el paso de publicar.yml):
     CHANGED       · archivos cambiados en este push (git diff --name-only HEAD^ HEAD)
     LIVE_VERSION  · contenido de home/version.json ya publicado (o vacío)
     LIVE_SW       · contenido de sw.js ya publicado (o vacío)
*/
const fs = require("fs");

const changed = (process.env.CHANGED || "").split(/\s+/).filter(Boolean);
const liveVersionRaw = (process.env.LIVE_VERSION || "").trim();
const liveSw = process.env.LIVE_SW || "";
const primeraVez = !liveVersionRaw;   // gh-pages aún no existe / no se pudo leer → no hay con qué comparar

const APPS = ["sistema-web.html", "freelance-completo.html", "Comisionista.html",
              "socio-comercial.html", "proveedor-freelance.html", "transportista-app.html"];

/* Números LOCALES (los que se van a publicar) */
const web = fs.readFileSync("sistema-web.html", "utf8");
const sw  = fs.readFileSync("sw.js", "utf8");
const localWebV  = (web.match(/const VERSION = \{ n:"(\d+)"/) || [])[1] || null;
const localCache = (sw.match(/const CACHE = "freelance-v(\d+)"/) || [])[1] || null;

/* Números PUBLICADOS (los que están hoy en la calle) */
let liveWebV = null; try { liveWebV = String((JSON.parse(liveVersionRaw) || {}).v || ""); } catch (_) {}
const liveCache = (liveSw.match(/const CACHE = "freelance-v(\d+)"/) || [])[1] || null;

const tocoApp = APPS.some(a => changed.includes(a));
const tocoSw  = changed.includes("sw.js");

const errs = [];
/* 1) Sistema Web: si lo tocaste y su VERSION.n no se movió, la barra no sale */
if (!primeraVez && changed.includes("sistema-web.html") && localWebV && liveWebV && localWebV === liveWebV)
  errs.push(`Tocaste sistema-web.html pero VERSION.n sigue en ${localWebV} (igual que lo publicado). ` +
            `Súbela: la barra «Actualizar» del Sistema Web no saldría (version.json no cambia).`);
/* 2) Apps móviles / sw.js: si tocaste algo y CACHE no se movió, los teléfonos no se enteran */
if (!primeraVez && (tocoApp || tocoSw) && localCache && liveCache && localCache === liveCache)
  errs.push(`Tocaste una app o sw.js pero CACHE sigue en freelance-v${localCache} (igual que lo publicado). ` +
            `Súbelo en sw.js: los teléfonos seguirían sirviendo la copia guardada.`);
/* 3) Sanidad mínima: los números deben existir */
if (!localWebV)  errs.push("No se encontró VERSION.n en sistema-web.html.");
if (!localCache) errs.push("No se encontró CACHE en sw.js.");

if (errs.length) {
  console.error("✗ Chequeo de versión (§4 del CLAUDE.md):\n  - " + errs.join("\n  - "));
  process.exit(1);
}
console.log("✓ Chequeo de versión OK" +
  (primeraVez ? " (primera publicación: sin comparación)"
              : ` · Sistema Web b${localWebV} · caché v${localCache}`));
