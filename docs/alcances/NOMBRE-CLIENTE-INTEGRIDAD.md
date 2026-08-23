# Nombre del cliente · integridad (una sola verdad) · sistema-web + freelance-completo

Ancla `/* NOMBRE_CLIENTE_INTEGRIDAD */`. Solo cambia lo que se **muestra**. No toca la base,
permisos, ni la lógica de negocio; no toca comprobantes/PDF/canvas ni formularios de edición.

## Regla (fuente única `nombreClientePedido`)
- **jurídica** si: 3.er dígito del RUC = `9` o `6`, o el tipo dice empresa/jurídica, o la razón
  social trae marca de empresa (S.A., S.A.S., Cía, Ltda, Compañía, Corp) → **razón social**.
- **natural** → primer nombre + primer apellido, sacados de la **RAZÓN SOCIAL** (con 4+ palabras el
  apellido es la 3.ª: 2 nombres + 2 apellidos). Ej.: «Dora Libia Diaz Mora» → **DORA DIAZ**.
- **SIEMPRE en MAYÚSCULAS**.
- Acepta el pedido `{cli, razon, tipoCli, ruc}` y la ficha `{nombre, razon_social/razonSocial, tipo, ruc}`.
- `nombreCortoCliente` (web) delega en la función única; `refCortoCliente` (freelance, camino
  referencial/demo con solo string) se dejó como estaba (ya cumplía con CSS).

## Qué se aplicó en este cambio (b194 / v472)
**Sistema Web:**
- Función única (con RUC + MAYÚSCULAS) — la usan Pedidos (tabla/modal), «Escoger pedidos», los
  buscadores y la lista/ficha de clientes (heredan la regla automáticamente).
- Logística: orden de entrega, sub-línea del pedido, modal armar novedad y detalle de ruta
  (`{p.cli}`/`{dp.cli}` → `nombreClientePedido`).
- Comisiones (ciclo): se amplió el select a `clientes(nombre,razon_social,tipo,ruc)` y el nombre
  se calcula canónico.
- Buscador de pedidos y buscador global: se agregó `tipo`/`ruc` al select.

**Freelance:**
- Función única (misma regla).
- Pedidos: detalle y modales (Anular, Revivir, ¿cómo pagas?, tarjeta de Anulados).
- Cotización en pantalla: cliente escogido, lista del buscador y encabezado «Para».

## Pendiente (envío aparte) · módulos que hoy solo cargan el string comercial
Para «integridad total» faltan estos, que requieren **ampliar el `select` del loader** (traer
`razon_social,tipo,ruc`) — o un cambio de RPC (que es de Cowork). Se listan con línea de referencia:

**Sistema Web:**
- Logística guías/novedades: `g.cliente`/`n.cliente` (selects de `viaje_guias`/`novedades`).
- Cobranza/cartera: filas de cartera, cobros y modal de cobro (`cartera_cliente … clientes(nombre)`).
- Solicitudes: subtítulo (`clientes.nombre`).
- Reportes «Salud del cliente» y «Últimos pedidos» del Dashboard.

**Freelance:**
- Notas de crédito (C), Solicitudes (E), Novedades (F), Agenda (G), Arranque de operación (I):
  sus loaders traen `cli_id,nombre` → ampliar a `razon_social,tipo`.
- Cartera/Cobranza (H): el select ya trae `razon_social` pero no se mapea a la fila (falta `tipo`).
- Comisión por piladora (D): el nombre viene de un **RPC** (`comision_piladora_detalle`) →
  necesita cambio de base/RPC: **es tarea de Cowork**, no de Code.
- Rutas/planificador: origen de `porProv` sin confirmar (revisar antes de tocar).

> Regla de oro (punto 4): NO inventar el nombre de persona sin la razón social. Por eso estos
> módulos quedan pendientes hasta ampliar su consulta, en vez de mostrar el comercial acortado.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- `test_nombre_cliente.js` (nuevo, registrado): «Dora Libia Diaz Mora» → «DORA DIAZ», empresa en
  MAYÚSCULAS, RUC 3.er dígito 9/6 → jurídica; se evalúa la función real de **ambos** HTML.
- En pantalla: Logística, Comisiones, buscadores y los modales/detalle de Pedidos y la Cotización
  muestran el nombre canónico en mayúsculas.

## Versiones
Sistema Web **b194**, Freelance **v472**, caché **freelance-v297**.

## Trampas conocidas
- `nombreCortoCliente` ahora devuelve MAYÚSCULAS: algún subtítulo que comparaba `cli.nombre` con el
  corto puede aparecer más seguido (cosmético, correcto).
- Los `option`/labels que ya llevaban `textTransform:uppercase` no cambian (la función ya sube todo).
