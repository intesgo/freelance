# TANDA 2D · Equivalencia obligatoria, tipo_precio por condición y cantidad decimal

Solo frontend (`freelance-completo.html` + `sistema-web.html`). NO tocar base/RPC/RLS.
Ancla `/* PED_EQUIV_OBLIGATORIA */`. Preservar las correcciones previas (canon P1/P2,
conversión qq, cupo vivo, estados de edición).

## Problema
1. Varios puntos usaban `Number(equiv)||1`: una presentación distinta de Quintal sin
   equivalencia válida (0/null/NaN) se guardaba como si fuera 1 qq — cantidad cruda a la base.
2. Al faltar `tipo_precio`, la web ponía "P1" fijo aunque la línea fuera de contado
   (P1=Crédito → contradice el canon).
3. La cantidad usaba `parseInt`, que trunca 12,5 → 12; el quintal admite fracciones.

## Cambios
### freelance-completo.html
- `guardarEdicionPedido` (save real de edición, ~L25746): antes de convertir/mandar, se
  valida cada línea. Si la presentación NO es Quintal y su `equiv` no es > 0 → NO se guarda:
  `alert` que nombra el producto y la presentación. Las líneas en quintales van con 1.
- Versión v465.

### sistema-web.html
- **Saneo del catálogo (hallazgo §9, corregido):** el armador construía cada presentación
  con `equiv: Number(o.equiv_qq) || 1` (PRODS_PED, ~L5423) y `agregarLinea` repetía
  `Number(prod.equiv)||1` (~L5769): una equivalencia 0/null se convertía en 1 **antes** de
  llegar al guard, así que en el pedido NUEVO el bloqueo nunca disparaba. Se agregó el helper
  a nivel de módulo `equivDePresentacionWeb(rawEquiv, unidad)`: respeta el equiv válido (>0),
  da 1 solo al Quintal, y deja 0 a cualquier otra presentación sin equivalencia — para que el
  guardado la RECHACE. Sin esto, el resto de la 2D era letra muerta en el camino de alta.
- Helper `equivInvalidaWeb(l)` + `avisoSinEquiv(l)` (~L5812): una presentación no-Quintal
  con `equiv` inválido corta el guardado.
  - `subirPedido` (nuevo pedido): `carrito.find(equivInvalidaWeb)` → avisa y no llama al RPC.
  - `guardarCambiosPedido` (edición): `vivos.find(equivInvalidaWeb)` → avisa y no llama al RPC.
- `tipo_precio` por condición:
  - `construirLineaDesdeItem` (~L5859): `it.tipo_precio || (it.condicion==="contado" ? "P2" : "P1")`.
  - payload de `guardarCambiosPedido` (~L5917): `l.tipo||(l.credito?"P1":"P2")`.
- Cantidad decimal: `numDecWeb(v)` acepta coma o punto; `const cantNum = numDecWeb(cant)`
  (antes `parseInt`). 12,5 se conserva.
- Versión b181.

### sw.js
- Caché `freelance-v276`.

## Qué NO se toca
Base/RPC/RLS. Comisionista y socio-comercial YA rechazaban el guardado si falta la
equivalencia (`items.some(it=>!it.prod.equiv)` en guardarPedidoOficina) y usan
`Number(equiv)>0?…:1`, no el `||1` silencioso: están conformes, no se tocan.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- `pruebas/test_equiv_obligatoria.js` (nuevo, JSDOM): presentación no-Quintal sin
  equivalencia ⇒ no deja guardar (mensaje con producto y presentación) y no llama al RPC;
  una línea de contado sin tipo_precio deriva P2; una cantidad 12,5 llega como 12,5.
  Mutantes que caen: volver a `Number(equiv)||1`; fijar `tipo_precio="P1"`; volver a `parseInt`.
- Guards de fuente en `test_cambios_422.js`.
- En el celular/web: intentar guardar un pedido/edición con una presentación sin
  equivalencia debe avisar y no guardar; una cantidad con decimales debe conservarse.

## Versiones
Freelance v465, Sistema Web b181, caché `freelance-v276`.

## Trampas conocidas
- El pedido NUEVO de la web manda `cantidad_presentacion` + `pres_cod` cruda y el RPC
  convierte con la equivalencia de la base; el `equiv` de JS ahí alimenta el total del
  flete y ahora también corta el guardado si es inválido. La conversión con `equiv` en JS
  ocurre en la EDICIÓN (`guardarCambiosPedido` / `guardarEdicionPedido`).
- El fallback de tipo_precio que más pesa es el de la CARGA de edición
  (`construirLineaDesdeItem`), porque desde ahí `l.tipo` ya viaja con valor.
