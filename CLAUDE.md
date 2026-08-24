# CLAUDE.md — Reglas de trabajo del proyecto FREELANCE

Este archivo manda. Cualquier sesión de Claude que trabaje en este repositorio debe
leerlo primero y seguir estas reglas. Están escritas para que cualquier cambio salga
bien y no tumbe producción (**intesgo.app**).

---

## 0. Cómo hablar

- Responde **siempre en español (Ecuador)**: claro, directo y sin tecnicismos
  innecesarios. El dueño no es programador; explica en palabras del negocio.
- Di las cosas como son: si una prueba falla, dilo con la salida real. Si algo quedó
  a medias, dilo. No des por hecho el deploy sin verlo.

---

## 1. Qué es este repositorio

Son **apps de una sola página, hechas en React dentro de un solo archivo HTML**. No hay
build de framework ni empaquetador de módulos: cada app es un `.html` con su código JSX
en un bloque `<script type="text/babel">`, y **React + Babel entran por CDN** (Babel
compila el JSX en el navegador en desarrollo; al publicar se precompila, ver §4).

Apps móviles (una carpeta por rol):

| Archivo | Rol |
|---|---|
| `freelance-completo.html` | Freelance (dueño/administrador) |
| `Comisionista.html` | Comisionista / vendedor |
| `socio-comercial.html` | Socio comercial |
| `proveedor-freelance.html` | Proveedor / piladora |
| `transportista-app.html` | Transportista / chofer |

Además: **`sistema-web.html`** es el Sistema Web de oficina. Se compila igual que las
apps y se publica en su propia carpeta `/home` (URL limpia `intesgo.app/home`); genera
también un `version.json` que la app lee para avisar de una versión nueva.

Otras piezas:

- `sw.js` — service worker: avisos en la bandeja del teléfono **y modo offline** (guarda
  las pantallas para que la app abra sin internet en el campo). Regla de oro del archivo:
  **nunca dejar al usuario sin app**.
- `scripts/compilar.js` — compilador de publicación (ver §4).
- `pruebas/pruebas.js` — corre todos los arneses de prueba de un solo golpe (ver §3).
- `index.html` — portada con las apps. `lib/` — React, ReactDOM y Supabase servidos
  desde el propio sitio. `pwa/` — iconos y manifests. `CNAME` — el dominio propio.

### Reglas de arquitectura (no negociables)

- **No migrar a JavaScript "vanilla" ni a otro framework.** Se quedan como React en un
  solo HTML.
- **No introducir CDN nuevos.** Lo que haya que agregar va **embebido dentro del HTML**.
  React/ReactDOM/Supabase ya viven en `./lib/` para que el arranque y el modo offline no
  dependan de terceros; solo quedan en CDN piezas puntuales que **no** bloquean el
  arranque (jspdf, tesseract, xlsx). No sumes dependencias externas nuevas.

### Reglas de UI / diseño

- **No repetir el título del módulo dentro del componente** (Sistema Web): la cabecera del
  menú (`SECCIONES`: `label` + `sub`, pintada por `Header`) ya lo muestra. El componente **NO**
  debe pintar un `<h2>` (ni otro encabezado) con el mismo título del módulo. Conservar solo el
  texto explicativo/ayuda si aporta. (Ancla usada al limpiar: `DISENO_TITULO_UNICO`.)

---

## 2. Antes de tocar nada: sincronízate con `main`

Este repo **avanza rápido**. Antes de empezar **cualquier** cambio, ponte en la última
versión de `main`. Nunca trabajes sobre una copia vieja.

```bash
git fetch origin main
git checkout main
git pull origin main
```

- **Cambios grandes o ambiguos:** primero **pregunta** con opciones cortas (2–4) antes de
  ejecutar.
- **Cambios pequeños y claros:** hazlos directo, sin dar vueltas.

---

## 3. Después de cada cambio: valida

Después de tocar cualquier app o el `sw.js`, valida **siempre** las dos cosas, en orden.
Si algo falla, no está listo.

```bash
# 1) Compila (si una app no compila, no se publica nada)
node scripts/compilar.js

# 2) Corre las pruebas rápidas (las mismas que corre el robot de publicación)
node pruebas/pruebas.js rapido
```

Otras formas útiles de correr las pruebas:

```bash
node pruebas/pruebas.js               # todo, incluso el visor de pantallas (necesita Chromium)
node pruebas/pruebas.js Comisionista  # solo lo que toca esa app
```

`rapido` deja fuera únicamente los arneses que necesitan navegador. Es exactamente lo
que corre GitHub Actions, así que si pasa aquí, pasa allá.

---

## 4. Al publicar: sube versión y caché (la barra "Actualizar")

