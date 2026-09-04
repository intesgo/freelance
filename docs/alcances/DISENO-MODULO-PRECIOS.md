# DISENO_MODULO_PRECIOS · Módulo propio «Precios»

**Ancla:** `DISENO_MODULO_PRECIOS`
**Archivo:** `sistema-web.html` · **Versión:** b242 · CACHE `freelance-v354`

## 1. Qué se cambia y por qué

«Costos y precios» pasa a tener entrada propia en el menú lateral («Precios»), para llegar
directo a trabajar precios sin pasar por la Ficha. NO se duplica el componente: se reusa
`PiladorasWeb` con un parámetro `modo`.

## 2. Cómo quedó

- **SECCIONES**: nueva entrada `{ key:"precios", ic:"tag", icon:"🏷️", label:"Precios", sub:"Actualizar costos y precios por piladora" }` tras `preciosvig`. `TODAS_LAS_SECCIONES` y `CARGOS_WEB` se derivan solos.
- **GRUPOS_MENU** («Comercial»): «precios» tras «preciosvig».
- **Router**: `case "precios"` se separó (no se duplicó) y renderiza `<PiladorasWeb usuario={sesion} modo="precios" />`. «ofertas/preciosvig/propuestas» siguen en `<PiladorasWeb usuario={sesion} />`.
- **Componente**: `function PiladorasWeb({ usuario, modo })` con `const soloPrecios = modo === "precios"`. En modo precios:
  - No se pintan las pestañas Ficha/Costos (se entra directo a costos; `secW` arranca en `"costos"`).
  - No se ofrece crear piladora.
  - El botón de volver dice «‹ Cambiar piladora».
  - Ancho `maxWidth` 1040 (760 en el módulo «Piladoras»).
  - **Recuerda la última piladora** (clave `freelance_precios_ultima_piladora`): al elegir se guarda; al cargar, si el código guardado sigue existiendo se abre sola, si no, se limpia sin error; «Cambiar piladora» borra la clave. Todo en try/catch.
- El módulo «Piladoras» (preciosvig) queda EXACTAMENTE igual: dos pestañas, alta de piladora, ancho 760, sin recordar piladora.

## 3. Qué NO se tocó

Los permisos ya están en `permisos_web_rol` (los puso Cowork, copiados de `preciosvig`).
Si el módulo no apareciera en el menú, no es bug del código: avisar a Cowork.

## 4. Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arnés propio: `pruebas/test_modulo_precios.js`. Además `test_menu_web.js` y `ARNES_SECCIONES_WEB.js PiladorasWeb`.
- En pantalla: «Precios» aparece en Comercial; entra directo a costos, recuerda la piladora, «Cambiar piladora» la olvida. «Piladoras» sigue igual.

## 5. Trampas conocidas

- `case "precios"` YA EXISTÍA en el router (fusionado): SEPARARLO, no duplicarlo (dos case con el mismo nombre no compila).
- El menú real sale de `permisos_web_rol`, no de `CARGOS_WEB`.
- El try/catch de localStorage no es adorno: sin él, una sesión privada deja la pantalla en blanco.
