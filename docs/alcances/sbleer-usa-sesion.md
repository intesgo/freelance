# Alcance · Sistema Web · `sbLeer` usa la sesión del usuario (no la llave pública)

## 1. Qué se cambia y por qué (una línea, negocio)
Las lecturas del Sistema Web que pasan por `sbLeer` usaban **siempre la llave pública
(anon)**. Como por seguridad anon ya **no** puede leer las vistas/tablas, todo lo que pasa
por `sbLeer` volvía **vacío** aunque el usuario estuviera logueado. Efectos visibles:
1. El **indicador de conexión** (`EstadoConexion`, lee `v_salud_sistema`) se quedaba en
   «⚪ Modo demostración» aunque los módulos mostraran datos reales.
2. El **módulo Marcas** del web (lee `marcas` / `marca_presentaciones` /
   `marca_exclusividades` por `sbLeer`) quedaba sin datos reales.

Prioridad MEDIA. Solo **front**; no toca base (el rol `authenticated` ya tiene permiso de
lectura — verificado el 27/08).

## 2. Qué se cambió (una sola función + una mejora fina)
`sistema-web.html`, función `sbLeer(recurso, params)` (≈línea 235):
- Antes del `fetch`, se toma el token de la sesión actual y se usa como `Bearer`; si no hay
  sesión, cae a la llave pública (así el modo demo sigue igual):
  ```js
  let token = SUPABASE_ANON;
  try {
    const { data:s } = await window.supa.auth.getSession();
    if (s && s.session && s.session.access_token) token = s.session.access_token;
  } catch(e) {}
  ...
  headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` }
  ```
  El header `apikey` se queda con la llave pública (PostgREST lo exige); lo que cambia es el
  `Authorization: Bearer` con el token del usuario cuando hay sesión. Ancla `SBLEER_SESION`.
- **Mejora fina** en `EstadoConexion`: además de leer al montar, re-evalúa cuando **entra o
  cambia la sesión** (`onAuthStateChange`), por si la primera lectura corrió sin sesión aún.
  Guardado: si solo existe el puente (sin `supabase-js` real, sin `.auth`), no hay
  `onAuthStateChange` y no pasa nada.

## 3. Qué NO se tocó
- Base ni permisos (el rol `authenticated` ya lee salud/marcas/presentaciones/exclusividades).
- El camino demo: sin sesión, `sbLeer` usa anon → vacío → demo (correcto).
- Las lecturas que ya usan `window.supa.from(...)` (esas ya van con la sesión).

## 4. Cómo verificar (en modo REAL, con sesión)
- El indicador de arriba pasa a «🟢 Conectado a la base».
- El módulo Marcas muestra las marcas reales (no vacío/demo).
- Sin iniciar sesión: sigue en «⚪ Modo demostración» (correcto).
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde
  (116 ✓). VERSION Sistema Web **b220** + CACHE **v330**; arneses de versión al día.

## 5. Trampas conocidas
- Es el patrón «integral para todos los aplicativos»: `sbLeer` es el **punto único** a
  corregir en el web. Las lecturas con `.from(...)` ya usaban la sesión; las que dependían de
  anon (vía `sbLeer`) eran las que quedaban mudas.
- El puente de respaldo `window.supa` (cuando `supabase-js` no cargó) no tiene `.auth`: el
  `try/catch` lo cubre y el token cae a anon (comportamiento demo), sin romper la pantalla.
