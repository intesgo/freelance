# PED · El "Monto del pedido" es la SUMA de las líneas (no cantidad × precio promedio)

Solo frontend. Archivos: `freelance-completo.html`, `Comisionista.html`, `socio-comercial.html`
(+ `sistema-web.html` confirmado). Ancla `/* PED_MONTO_SUMA_LINEAS */`. NO tocar base/RPC/RLS.

## Problema (verificado · PD-260822080542200-E693)
Líneas 50 qq×$42 + 12,5 qq×$43 + 10 qq×$47 = **$3.107,50**, pero la ficha mostraba
**$3.107,35** (−$0,15). Causa: el pedido agrupado no exponía el importe real; guardaba
`precio` = promedio redondeado (`importe/cant`), y el "Monto del pedido" se reconstruía como
`p.cant × p.precio` (72,5 qq × 42,86 = 3.107,35). La base y el DETALLE de líneas estaban bien.

## Cambio
1. **`vivoPedidos` (freelance) y equivalentes (Comisionista, socio)**: exponen `importe`
   exacto (`Math.round(importe*100)/100`, con `importe = Σ qqDe(i)×precio_usd`).
2. **freelance**: helper a nivel de módulo `montoDePedido(p)` — si el pedido trae `lineas`,
   el total = `Σ round(qq×precio, 2)` (coincide al centavo con el detalle); si no, usa
   `importe`; si tampoco, cae a `cant×precio` (tarjetas sin detalle). El "Monto del pedido"
   (ficha, lista, tarjeta) usa `montoDePedido(p)`, ya no `p.cant*p.precio`.
3. El precio promedio se sigue mostrando como "$X c/u" y sirve para el orden, pero **nunca**
   para el total del pedido.
4. **sistema-web.html**: ya usa `importe` (P0-2) en el total de la cabecera del acordeón, no un
   promedio. Confirmado — no requiere cambio.

## Qué NO se toca
Base/RPC/RLS. El precio promedio de referencia. El detalle de líneas (ya estaba bien).
Comisionista/socio no reconstruían un total global desde `cant×precio` (muestran cantidad y
precio por unidad), así que solo exponen `importe` (precautorio, punto 1).

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- `pruebas/test_monto_suma_lineas.js`: extrae la función real `montoDePedido` y la evalúa con
  el caso obligatorio → $3.107,50 (no $3.107,35); coincide con la suma del detalle; fallback a
  `cant×precio` sin líneas; usa `importe` si está. Mutante que cae: volver a `cant×precio`.
- Guards de fuente en `test_cambios_422.js` (ancla en los 3 apps, `montoDePedido`, uso en el
  monto, y exposición del `importe`).
- En el celular: abrir la ficha del pedido PD-260822080542200-E693 → "Monto del pedido" = $3.107,50.

## Versiones
Freelance v467, Comisionista v190, Socio v57, caché `freelance-v279`.

## Trampas conocidas
- `montoDePedido` prioriza `lineas` sobre `importe` para coincidir al centavo con el detalle
  (que muestra cada línea redondeada a 2 decimales). El `importe` expuesto (Σ sin redondear
  por línea) sirve de respaldo y para las tarjetas sin `lineas`.
- El promedio (`p.precio`) sigue vivo para "$X c/u" y el ordenamiento; solo se quitó del total.