Para que en el celular salga la barra **"Actualizar"** cuando cambies algo, hay que subir
dos números en el mismo cambio:

1. **La versión de la app** — la constante `VERSION` dentro del propio HTML:
   ```js
   const VERSION = { n:"426", fecha:"…", desc:"…" };
   ```
   (cada app lleva su propia numeración; `sistema-web.html` la suya).
2. **El motor offline** — la constante `CACHE` en `sw.js`:
   ```js
   const CACHE = "freelance-v217";
   ```

Si no subes estos números, el teléfono sigue sirviendo la copia guardada y el usuario no
ve la actualización.

### ✅ Checklist de publicación — SIEMPRE los dos números juntos

**Cada publicación (Sistema Web incluido) sube en el MISMO cambio:**

1. `VERSION.n` del HTML que tocaste (el Sistema Web lleva su propia numeración `b###`).
2. `CACHE` en `sw.js` al siguiente número (`freelance-v###`).

**Por qué salen (o no) las barras «Actualizar» — dos motores distintos:**

- **Apps móviles** (freelance, comisionista, socio, proveedor, transportista): el aviso lo
  dispara el **service worker**. Si no subes `CACHE`, el teléfono sigue sirviendo la copia
  guardada y no se entera.
- **Sistema Web** (`intesgo.app/home`): el aviso lo dispara **`version.json`** — el compilador
  lo regenera con `VERSION.n` en cada publicación, y la página lo compara contra la versión que
  tiene cargada. Es decir: **para el Sistema Web, lo que hace salir la barra es subir `VERSION.n`**
  (no el `CACHE`). Aun así, **sube igual `CACHE`**: el mismo `sw.js` (scope `/`) cachea todo el
  sitio, y `version.json` **se lee siempre de la red, nunca de la caché** (regla puesta en `sw.js`,
  con su guard en `test_cambios_422.js`) — no la rompas.

**Regla de oro:** si publicas el Sistema Web y NO sube `VERSION.n`, la barra «Actualizar» **no
sale**. Sube `VERSION.n` **y** `CACHE`, y ajusta los arneses de versión/caché (§4 arriba).

### ⚠️ IMPORTANTE — Arneses atados a versión y diseño

Hay pruebas amarradas a la **versión** y al **diseño** de las pantallas, por ejemplo:

- `pruebas/test_cambios_419.js`
- `pruebas/test_cambios_422.js`
- `pruebas/test_operacion_424.js`
- y los arneses de secciones/barras/menús que verifican cómo se ve cada pantalla.

**Si cambias la versión (`VERSION`/`CACHE`) o el diseño de una pantalla, actualiza esos
arneses en el MISMO cambio.** Si no, el robot de publicación (GitHub Actions) falla y
**no publica**. Antes de dar por terminado, revisa qué arnés valida la pantalla o la
versión que tocaste y ajústalo.

---

## 5. El deploy (cómo llega a producción)

- Al hacer **merge a `main`**, GitHub Actions (`.github/workflows/publicar.yml`):
  1. corre las **pruebas** (`node pruebas/pruebas.js rapido`),
  2. **compila** las apps (`node scripts/compilar.js`, que precompila el JSX a JS plano
     para que el teléfono abra mucho más rápido),
  3. **publica** el resultado en la rama `gh-pages`, servida en **intesgo.app**.
- **Si una prueba falla, NO publica.** Es a propósito: protege producción.
- El archivo `CNAME` (una línea: `intesgo.app`) debe existir en la raíz. Sin él, la
  publicación borra el dominio propio y el sitio se cae. El compilador se planta si falta.
- **No dar por hecho el deploy sin verificarlo.**

---

## 6. Autonomía en cambios de código (flujo completo, sin pedir fusión)

Para **cambios de código** (apps `.html`, `sw.js`, `scripts/`, `pruebas/`, y la documentación
del repo como este `CLAUDE.md`), Claude hace **todo el flujo de punta a punta, sin pedir
permiso para fusionar ni publicar**:

