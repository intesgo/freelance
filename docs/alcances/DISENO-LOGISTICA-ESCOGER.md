# DISEÑO · Logística «Escoger pedidos»: número + nombre de persona + ciudad resaltada

`sistema-web.html`, componente `TrazabilidadWeb`, pantalla «Escoger pedidos» (`seleccionPedidos`).
Ancla `/* DISENO_LOGISTICA_ESCOGER */`. Es UI + traer 3 campos más en el select; no se toca la
lógica de negocio, el armado de rutas, las zonas ni los permisos. La base ya tiene `numero_pedido`
(poblada en pedidos reales; null en demo).

## Qué se cambió
1. **Select (3 campos más):** se agrega `numero_pedido` tras `ped_id`, y `razon_social,tipo` dentro
   del join de `clientes`. En el mapeo, cada pedido expone `numero`, `razon` y `tipoCli` (y se
   conserva `cli` como respaldo). El join a `usuarios(nombre)` ya existía (el «responsable», `sc`).
2. **Nombre de persona reutilizado:** `nombreClientePedido` se movió de dentro de `PedidosWeb` a
   **nivel de módulo** (junto a `margenDeProducto`), sin cambiar su lógica. Lo usan igual `PedidosWeb`
   y `TrazabilidadWeb`. En el item de cliente se muestra `nombreClientePedido(p)` en **MAYÚSCULAS**
   (igual que en Pedidos): para PD-0011 muestra «PEDRO CASTILLO», no «Supermercado Castillo».
3. **Número de pedido uniforme:** el item muestra `p.numero || p.id` (respaldo al ped_id) resaltado
   en una píldora verde suave: «PED-2026-000001» en vez del código interno.
4. **Encabezado de ciudad resaltado:** fondo verde suave (`COLOR.tealLight`), un pin vectorial
   (`<Ico mapPin>`) en un cuadrito, el nombre de la ciudad en verde bosque (`tealDark`) y el
   subtítulo «provincia · N pedido(s)» en `tealDark` apagado. El checkbox de ciudad y su lógica de
   selección NO cambian; solo el envoltorio visual del encabezado.

## Qué NO se toca
- La lógica de selección de pedidos, armado de ruta, orden (Mayor qq / Norte→Sur), zonas, permisos.
- Los cálculos de qq, «llena un camión», etc.
- `nombreClientePedido` no cambia de comportamiento; solo de lugar (ahora módulo).

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (112).
- Guards `DISENO_LOGISTICA_ESCOGER` en `test_cambios_422.js`: `nombreClientePedido` definida una sola
  vez a nivel de módulo; el select trae `numero_pedido` + `razon_social,tipo`; el mapeo expone
  numero/razon/tipoCli; el item usa `nombreClientePedido(p)` en mayúsculas y `p.numero || p.id`; el
  encabezado de ciudad lleva el pin `mapPin`. `test_logistica_log001.js` (48✓) y `ARNES_SECCIONES_WEB`
  (24✓, renderiza TrazabilidadWeb) siguen en verde tras mover la helper.
- En el celular: Logística → «Escoger pedidos». El nombre del cliente sale como en Pedidos (en
  mayúsculas), el «Pedido N.º» resaltado, y cada ciudad con su recuadro verde y pin.

## Versiones
Sistema Web **b189**, caché **freelance-v289**.

## Trampas conocidas
- `nombreClientePedido` lee `p.razon` / `p.tipoCli` / `p.cli`: por eso el mapeo de logística ahora
  expone `razon` y `tipoCli` (antes no los traía). Sin esos campos, el nombre caería siempre al
  `cli` crudo.
- El número resaltado usa `p.numero || p.id`: en demo (numero null) muestra el `ped_id`, para poder
  identificar el pedido.
