# Alcance · La variedad del grano, visible e igual en las tres pantallas

Referencia de partida: `main` en commit **286eeac**. Dos archivos, todo de pantalla. **No
se toca la base de datos.** Sustituye al alcance «variedad-chip» (lo incluye completo y le
agrega la lista de Productos).

## Qué se cambia y por qué

La variedad del grano se ve en TRES pantallas y en las tres se lee distinto — y en la lista
de Productos ni siquiera aparece:

- **Lista de Productos** → NO se ve.
- **Ficha de la marca** → tres renglones que dicen lo mismo («Variedad» / «Tipo de Grano
  L1103» / «Familia L11»).
- **Piladoras · Costos y precios** → «Largo 011 · Especial», sin el código.

Quedan las tres iguales: una **pastilla con el código** y, al lado, la **descripción en
palabras**. La pastilla YA ES la variedad, y sus 3 primeras letras YA SON la familia (código
= familia(3) + nivel(2)), así que se gana el dato sin gastar renglones. Y se unifica el
nombre a **Variedad** en todos lados.

## PARTE A · `freelance-completo.html`

- **A.1 · Helpers compartidos** a nivel de módulo (antes de `const STOCK_DEMO = {`):
  `varFamCod`/`varNivCod`/`varFamDesc`/`varNivDesc`/`varTexto`. Esto DESBLOQUEA la lista de
  Productos (hoy `familiaCorta`/`nivelDe` viven sueltos dentro de `PiladorasApp`).
- **A.2 · La pastilla** `.chip-var` (antes de `.ficha-sec{`), con variables de tema (Sol/Noche).
- **A.3 · Lista de Productos**: renglón nuevo bajo la marca con el código en pastilla +
  `varTexto`; «Sin variedad» en color arcilla cuando falta.
- **A.4 · Piladoras · Costos y precios**: pastilla `{tgCod}` delante de `subtVar` (sin
  cambiarlo); los helpers locales `familiaCorta`/`nivelDe` pasan a apoyarse en los del módulo.
- **A.5 · Ficha de la marca**: encabezado `Variedad`; a la derecha la pastilla + `varTexto`
  debajo.
- **A.6 · Textos**: todo a «Variedad» (botones, toasts, ficha-sec, h3).

## PARTE B · `sistema-web.html` (solo textos)

- `Tipo de grano (variedad)` → `Variedad` (ficha del producto y modal Nuevo producto).
- Toast de error → «No se pudo guardar la variedad: ».
- `<h3>Variedad de grano</h3>` → `<h3>Variedad</h3>`.
- Ahí NO entra la pastilla: el `<select>` ya muestra código + descripción.

Comprobación: `grep -n "Tipo de grano\|Tipo de Grano" freelance-completo.html sistema-web.html`
no debe devolver nada fuera de comentarios y de las cadenas VERSION.

## Qué NO se debe tocar

La base (nada: `tipo_grano` sigue siendo una columna de 5; la familia se deriva, no se crea
columna). `FAMILIAS_GRANO`/`NIVELES_GRANO`/`VARIEDADES_GRANO`. El ajuste por bloque y sus
`slice(0,3)`/`slice(3,5)`. El modal de reclasificar y `guardarTipoGrano`. El aviso «⚠ Sin
clasificar». La clase `.chip` (la nueva es `.chip-var`). Emoji de línea, chevron «›» y el
`onClick` que abre la ficha. Los comentarios que digan «tipo de grano» (describen la columna
real). Roles/permisos y las apps del vendedor.

## Versión y caché

`freelance-completo.html` 477→478 · `sistema-web.html` 215→216 · `sw.js` CACHE al siguiente ·
ajustar `test_cambios_419`, `test_cambios_422`, `test_fe01_tarifas`, `test_fe03_pagos`.

## Cómo verificar

`node scripts/compilar.js` + `node pruebas/pruebas.js rapido`. Esperado en verde:
`test_catalogo_productos` 39, `test_base_pct` 10, `test_marca_exclusiva` 30, `test_no_se_cae`.
En el celular: pastilla + descripción en Productos, «Sin variedad» arcilla, pastilla en
Costos y precios (sigue abriendo el modal), ficha «Variedad» con pastilla + botón «Cambiar
variedad», toast «✓ Variedad guardada», Sistema Web con campo «Variedad»; legible en los tres
temas.
