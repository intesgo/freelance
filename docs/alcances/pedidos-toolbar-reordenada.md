# Alcance · Sistema Web · Reordenar la barra de Pedidos

## 1. Qué se cambia y por qué (negocio)
En la pantalla de **Pedidos**, se reacomoda la barra superior para que el botón que más se
usa quede a la mano:
- **«+ Nuevo pedido»** (el más usado) → a la **izquierda**.
- **Pestañas de estado** (Todos, Pendientes, Por despachar, En ruta, Retiros, Entregados,
  Anulados) → a la **derecha**.
- **Texto informativo** («N pedidos · X por revisar», métrica de la pestaña y «Actualizado a
  las …») → a la **derecha**.
- **«↻ Actualizar»** → se queda a la **derecha**.

## 2. Qué se cambió (solo maquetación, sistema-web.html · PedidosWeb)
Ancla `DISENO_PED_TOOLBAR_DER`.
- Fila de pestañas: `justifyContent: movil ? "flex-start" : "flex-end"` (en móvil se quedan a
  la izquierda para poder desplazarlas en horizontal; en escritorio van a la derecha).
- Fila de acción: `+ Nuevo pedido` pasa a ser el primer hijo (izquierda); a la derecha, un
  grupo con el texto informativo (alineado a la derecha) y el botón `Actualizar`.

## 3. Qué NO se tocó
- Nada de comportamiento: los botones conservan su `onClick` (`abrir` / `refrescarPedidos`) y
  sus textos; el contador sigue diciendo «N pedidos · X por revisar». Solo cambió la posición.
- La lista de pedidos, los filtros, la búsqueda, ni el resto de la pantalla.
- Base de datos ni permisos.

## 4. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde
  (116 ✓). `test_pedidos_cliente` (texto del contador) y `test_web_sin_fallback` (abre «Nuevo
  pedido» por texto) siguen pasando: el cambio es solo de posición.
- VERSION Sistema Web **b222** + CACHE **v332**; arneses de versión al día.
- En pantalla: «Nuevo pedido» a la izquierda; pestañas, resumen y «Actualizar» a la derecha.

## 5. Trampas conocidas
- En móvil las pestañas deben poder desplazarse en horizontal: por eso el `flex-end` es solo
  en escritorio (`!movil`).
- Publicar VERSION + CACHE juntos o el robot no publica.
