# SEG_PRECIOS_SOLO_FREELANCE · Solo el Freelance mueve costos y precios

**Ancla:** `SEG_PRECIOS_SOLO_FREELANCE` · **Vigente:** 04/09/2026
**Archivos:** `sistema-web.html` (PiladorasWeb) · `proveedor-freelance.html` (PrecioSheet)
**Versiones:** Sistema Web b242 · proveedor v79 · CACHE `freelance-v354`

## 1. Qué se cambia y por qué

Hasta hoy el módulo de Piladoras del Sistema Web no comprobaba el rol: quien lo veía,
editaba precios. Y la app de la piladora dejaba a la piladora subir su propio costo. Desde
el 04/09/2026 **solo el Freelance mueve costos y precios, sin excepciones** (esto revierte
la regla del 26/07/2026).

## 2. Cómo quedó

### Sistema Web (PiladorasWeb)
- Candado por rol: `const esFreelancePil = usuario.rol === "Freelance"` y `soloLectura = !esFreelancePil`.
- En **solo lectura** NO se pintan (no solo se deshabilitan): «✎ Editar» de una oferta,
  «Ajustar por grano» y sus exclusiones, y todo botón de guardar costo/base. Junto al nombre
  de la piladora sale el chip **«Solo lectura · los precios los mueve el freelance»**.
- SÍ se ven en solo lectura: la lista, el buscador de marcas y el historial de precios.
- No cambian: la Ficha, el alta de piladora ni el ocultar/reactivar piladora.

### App de la piladora (proveedor-freelance · PrecioSheet)
- Se retiró la captura de costo: los dos campos de costo, el bloque «¿Desde cuándo rige?»,
  el aviso «entra solo» y el botón «Guardar costo». Se retiró también el handler `onCambiar`
  y con él la función `cambiarEnBase` (que escribía por el RPC `cambiar_costo`).
- Se conserva el **historial de costos** (solo lectura): es lo único que le sirve a la
  piladora para verificar con qué costo se le liquida. En su lugar, una línea sobria:
  **«El costo lo actualiza el freelance. Escríbele si cambió.»**
- No se tocó: facturar, despachar, confirmar regalo, notas de crédito ni el resto.

## 3. Qué NO se tocó

- La base de datos (Supabase). El cierre de las políticas de `ofertas_piladora` lo hace
  Cowork **después** de publicar esto (ver el documento de estado, §E).
- Roles, permisos y reglas de negocio fuera de precios/costos.

## 4. Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arnés propio: `pruebas/test_precios_solo_freelance.js`. Además, `test_costo_piladora.js`
  se reescribió: ahora comprueba que la app de la piladora YA NO captura costo y que el
  historial sigue visible (es la memoria de que la regla cambió).
- En pantalla: entrar al Sistema Web con rol Contadora → en Piladoras sale el chip «Solo
  lectura» y no hay botones de edición; con rol Freelance, se edita normal. En la app de la
  piladora, la pantalla de Precios ya no deja capturar costo pero muestra el historial.

## 5. Trampas conocidas

- Deshabilitar en vez de ocultar deja botones muertos: se OCULTAN.
- Si se retira `onCambiar` sin retirar el botón que lo dispara, la app del proveedor revienta
  al tocarlo: se retiraron los dos.
- NO borrar el historial de costos de la app del proveedor.
