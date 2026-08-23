# Logística · casilleros por producto al armar la ruta (despacho parcial)

`sistema-web.html`, componente `TrazabilidadWeb`, pantalla «Escoger pedidos»
(`seleccionPedidos`). Ancla `/* DISENO_LOGISTICA_DESPACHO_PARCIAL */`.
La base ya estaba lista (verificada por Cowork): `ruta_pedidos.items_excluidos jsonb`,
`crear_ruta` acepta `items_excluidos` por pedido, y `facturar_pedido` ya rechaza en el
servidor lo excluido. **Code no tocó la base.**

## Qué se hizo (CAMBIO A + B)
1. **Traer las líneas**: el select de «Escoger pedidos» ahora trae
   `pedido_items(item_id,descripcion,cantidad_qq,despachado_qq,condicion)` y el mapeo
   expone `id` (item_id) y `cond` por línea.
2. **Fila desplegable**: cada pedido tiene una flechita `›` que despliega el detalle con
   **un casillero por producto, todos marcados por defecto** (todo va).
3. **Estado**: `excluidos = { [ped_id]: { [item_id]: true } }` (las líneas desmarcadas).
   Marcar = quitar del set; desmarcar = agregar. `logAbierto` controla el despliegue.
4. **Aviso al DESMARCAR** (no al marcar): modal con el texto exacto
   «¿Seguro que no quiere enviar este producto a despacho?» y botones
   «Sí, dejar fuera» / «No». «No» deja el casillero marcado.
5. **No dejar el pedido vacío**: si se intenta desmarcar la última línea incluida, se
   bloquea con «Debe quedar al menos un producto para enviar este pedido a la ruta.».
6. **qq en vivo**: la fila y el pie del detalle muestran `qqPlan(p)` = suma de las líneas
   marcadas (coincide con `qq_planificado` de la base). Si hay excluidas, la fila indica
   «· N fuera».
7. **Payload** (`crear_ruta`): por cada pedido se agrega
   `items_excluidos: Object.keys(excluidos[id]||{}).filter(...)`. Sin exclusión va `[]`
   (misma conducta de siempre). No cambió nada más del payload. Al crear la ruta se
   limpian `sel`, `logAbierto` y `excluidos`.

## Regla de negocio
El producto excluido NO se despacha en esta ruta; el pedido queda **parcial**. Si el
cliente aún lo quiere, se sube como **pedido nuevo** (no hay saldo residual arrastrándose).
No se tocó permisos ni comisión (viven en el servidor).

## Pendiente · CAMBIO C (proveedor) — envío aparte
En `proveedor-freelance.html` (componente FACTURAR) faltaría ocultar/bloquear las líneas
que la ruta activa dejó en `items_excluidos` (leer `ruta_pedidos.items_excluidos`). **Se
dejó para un PR separado** porque toca el flujo de facturar (compuerta de dinero) y suma
una consulta nueva; además el servidor **ya rechaza** facturar lo excluido, así que es solo
claridad visual. No es un bloqueo funcional.

## Qué NO se tocó
La base ni las RPC (solo se lee 1 columna más del select), permisos, comisión, el armado
de rutas/zonas, ni la pestaña «Orden de entrega».

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Guards `DISENO_LOGISTICA_DESPACHO_PARCIAL` en `test_cambios_422.js` (select con item_id,
  estado excluidos/logAbierto, toggleItem/confirmarExcluir, payload items_excluidos, texto
  exacto del aviso, botones, bloqueo de última línea, qqPlan).
- En el navegador: Logística → Escoger pedidos → desplegar un pedido con `›`, desmarcar un
  producto (sale el aviso), «Sí, dejar fuera», crear la ruta. El producto excluido no se
  despacha; el proveedor no puede facturarlo (lo rechaza el servidor).

## Versiones
Sistema Web **b192**, caché **freelance-v294**.

## Trampas conocidas
- El nombre `pedAbierto` choca con un guard viejo de PedidosWeb (acordeón retirado): por eso
  el estado del despliegue en Logística se llama **`logAbierto`**.
- Las líneas sin `item_id` (no debería pasar en vivo: el select filtra `es_demo=false`) se
  muestran con el casillero deshabilitado (siempre marcadas) para no excluir sin llave.
- Los agregados de ciudad/selección (`qqC`, `qqSel`, «llena un camión») siguen sobre el qq
  total (`logQQ`); solo la fila y el detalle muestran el qq planificado (`qqPlan`).
