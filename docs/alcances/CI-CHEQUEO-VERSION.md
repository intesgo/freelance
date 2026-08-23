# Alcance · CI — chequeo rápido de versión (falla en segundos)

> Archivos: `.github/workflows/publicar.yml` y `scripts/chequeo_version.js`.
> Mejora de proceso: acortar el tiempo cuando hay un error de publicación, sin bajar
> ninguna de las validaciones que protegen producción.

## Qué se cambia y por qué

Cada publicación esperaba ~6 min de batería para, recién ahí, enterarse de que se olvidó
subir `VERSION.n`/`CACHE` (fue lo que dejó el Sistema Web pegado en b197). Ahora, **antes**
de `npm ci` y de la batería, corre un chequeo de **segundos** que detiene el pipeline si
tocaste una app o `sw.js` pero **no** subiste los números respecto de lo **ya publicado**.

Reglas (las dos «puertas Actualizar» del CLAUDE.md §4):
- **Sistema Web** → la barra la dispara `version.json` (= `VERSION.n`). Si tocaste
  `sistema-web.html` y `VERSION.n` quedó igual a lo publicado → falla.
- **Apps móviles** → la barra la dispara `CACHE` en `sw.js`. Si tocaste una app o `sw.js` y
  `CACHE` quedó igual a lo publicado → falla.

## Detalles de diseño

- **Falla-cerrado solo ante un problema CONFIRMADO** (tocaste algo y el número no se movió
  vs lo vivo). Ante cualquier duda de infra (no se pudo leer `gh-pages`, primera publicación)
  **deja pasar**: nunca bloquea un deploy legítimo por un tropiezo del propio chequeo.
- **No fuerza subir versión en cambios que no son de app**: si el push solo toca `docs/`,
  `pruebas/` o el propio CI, no exige bump (no hay app tocada).
- Corre **sin `npm ci`** (solo `fs` de Node) → milisegundos. El `checkout` usa `fetch-depth: 2`
  para poder diferenciar `HEAD^..HEAD` (qué archivos cambió el push), y lee lo publicado con
  `git show FETCH_HEAD:home/version.json` y `:sw.js` tras `git fetch origin gh-pages`.

## Qué NO cambia

- La batería completa (`pruebas.js rapido`), el compilado y la publicación a `gh-pages`
  siguen igual: el chequeo es una **puerta previa**, no reemplaza nada.
- No toca apps, ni `sw.js`, ni la base, ni permisos → no lleva bump de `VERSION`/`CACHE`.

## Cómo verificar

- `node scripts/chequeo_version.js` probado en 5 escenarios (tocó Web sin subir versión → falla;
  versión subida → pasa; tocó app con CACHE igual → falla; solo docs/CI → pasa; primera vez → pasa).
- Tras fusionar: el propio push del cambio corre el nuevo paso; como no toca apps, pasa y publica.

## Trampas conocidas

- El chequeo compara contra **lo publicado en `gh-pages`**, no contra el commit anterior de
  `main`: así detecta el caso real («se publicó pero el número no se movió»).
- Si `gh-pages` no existe aún (primera vez), no hay con qué comparar → deja pasar.
