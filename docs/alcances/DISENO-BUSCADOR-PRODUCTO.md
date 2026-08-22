# DISEÑO · Realce del buscador de Producto en «Tomar pedido»

Solo estilo (`freelance-completo.html`). Ancla `/* DISENO_BUSCADOR_PRODUCTO */`. NO se tocó
la lógica de búsqueda, el filtrado fuzzy, el catálogo, el dictado por voz ni el flujo de
Tomar pedido.

## Problema
El buscador de «Producto» solo mostraba el caret de 1px y no comunicaba que hay que escribir
ahí. El de «Cliente» sí invita (clase `busc-cliente`: borde verde, fondo suave, lupa marcada y
pulso). Se reusó ese mismo realce.

## Qué se hizo (3 cambios chicos)
1. Al div del SearchSelect de Producto se le agregó la clase existente `busc-cliente`
   (`busc-grande productos-scroll busc-cliente`): hereda el borde 2px verde, fondo `#F7FBF8`,
   lupa verde y el pulso `buscHalo` (ya respeta `prefers-reduced-motion`). No se duplicó CSS.
2. Caret en verde de marca, acotado al buscador con realce:
   `.busc-cliente .box input{caret-color:var(--field)}` (junto a las reglas de `.busc-cliente`).
3. Placeholder que invita: `"Producto"` → `"Escribe o dicta el producto"` (solo ese placeholder).

## Qué NO se toca
- La función `SearchSelect`, el fuzzy, `maxItems`, el dictado por voz, `productosDelProv` y el
  flujo de Tomar pedido.
- Los buscadores de cliente y proveedor quedan igual.
- Permisos y negocio.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (111).
- En el celular: Tomar pedido → elige cliente y proveedor; el campo de Producto debe verse con
  borde verde, fondo suave, lupa marcada y el texto «Escribe o dicta el producto». La búsqueda y
  el dictado funcionan igual que antes.

## Versiones
Freelance **v468**, caché **freelance-v284**.

## Trampas conocidas
- El realce aplica cuando el SearchSelect de Producto está montado (cliente y proveedor
  elegidos, producto aún no elegido), que es justo cuando el campo es visible.
