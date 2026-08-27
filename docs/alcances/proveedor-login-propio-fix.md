# FIX urgente · Login propio en la app del proveedor

**Prioridad ALTA (bug en producción).** Tras el #125 (llave de sesión propia del proveedor),
la app del proveedor dejó de dejar entrar. Solo config/UI del front. **No toca la base.**

## Causa
El #125 le dio a la app del proveedor su propia llave de sesión
(`storageKey:"sb-proveedor-freelance-auth"`), pero su login mandaba al **portal**
(`./index.html`), que inicia sesión con el cliente por defecto y guarda la sesión en la
**llave por defecto**. La app del proveedor lee su **llave propia** → nunca encuentra esa
sesión → se queda en el login para siempre.

## Qué se cambia (`proveedor-freelance.html` · `PuertaPortal`)
- Se conserva la comprobación de sesión (`getSession` → `usuarios` por `auth_uid` →
  `onAutenticado`), extraída a `verificarSesion()` para reutilizarla.
- El bloque «Ir al portal e ingresar» se reemplaza por un **formulario propio**: correo +
  clave, botón **Ingresar** → `window.SB.auth.signInWithPassword({email,password})`. Si falla,
  mensaje claro sin salir; si OK, se vuelve a correr `verificarSesion()` para entrar.
- «¿Olvidaste tu clave?» usa `resetPasswordForEmail(correo)` (dentro de la app, sin portal).
- `salirDeVerdad`: al cerrar sesión ahora **recarga la app** (`volverAlLogin`) → sin sesión,
  `PuertaPortal` muestra el formulario. Ya no manda al portal.
- El `createClient` (llave propia del #125) **no se toca**: `signInWithPassword` guarda la
  sesión en la llave correcta automáticamente.

## Qué NO se toca
El #125 (la llave propia se queda). El login de las otras apps ni el portal `index.html`.
Base, permisos ni el camino demo (el chequeo de `usuarios.activo`/`rol` se mantiene igual).

## Versión y caché
proveedor 73→74, `sw.js` CACHE v325→v326. Arneses de versión al día (`test_cambios_419/422`,
`test_fe01_tarifas`, `test_fe03_pagos`). `test_puerta.js` ahora es consciente de la app: para el
proveedor valida el login propio (signInWithPassword, sin enlace al portal); las demás apps
siguen validando el portal.

## Cómo verificar
`node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde. En el celular: abrir la
app del proveedor → sale el formulario de correo + clave → entrar con josselinz92@gmail.com →
entra como Piladora San Agustín. Cerrar sesión vuelve al formulario, no al portal. Proveedor y
freelance conviven en el mismo Chrome, cada uno con su sesión.
