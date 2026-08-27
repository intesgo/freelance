# Alcance · Proveedor: llave de sesión propia (convive con freelance en el mismo navegador)

Solo configuración del cliente Supabase. **No toca la base de datos.**

## Qué se cambia y por qué

La app del proveedor comparte el login con las demás apps de `intesgo.app` (mismo origen).
Instalar proveedor + freelance en el mismo navegador hace que una cierre la sesión de la
otra. Se le da a la app del proveedor su propia **llave de sesión** (`storageKey`) para que
convivan. Solo el proveedor reingresa una vez; las demás apps conservan su sesión (no se les
toca la llave).

## Archivos y puntos exactos

- **`proveedor-freelance.html`** — en el `createClient` (≈ línea 366) se agrega el tercer
  parámetro `{ auth: { storageKey: "sb-proveedor-freelance-auth" } }` (ancla
  `PROVEEDOR_SESION_PROPIA`).
- **`proveedor-freelance.html`** — `const VERSION` sube **71 → 72**, fecha «27 ago 2026»,
  con la descripción del cambio.
- **`sw.js`** — `const CACHE` sube al siguiente número.
- **Arneses de versión/caché** (mismo cambio): `test_cambios_422.js` (proveedor 71→72 y la
  CACHE), `test_cambios_419.js`, `test_fe01_tarifas.js`, `test_fe03_pagos.js` (la CACHE).

> Nota: el alcance original citaba CACHE v318→v319 y estos números están desactualizados
> respecto de `main`. Se parte de los números reales de `main` al ejecutarse (§9 «el alcance
> manda, pero no apaga el criterio»): proveedor 71→72 y CACHE v323→**v324**.

## Qué NO tocar

- El `createClient` de las otras apps (freelance-completo, Comisionista, socio,
  transportista, sistema-web): siguen con la llave por defecto para no cerrarle la sesión a
  nadie más.
- Lógica de permisos, RLS ni el camino demo. Es solo config del cliente Supabase.

## Cómo verificar

`node scripts/compilar.js` (6 apps) + `node pruebas/pruebas.js rapido` (los arneses de
versión/caché 419/422/fe01/fe03 pasan). En el celular tras publicar: instalar proveedor y
freelance en el mismo Chrome; entrar como proveedor en una y como freelance en la otra →
ambas mantienen su sesión a la vez. Debe salir la barra «Actualizar».

## Trampas conocidas

- Al cambiar el `storageKey`, la app del proveedor no encuentra la sesión vieja → pedirá
  login una vez. Es esperado (ya avisado en la desc de versión).
- Subir `VERSION` (proveedor) y `CACHE` (sw.js) juntos y dejar los arneses al día, o el robot
  no publica.
