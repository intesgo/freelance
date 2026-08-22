# P0-2 · Sistema Web: una tarjeta por pedido (acordeón)

Solo frontend (`sistema-web.html`). Ancla `/* PED_P0_2_AGRUPAR_WEB */`. NO tocar base/RPC/RLS.
Preservar todas las correcciones previas (PED_SIN_FALLBACK_DEMO, PED_CUPO_VIVO_PARIDAD,
PED_ESTADOS_PARIDAD, PED_EQUIV_OBLIGATORIA). Diseño acordeón aprobado por el dueño.

## Problema
`cargarPedidosVivos` agrupaba los ítems en `porPed` pero luego hacía `filas.push` por ÍTEM
→ la lista salía aplanada (una fila por producto). El contador, el orden, la paginación y el
botón editar trabajaban sobre productos, no sobre pedidos.

## Cambio
1. **`cargarPedidosVivos`**: ahora arma UNA fila por `ped_id` (como la app freelance
   `vivoPedidos`): `{ pedId, cli, prov, cond, estado, fecha, totalQq, nLineas, prodGuia,
   importe, lineas:[{prod, presCod, qq, precio, cond, tipo}] }`. `itemsPorPed` se mantiene.
2. **Render acordeón**: cada pedido es una CABECERA (`className="ped-cabecera"`) con cliente ·
   productos (guía) · total en quintales · total en dinero · condición · estado · un solo
   botón editar. Al tocarla se despliega/pliega su detalle (`className="ped-detalle"`) con sus
   líneas (nombre a la izquierda; qq y precio a la derecha). Estado `pedAbierto` (useState).
   Ningún producto hace de encabezado; un pedido de un solo producto también es una cabecera.
3. **Contadores/navegación sobre pedidos**: `pedidos.length` y «por revisar» cuentan pedidos;
   `pedidosOrdenados`/paginación/«ver más» sobre pedidos; el orden por «total» usa `p.importe`
   y por «cant» usa `p.totalQq`. Búsqueda/trazabilidad siguen encontrando por cliente/código.
4. **Editar**: un solo lápiz por pedido → `abrirEdicionArmar(p.pedId)` (con `stopPropagation`
   para no desplegar al editar). Al abrir carga TODAS las líneas (ya usa `itemsPorPed`).
5. **Optimista tras crear** (`subirPedido`): UNA fila por pedido (no una por producto con «·i»),
   con la misma forma que `cargarPedidosVivos` (cabecera + líneas en qq). Tras éxito se llama
   `cargarPedidosVivos`, así que la tarjeta de puente no se ve repetida. Se preserva el
   nacimiento de solicitudes por línea de precio especial.

## Qué NO se toca
Base/RPC/RLS. La lógica de edición, cupo, estados y equivalencia obligatoria. La demo.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- `pruebas/test_pedidos_cliente.js` (actualizado): un pedido de 3 productos → 1 cabecera; el
  contador dice «2 pedidos · 1 por revisar»; 1 solo botón editar; al desplegar, el detalle
  muestra sus 3 líneas; el cliente sale del pedido (no de la posición). Mutantes que caen:
  volver a una fila por producto; +1 al total de quintales; borrar la razón social; reponer el
  nombrado por posición.
- Guards de fuente en `test_cambios_422.js` (ancla, ped-cabecera/ped-detalle, pedAbierto,
  agrupación, y que ya no hay `filas.push` por ítem).
- En el celular/web: un pedido de varios productos se ve como una sola tarjeta; al tocarla se
  abre su detalle con todos sus productos.

## Versiones
Sistema Web b182, caché `freelance-v278`.

## Trampas conocidas
- Varias piezas leían `p.prod`/`p.cant`/`p.precio` de las filas aplanadas (valorOrden,
  trazabilidad): la fila por pedido conserva `prod: prodGuia`, `cant: totalQq`, `unidad:"qq"`,
  `precio: importe/totalQq` para no romperlas, además de `totalQq`/`importe`/`prodGuia`/`lineas`.
- El botón editar lleva `stopPropagation` para no desplegar el acordeón al pulsarlo.
- El pedido demo no ofrece editar (`!p.demo`), como antes.
