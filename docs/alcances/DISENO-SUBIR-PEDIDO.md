# DISEÑO · Vista «armar» del pedido (Subir pedido) a la línea ERP

Solo estilo (`sistema-web.html`), sobre la base `/* DISENO_BASE_ERP */`. Ancla
`/* DISENO_SUBIR_PEDIDO */`. NO se tocó lógica, datos, permisos, cálculos ni el flujo/pasos.
Componente: `PedidosWeb`, vista `vista === "armar"` (el `return` de armado). La vista "lista"
y la pestaña "Trazabilidad" NO se tocaron (van en otro paso del plan).

## Qué se hizo (solo apariencia)
Se migró toda la vista del sistema de iconos VIEJO (`<Icono>`/`ICON_PATHS`) y los emojis
literales al sistema NUEVO Lucide (`<Ico>`/`ICONS`), igual que la base ERP, Clientes y el
Resumen del día. Misma estructura: 2 columnas (armado izquierda, resumen fijo derecha) y el
modal de 3 pestañas.

- **Cabecera cliente + proveedor.** Avatar del cliente con `<Ico user>`; **píldora verde
  «Cupo disponible»** bajo el cliente (dato ya existente, solo presentación); «Repetir último»
  con `<Ico repeat>`; «Cancelar» con `<Ico x>`. **Se quitó el botón «Inicio»** de esta cabecera
  (ya está el menú lateral). Emoji 🔒 de cliente bloqueado → `<Ico lock>`.
- **Columna armado.** Botones «Favoritos»/«Suele comprar» con `<Ico star>`; los 3 botones de
  detalle (Entrega/Precio/Historial) como tarjetitas con icono Lucide en cuadrito, etiqueta +
  valor actual, y **en verde (tealLight/tealDark) cuando ya están definidos**; «Agregar al
  pedido» con `<Ico plus>`; los avisos ⚠ (bajoBase/excedeCupo/bajoPiso) como banda roja con
  `<Ico alertTriangle>` (misma condición, mismo texto).
- **Columna resumen sticky.** Título «Resumen del pedido» con `<Ico cart>`; borrar línea con
  `<Ico trash>`; «Subir pedido»/«Guardar cambios» con `<Ico send>`/`<Ico check>`; tarjeta de
  Cupo de crédito con `<Ico creditCard>` (la barra de progreso se conserva).
- **Modal 3 pestañas.** Cerrar con `<Ico x>`; pestañas con `<Ico truck/tag/clock>`. Entrega:
  las opciones 🚚/🏭 pasan a **chips grandes** con `<Ico truck/warehouse>` (helper `chipEntrega`);
  dirección con `<Ico mapPin>`. Precio: los avisos `●` (autorización/piso) con `<Ico
  alertTriangle>`. Historial: 🕘 → `<Ico clock>`; tendencia ▲/▼ → `<Ico chevronUp/chevronDown>`
  conservando el mismo mapeo de color que ya traía el código.

Iconos nuevos agregados a `ICONS` (Lucide inline, sin CDN): user, warehouse, repeat, star, tag,
plus, trash, send, lock, chevronUp, chevronDown, alertTriangle.

## Qué NO se toca
- La vista "lista" y la pestaña "Trazabilidad" del mismo componente (otro paso).
- Toda la lógica sellada: carga de datos vivos, precio base P1–P6, quintales/equivalencia,
  cupo, piso P5, validación de línea, `agregarLinea`, `guardarPedidoOficina`/RPC
  `registrar_pedido_atomico`, equivalencia obligatoria, `subirPedido`, edición de pedido,
  totales del resumen, `TIPOS_PRECIO_WEB`, `equivDePresentacionWeb`.
- El componente compartido `BuscadorPredictivo` (cliente/proveedor/producto) NO se tocó: la
  «lupa» sugerida en la maqueta se dejó para no alterar un componente usado en otras pantallas.
- Los emojis de dato del producto (`prod.ic`, `cat.ic`) y los mensajes `setAviso("⚠…"/"✓…")`
  viven en lógica sellada: se dejan como están.
- Permisos y roles.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (111).
- Guards en `test_cambios_422.js` (ancla `DISENO_SUBIR_PEDIDO`): `PedidosWeb` ya no usa `<Icono>`;
  no queda el `nav-inicio` de la cabecera del pedido; `chipEntrega` con truck/warehouse; los
  iconos plus/send/trash/creditCard/lock/star presentes; el set `ICONS` incluye los nuevos.
  El guard viejo «Cancelar e Inicio en la cabecera» se cambió por «conserva Cancelar (Inicio se
  quitó)».
- En el celular: Pedidos → armar un pedido. Cliente y proveedor con su cara nueva, píldora de
  cupo, tarjetas de detalle en verde cuando ya tienen valor, modal con iconos. Los precios,
  cupos y el guardado deben comportarse igual que antes.

## Versiones
Sistema Web **b186**, caché **freelance-v283**.

## Trampas conocidas
- El guard `name="home"` del arnés seguía pasando por otro botón «Inicio» ajeno al pedido
  (L~19529, otra pantalla): se reemplazó por `onClick={volver}` para que apunte al botón real
  de la cabecera del pedido y no mienta.
- La tendencia del historial usa `color: tend>0?teal:red` **ya existente**: no se invirtió el
  color, solo se cambió el glifo ▲/▼ por `<Ico chevronUp/chevronDown>` (misma expresión de color).
