# Alcance · PED_FE_003 (Tanda 3) — Pedidos (Sistema Web): buscar, filtrar, responsive y modal

> `sistema-web.html` · `PedidosWeb` + `ModalPedido`. **Solo front, solo lectura.**
> No toca base, permisos ni RPC. **Se construye por ETAPAS** (decisión del PO):
> **Etapa 1 = la LISTA** (este documento). **Etapa 2 = modal Entrega/Historial (B/C)** con lecturas
> nuevas por `ped_id`, en envío aparte.

## Etapa 1 — qué se cambió

1. **Búsqueda global de servidor** (caja propia de la lista; salta a «Todos» al escribir).
   - Campos de `pedidos` por `.or(...ilike...)`: `numero_pedido`, `factura`, `prov_cod`.
   - Cliente/RUC/vendedor: se **resuelven primero los ids** (`clientes` por nombre/razón/RUC,
     `usuarios` por nombre) y se filtra con `cli_id.in.(…)` / `sub_id.in.(…)` dentro del mismo `.or`.
     Helpers de módulo: `resolverBusquedaPed` (ids) + `aplicarFiltrosPed` (arma la consulta).
   - Con debounce (300 ms); respeta carga/error/vacío de FE-002 y muestra «Sin resultados por la
     búsqueda «…»».

2. **Barra de filtros plegable** (cerrada por defecto): Desde/Hasta (por `creado`), Proveedor, Vendedor,
   Condición, Estado, Ciudad, y «Limpiar filtros». Todos de **servidor** (los mismos filtros valen para
   la lista y para el conteo, para que las pestañas cuadren). El chip «Filtros ●» avisa si hay alguno.

3. **Responsive** (`useEsMovil(760)`): en escritorio la tabla; en móvil una **tarjeta por pedido** (no se
   comprimen las 8 columnas) con cliente, N.º, estado, qq, total y acciones táctiles; las **pestañas se
   desplazan** en horizontal.

4. **Tabla (escritorio):** bajo Cliente va **proveedor · ciudad**; bajo «Pedido N.º» va la **factura**;
   bajo Estado va la **antigüedad** («creado hace N días»). La columna «Editar» pasa a **«Acciones»**:
   **👁 Ver** siempre (abre el modal) + **✏️** solo si el pedido es editable.

5. **Métrica contextual por pestaña**, SOLO con datos reales de lo cargado; si no hay, se omite:
   Pendientes = «N requieren aprobación»; Por despachar / Entregados = «N con saldo/parcial». Las
   métricas que exigen ruta/fechas («sin ruta», «con retraso») quedan para la Etapa 2 (cuando el modal
   Entrega/Historial traiga esas lecturas).

6. **Modal (Resumen A):** suma **Proveedor, Vendedor, Factura y Entrega (retiro/ciudad)** al detalle que
   ya existía (productos + resumen económico). El clic de fila/tarjeta y el teclado abren el modal por un
   único manejador `abrirModalPed`.

## Qué NO se tocó
La clasificación por código (FE-001), carga/conteos/paginación (FE-002), «sin fallback demo», la edición
autorizada (RPC `editar_pedido_atomico`), los comprimentes/PDF, permisos, negocio, base ni RPC.

## Qué queda para la Etapa 2 (modal Entrega + Historial · B/C)
Lecturas nuevas por `ped_id` de tablas reales (`ruta_pedidos`→`viajes`/`viaje_guias`, `ruta_historial`,
auditoría por `registro_id=ped_id`). Donde una fuente real no exista o no alcance: **«Sin registro»**, no
se inventa (regla §9). Antes de construirla, verificar contra el código real de Logística qué columnas
existen.

## Cómo verificar
1. `node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde.
2. Arnés nuevo `test_pedidos_busca_web` (PED_FE_003): la búsqueda encuentra un pedido que está en otra
   pestaña (salta a «Todos») y por nombre de cliente (id-resolution + `.in`); la vista móvil dibuja
   tarjetas y NO el encabezado de tabla; el modal conserva productos + edición y suma proveedor/vendedor.
   Arneses ajustados: `test_pedido_numero_modal` (manejador único `abrirModalPed`), `test_pedidos_cliente`
   (mutante del `filas.push` con los campos nuevos), y versión/caché (b203 / v307).
3. En vivo: buscar «N-…» / factura / cliente / RUC / vendedor; abrir/cerrar filtros; en el celular ver
   tarjetas y pestañas deslizables.

## Trampas conocidas
- Buscar cliente/RUC/vendedor = **resolver ids primero** y `.in` en `pedidos` (de servidor, no en memoria).
- Conteo y lista con los **mismos** filtros/búsqueda (para que los números cuadren).
- Opciones del filtro **Vendedor** salen de todos los usuarios (`usuarios`); las de **Proveedor**, de los
  proveedores presentes en lo ya cargado (limitación conocida; una lista maestra completa sería un envío
  posterior). Ciudad es texto libre (`ilike`).
- La «antigüedad» de la fila se mide desde `creado` (no es la antigüedad del *estado*: eso exige el
  historial · Etapa 2). No se inventa una fecha de cambio de estado.
