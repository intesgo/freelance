# PED · Columna «Pedido N.º» + modal de solo lectura en la lista de Pedidos

`sistema-web.html`, componente `PedidosWeb`, vista lista. Ancla `/* PED_NUMERO_Y_MODAL */`. Es
front: no se toca la base ni las RPC. La base ya venía lista (Cowork): la tabla `pedidos` tiene
`numero_pedido` (formato «PED-2026-000001»), poblada en pedidos reales y en null en los demo; el
`ped_id` no cambió.

## Qué se cambió
1. **Datos** (select ~L5330 y mapeo de la fila): se agregan al select `numero_pedido, fecha_entrega,
   nota_chofer, retiro_bodega, asume_flete, asume_estibada, flete_cobro_qq, estibada_cobro_qq`; la
   fila expone `numero` y esos campos para el modal. Las líneas del pedido ya se cargaban
   (`pedido_items` → `p.lineas`); el modal las usa en memoria, sin consulta nueva. (El responsable
   por `sub_id` se omitió: no hay un join verificado a `usuarios` en esta consulta y agregar uno sin
   confirmar el nombre de la relación rompería el select; se puede sumar luego desde Cowork.)
2. **Columna** «Productos» → **«Pedido N.º»** (mismo `th` ordenable, ahora ordena por `numero`). La
   fila muestra `p.numero` (o el `ped_id` si es demo/null). Se **retiró** el resumen de productos y el
   acordeón inline (`▾/▸` + `.ped-detalle`); ese detalle vive ahora en el modal.
3. **Clic en la fila → modal de solo lectura** (`ModalPedido`): la fila (`.ped-cabecera`) es
   `role="button" tabIndex=0` con hover suave (`#F7FAFC`) y abre el modal de ESE pedido. El lápiz
   sigue con `stopPropagation` y va directo a editar (`abrirEdicionArmar`), sin abrir el modal.

## El modal (solo lectura, muestra solo lo que existe)
- Encabezado: «Pedido N.º …» (o `ped_id` en demo) + etiqueta de estado (reusa `colorEstado`) + X.
- General: fecha del pedido, cliente, condición, entrega deseada (si hay), nota al chofer (si hay).
- Detalle de productos (tabla con scroll horizontal en móvil): producto, cantidad (qq), precio/qq,
  subtotal por línea (qq×precio, los mismos números que ya trae `p.lineas`).
- Resumen económico: total en qq, subtotal (Σ de líneas, `p.importe`), flete y estibada **solo si
  aplican** (no retiro en bodega y cobro>0; total = qq × cobro/qq, la misma fórmula del armado),
  total final. No se inventan fórmulas nuevas.
- Acciones: «Cerrar», X y **Escape** cierran. «Editar pedido» solo si `p.editable && p.pedId && !p.demo`
  (misma condición que el lápiz): abre `abrirEdicionArmar` y cierra el modal.
- Accesibilidad: `role="dialog"`, `aria-modal`, `aria-label` con el número; foco atrapado dentro del
  diálogo y devuelto a la fila al cerrar.

## Qué NO se tocó
- La base ni las RPC. Filtros, ordenamiento, estados y paginación siguen igual. Permisos/RLS igual.
- La edición de pedido (vista Armar) intacta; el lápiz sigue siendo el único camino a editar.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (112).
- Arneses: `test_pedido_numero_modal.js` (NUEVO, comportamiento JSDOM + 3 mutantes): (a) cabecera
  «Pedido N.º» y no «Productos»; (b) la fila muestra el número real; (c) el clic abre el modal con ese
  pedido; (d) cierra con Escape/Cerrar/X; (e) el lápiz no abre el modal (lleva a editar).
  `test_pedidos_cliente.js` (ACTUALIZADO): el detalle se lee del modal, no del acordeón; mutante de
  «una fila por producto» reajustado al nuevo `filas.push`. Guards `PED_NUMERO_Y_MODAL` en
  `test_cambios_422.js`.
- En el celular: Pedidos → Pedidos. La columna dice «Pedido N.º»; toca una fila y se abre la ficha con
  el detalle; el lápiz sigue llevando a editar.

## Versiones
Sistema Web **b188**, caché **freelance-v287**.

## Trampas conocidas / pendientes
- «Responsable/vendedor» quedó fuera del modal por no tener un join verificado a `usuarios` (ver arriba).
- El modal usa los totales YA en memoria (`p.importe`, `p.totalQq`) y calcula flete/estibada con la
  misma fórmula del armado (qq × cobro/qq); no reimplementa precios ni quintales.
- Si más adelante se rediseña la lista a ERP, conservar «Pedido N.º», el clic→modal y el
  `textTransform:"uppercase"` de la columna Cliente (DISENO_CLIENTE_MAYUSCULAS).
