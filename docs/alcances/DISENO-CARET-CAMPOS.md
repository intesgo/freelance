# DISEÑO · Cursor grueso verde en campos de escritura (global)

Solo estilo (CSS) en `freelance-completo.html`. Ancla `/* DISENO_CARET_CAMPOS */`. NO se tocó
lógica, validaciones ni los valores de los campos.

## Objetivo
En cualquier campo donde el usuario escribe con el teclado, cuando está VACÍO se ve un cursor
grueso verde parpadeando (imposible no verlo); apenas escribe, desaparece. Reemplaza el caret
de 1px casi invisible. Es global, con una sola regla CSS: no se toca campo por campo.

## Cómo (una regla CSS)
El caret nativo no se puede engrosar, así que se dibuja uno con `background-image` (barra de
3px×22px a la izquierda) que solo aparece con `:placeholder-shown` (campo vacío con placeholder)
y parpadea con `@keyframes caretSenuelo`. Al escribir (`:not(:placeholder-shown)`) se apaga el
señuelo y el caret nativo queda en verde de marca.

- **Solo campos de teclado:** text, search, number, tel, email, `input` sin type, y textarea.
  Quedan FUERA (por los selectores): date/time/month, checkbox, radio, file, button y `<select>`.
- **Color por variable `--caret`:** por defecto es `var(--field)` (verde de marca). En el tema
  **noche** los inputs tienen fondo oscuro (`#1E2C26`), donde el `--field` casi negro no se vería:
  ahí `--caret` pasa a `#57A773` (verde claro). Se agregó `--caret` en `:root` y en `[data-tema="noche"]`.
- **Campos grandes centrados excluidos:** `.qty-input` (cantidad/precio, 22px, centrado) y
  `.stepper input` se excluyen del señuelo (a la izquierda se vería descentrado) y solo reciben
  `caret-color:var(--caret)`. El caret nativo ya se nota por el tamaño grande.
- **Reduce motion:** el parpadeo se apaga con `@media (prefers-reduced-motion:reduce)`.

## Relación con el cambio anterior (buscador de producto)
- El realce del buscador de PRODUCTO (clase `busc-cliente`: borde/fondo/lupa/pulso) y su
  placeholder «Escribe o dicta el producto» SE MANTIENEN.
- Este cursor grueso es GLOBAL, así que SUSTITUYE la regla de caret que iba solo para el buscador
  de producto: se eliminó `.busc-cliente .box input{caret-color:var(--field)}` (ya no se duplica).

## Qué NO se toca
- Lógica, validaciones y valores de los campos.
- No se agregaron placeholders nuevos: los campos ya tenían el suyo (el señuelo requiere placeholder;
  si a futuro un campo importante no lo tuviera, se le pone uno breve, pero en esta tanda no hizo falta).
- Los buscadores usan la lupa como `<span>` aparte, así que el fondo del input queda libre para el señuelo.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (111).
- En el celular: buscador de producto/cliente, un campo de nota, un número y un teléfono →
  vacío muestra la barra gruesa que parpadea; al escribir desaparece y el texto se ve normal.
  En cantidad/precio (grande, centrado) el caret verde se ve sin barra descentrada.

## Versiones
Freelance **v469**, caché **freelance-v285**.

## Trampas conocidas
- Especificidad: la exclusión `input.qty-input:placeholder-shown` empata con el bloque del señuelo
  y gana por orden de aparición (va después). Si se reordena el CSS, mantener la exclusión luego del
  bloque global.
- En noche, `[data-tema="noche"] input{background:#1E2C26}` usa el shorthand `background`, pero el
  bloque del señuelo tiene mayor especificidad para `background-image`, así que la barra sobrevive
  sobre el fondo oscuro.