1. **Crea** la rama y el cambio (sincronizado con `main` primero, §2).
2. **Prueba:** `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (§3);
   sube `VERSION` y `CACHE` y ajusta los arneses atados a versión/diseño cuando aplique (§4).
3. **Abre el Pull Request** y lo **fusiona a `main`** cuando esté verde. En este repo las
   pruebas de publicación corren **al hacer push a `main`** (`publicar.yml`), no sobre el PR:
   por eso "verde" = las pruebas locales pasan (el mismo `pruebas.js rapido` que corre el
   robot) y el PR está limpio/mergeable. Si el robot falla tras el merge, **no publica** y
   hay que arreglarlo enseguida.
4. **Confirma el deploy:** vigila la corrida de `publicar.yml` sobre `main` hasta que termine
   en verde y avisa que salió (o reporta el fallo con la salida real). No dar por hecho el
   deploy sin verlo (§5).

**La ÚNICA excepción es la base de datos**, y desde el 13/08/2026 **no es tarea de Code**:
la base la maneja Claude en Cowork, con aprobación del dueño (ver §9). Si un trabajo parece
necesitar tocar Supabase —insert, update, delete, migración, carga masiva—, **no lo hagas**:
dilo en la respuesta para que se resuelva desde Cowork. El resto del flujo (crear, probar,
fusionar, publicar) no necesita permiso.

---

## 7. Seguridad (base de datos, claves, respaldos)

- **Ninguna escritura en la base (Supabase)** —insert, update, delete, migración, carga
  masiva— sin un **resumen previo y la aprobación expresa del dueño**. Desde el 13/08/2026
  la base la trabaja Claude en Cowork (§9): **Code no la toca**, solo avisa si hace falta.
- **Claves y tokens nunca por el chat.** No los pidas, no los pegues, no los repitas.
- **Nunca restaurar un respaldo encima de producción.**

---

## 8. Roles, permisos y negocio

- **Respeta los roles y permisos de cada app.** No cambies la lógica de permisos: toca
  solo lo que se pida.
- **Mantén coherencia con el negocio:** jerarquía freelance, quintales, roles y las reglas
  del proyecto. Ante la duda sobre una regla de negocio, pregunta antes de cambiarla.

---

## 9. Reparto del trabajo: Cowork define el alcance, Code construye y publica

**Vigente desde el 13/08/2026.** El trabajo va en dos manos y cada una tiene lo suyo:

**Claude en Cowork** (la sesión del móvil, con acceso a Supabase) hace el trabajo previo:
investiga, revisa la base, propone y **escribe el alcance** de cada modificación. Además
**es la única que toca la base de datos**, con el resumen y la aprobación expresa del dueño,
ensayando antes con `BEGIN … ROLLBACK`.

**Claude Code** (esta sesión, en el repositorio) **construye, prueba y publica**: toma el
alcance, hace el cambio en las apps, valida y lleva a producción con el flujo completo de §6.

### Reglas de esta división

- **Code NO toca la base de datos.** Ni migraciones, ni `insert/update/delete`, ni cargas.
  Si un alcance parece necesitar un cambio de base, **no lo hagas**: dilo en la respuesta para
  que se resuelva desde Cowork. (Antes esto era "con aprobación"; ahora directamente no es
  tarea de Code.) Las funciones de base que un alcance mande **usar** ya están aplicadas.
- **El alcance manda, pero no apaga el criterio.** Si al construir descubres que el alcance
  rompe algo (una app que escribe donde no debía, una variable que queda huérfana, un arnés
  atado a la versión), **para y avísalo**. Vale más un aviso que un deploy roto.
- **Dónde viven los alcances:** `docs/alcances/`. Cada uno dice qué se cambia, qué **no** se
  debe tocar, cómo verificar que salió bien, y las trampas conocidas.

### Qué debe traer un alcance (para poder construirlo sin adivinar)

1. **Qué se cambia y por qué** — en una línea, en lenguaje de negocio.
2. **Archivos y puntos exactos** — app, función o componente, con números de línea de
   referencia.
3. **Qué NO se debe tocar** — lo que debe seguir igual (camino demo, otros roles, otras apps).
4. **Cómo verificar** — qué pruebas correr y qué mirar en el celular después de publicar.
5. **Trampas conocidas** — lo que ya se revisó y lo que puede morder.

---

## Resumen de un vistazo

1. Español claro (Ecuador). 2. React en un solo HTML, sin vanilla y sin CDN nuevos.
3. Sincroniza con `main` antes de empezar. 4. Grande/ambiguo → pregunta; pequeño/claro →
hazlo. 5. Tras cada cambio: `node scripts/compilar.js` y `node pruebas/pruebas.js rapido`.
6. Al publicar: sube `VERSION` (HTML) y `CACHE` (`sw.js`), y **actualiza los arneses de
versión/diseño en el mismo cambio**. 7. Cambios de código: **flujo completo sin pedir fusión**
(crear → probar → fusionar → publicar → confirmar el deploy). 8. **La base no es tarea de
Code** (la trabaja Cowork con aprobación del dueño): si hace falta tocarla, avisa y no lo
hagas. Claves nunca por chat; nunca restaurar sobre producción. 9. No toques permisos ni
reglas de negocio salvo lo pedido. 10. **Cowork define el alcance (`docs/alcances/`), Code
construye y publica** (§9); si el alcance rompe algo, para y avísalo.
