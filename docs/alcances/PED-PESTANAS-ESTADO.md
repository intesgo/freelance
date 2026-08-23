# Pedidos (web) · 5 pestañas por estado + Logística sin «retira en bodega»

`sistema-web.html`. Anclas `/* PED_PESTANAS_ESTADO */` y `/* PED_ESCOGER_SIN_RETIRO_BODEGA */`.
Solo cambia lo que se **muestra**: no toca columnas, el modal de pedido, el orden, la
paginación, «+ Nuevo pedido», Trazabilidad, el servidor ni los permisos.

## CAMBIO 1 · PedidosWeb · pestañas por estado
El control de 2 píldoras («📦 Pedidos» / «🔍 Trazabilidad») pasa a **5 pestañas**:

**Pendientes | En camino | Entregados | Anulados | 🔍 Trazabilidad**

- Las 4 primeras filtran la MISMA lista por `p.estado`; Trazabilidad queda igual.
- Cada pestaña muestra su número entre paréntesis (como el freelance).
- Reparto (`tabDePed`, con `startsWith` donde el estado varía):
  - **Pendientes** → «Ingresado», «Esperando…», «Por autorizar…», «Enviado al proveedor».
  - **En camino** → «Facturado», «Despachado».
  - **Entregados** → «Entregado», «Cliente pagó», «Cerrado».
  - **Anulados** → «Anulado» (pestaña propia; NO se mezcla con Entregados).
- Pestaña por defecto: **Pendientes**. Al cambiar de pestaña se vuelve a la página 1.
- El rótulo «N pedidos · N por revisar» respeta la pestaña activa (`pedidosTab`/`porRevisarTab`).
- La lista, la paginación y «Ver más» usan `pedidosTab` (la lista ya ordenada, filtrada por
  la pestaña). No se tocó el orden ni el modal.

## CAMBIO 2 · Logística «Escoger pedidos» · sin «retira en bodega»
Los pedidos que el cliente **retira en bodega** no van a la ruta (el servidor
`_log_pedido_elegible` ya los rechaza). En la vista se filtran con `!p.retiroBodega`
sobre los datos ya traídos; como `retiroBodega = !!retiro_bodega`, un **NULL cuenta como
elegible** (igual que el coalesce del servidor). **No** se usa `.neq(retiro_bodega,true)`
en el select (botaría los NULL). Nota: este filtro ya vivía en `disponibles`; el cambio
solo lo deja explícito con su ancla y su guard.

## Qué NO se toca
Columnas, modal de pedido, orden, paginación, «+ Nuevo pedido», Trazabilidad, la base, ni permisos.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Guards `PED_PESTANAS_ESTADO`/`PED_ESCOGER_SIN_RETIRO_BODEGA` en `test_cambios_422.js`
  (5 pestañas en orden, Anulados propio, default Pendientes, conteo por pestaña, rótulo por
  pestaña, filtro `!p.retiroBodega`, sin `.neq`). `test_estados_paridad_web` ajustado: el
  pedido «facturado» se busca en la pestaña «En camino».
- En pantalla: Pedidos abre en «Pendientes»; cada pestaña muestra su número y su lista.

## Versiones
Sistema Web **b195**, caché **freelance-v298**.

## Trampas conocidas
- Al repartir por pestaña, un pedido de otro estado no aparece en la pestaña por defecto:
  las pruebas que renderizan PedidosWeb y buscan un pedido de otro estado deben **cambiar de
  pestaña** primero (así se corrigió `test_estados_paridad_web`).
- `tabDePed` cae a «Entregados» por defecto para estados no listados; «Anulado» se atrapa
  primero para que tenga su pestaña propia.
