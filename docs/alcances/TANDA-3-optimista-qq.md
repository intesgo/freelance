# TANDA 3 · Tarjeta optimista de la app en quintales

Solo frontend. Archivo principal `freelance-completo.html` (+ `Comisionista.html`, que
tenía la misma tarjeta optimista). Ancla `/* PED_OPTIMISTA_QQ */`. NO tocar base/RPC/RLS.
Preservar todas las correcciones previas (PED_OPTIMISTA, PED_DETALLE_LINEAS intactos).

## Problema
Al guardar un pedido, la tarjeta optimista (la que aparece al instante, antes de que
`recargarPedidos()` traiga el dato real) armaba cantidades y precio en la PRESENTACIÓN
cruda: 50 arrobas a $10 (equiv 0,25) se veían como "50 qq a $10" por un momento. Engaña.

## Cambio
La tarjeta optimista se expresa en QUINTALES, con la MISMA equivalencia por línea que ya
usan `guardarPedidoEnBase`/la edición (`it.prod.equiv`). Por línea:
- `qq_linea = it.cant × equiv`
- `precioQq_linea = it.precio ÷ equiv`
- `importe_linea = it.precio × it.cant` (= qq_linea × precioQq_linea; el dinero NO cambia)
Y para la tarjeta:
- `totalCant (qq) = Σ qq_linea`
- `importe = Σ it.precio × it.cant` (igual que hoy)
- `precioProm = importe / totalCant(qq)`  → $/qq
- `lineas: { qq: qq_linea, precio: precioQq_linea }`

La equivalencia ya es válida en el alta (PED_EQUIV_OBLIGATORIA), así que no hace falta
guard nuevo aquí.

### Archivos y puntos
- `freelance-completo.html` · handler `guardarPedido` (~L25800): se agregó `equivLinea` y
  `lineasQq`; `totalCant` ahora suma quintales; `lineas: lineasQq`. Una sola tarjeta por
  pedido, con todas sus líneas (no se rompe PED_OPTIMISTA ni PED_DETALLE_LINEAS). VERSION v466.
- `Comisionista.html` · tarjeta optimista por línea (~L13495): `cant`/`precio` de cada
  tarjeta salen en qq (`qqLinea`/`precioQqLinea`). VERSION v189.
- `sw.js` · caché `freelance-v277`.

## Qué NO se toca
Base/RPC/RLS. `socio-comercial.html` NO inserta tarjeta optimista (guarda y recarga de la
base): no se toca. El dinero (importe) se conserva en todas las tarjetas.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- `pruebas/test_optimista_qq.js`: extrae el bloque real de la tarjeta y lo evalúa. Caso
  50 arrobas a $10 (equiv 0,25) → 12,5 qq a $40/qq, importe $500; una tarjeta con sus
  líneas en qq; dos líneas conservan el dinero. Mutante que cae: volver a `it.cant`/
  `it.precio` crudos (freelance y comisionista).
- Guards de fuente en `test_cambios_422.js`.
- En el celular: guardar un pedido con una presentación no-Quintal y ver la tarjeta al
  instante ya en quintales (mismo número que tras recargar).

## Versiones
Freelance v466, Comisionista v189, caché `freelance-v277`.

## Trampas conocidas
- La tarjeta optimista de freelance es UNA por pedido con `lineas[]`; la de comisionista
  es UNA por línea (map). Ambas usan la misma equivalencia `it.prod.equiv`.
- El importe (dinero) NO se recalcula desde qq×precioQq para evitar arrastre de redondeo:
  se mantiene `Σ it.precio × it.cant`, que es idéntico al dinero mostrado hoy.
