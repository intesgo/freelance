# Alcance · NOMBRE_CLIENTE_INTEGRIDAD_3 — Proveedor, Socio y Comisionista (solo pantalla)

> Tercera vuelta de la integridad del nombre del cliente. Ahora en las apps
> **Proveedor**, **Socio comercial** y **Comisionista**. Es **solo presentación**.

## Regla (la misma de siempre)

- **Persona natural** → primer nombre + primer apellido en MAYÚSCULAS (ej. «DORA DIAZ»),
  tomados de la **razón social**, no del nombre comercial.
- **Persona jurídica** → razón social/empresa en MAYÚSCULAS.
- Se usa **una sola función** (`nombreClientePedido`), la misma del Sistema Web y la app Freelance.

## Decisiones del PO

- **Transportista NO se toca** (el chofer ve el nombre comercial; es una excepción).
- **Directorios y fichas de cliente SÍ** aplican la regla.
- **Comprobantes / PDF / canvas / XML del SRI: NO** se tocan (nombre legal/comercial).

## Qué se cambió por app

### Proveedor (`proveedor-freelance.html`, v71)
- **No tenía** función de nombre → se **portó** la canónica (`nombreClientePedido`, con RUC y MAYÚSCULAS).
- El select de clientes de `vivoDecidir` pasó de `cli_id,nombre` a `cli_id,nombre,razon_social,tipo`;
  el índice `nCli` ahora guarda `{nombre, razon, tipoCli}`. El pedido a facturar lleva `razon`/`tipoCli`
  y el `cliente` queda **crudo**.
- Pantallas de la firma: pedidos por facturar, modales de cambio/ajuste/NC y anular factura.
- **XML del SRI (factura/retención/guía):** intactos (exentos).
- **Aviso:** «Pagos por confirmar» corre hoy sobre **datos demo** (`PAGOS_CONF_INI`, no se
  reemplaza con datos vivos). El formato ya quedó puesto, pero para que la regla tenga efecto
  real hay que **conectar esa pantalla a la base** — trabajo de Cowork.

### Socio comercial (`socio-comercial.html`, v59)
- La función `nombreClientePedido` ya existía pero **no** ponía MAYÚSCULAS ni miraba el RUC:
  se **reemplazó por la canónica** (una sola verdad).
- Se aplica ahora en: **Detalle del pedido**, **Cotización** (cliente escogido y resultados),
  **Novedades**, **Agenda**, **Directorio** y **ficha** de cliente.
- Selects ampliados a `razon_social,tipo`: Novedades y Agenda; la Cotización agregó `tipo`.
- El buscador de «Tomar pedido» (`refCortoCliente`) se dejó como estaba (ya derivaba del referencial).

### Comisionista (`Comisionista.html`, v192)
- `nombreClientePedido` se **reemplazó por la canónica**, y **`refCortoCliente` se UNIFICÓ**:
  ahora **delega** en `nombreClientePedido` (una sola regla, sin criterios duplicados).
- Se aplica en: **Detalle del pedido**, **Devolución**, **Anulación**, **Agenda**, **Novedades**,
  **Directorio**, **clientes bloqueados** y **ficha** de cliente.
- Selects ampliados a `razon_social,tipo`: Novedades y Agenda.

## Qué NO se tocó

- **App Transportista** (excepción del PO).
- **Comprobantes/PDF/canvas/ESC-POS/XML SRI** en todas las apps.
- **Formularios de edición** de cliente, permisos, reglas de negocio, **la base de datos**.
- El campo **crudo** (`cli`/`cliente`/`c`/`nombre`) donde se usa para **buscar, filtrar,
  hacer reverse-lookup o persistir** (Agenda `guardarActividad`, Novedades filtro, claves
  `FICHA_CLIENTE`/`REFERENCIALES`/`CLI_ID_DE`, Cotización filtro/WhatsApp/PDF). Solo se
  **agrega** `razon`/`tipoCli` y se muestra con la función.

## Pantallas demo (fuera del efecto real, avisado)

Corren sobre datos demo estáticos (no vivos), así que la regla solo se ve en su versión
de demostración; no se cambió su fuente:
- Socio: panel de «Respuestas del proveedor» del resumen (`NOVEDADES_INI`).
- Comisionista: **Cartera** (`item.cli`), **Cobros** (`COBROS_INI`), **Solicitudes de
  crédito** (`SOLICITUDES_CREDITO`), y las tarjetas de vista previa con `PEDIDOS_INI`.
- Movimientos/traspasos entre vendedores (cheques): el cliente va crudo (registro y búsqueda).

## Cómo verificar

1. `node scripts/compilar.js` (las tres apps compilan).
2. `node pruebas/pruebas.js rapido` en verde. Guardas en `test_cambios_422.js`
   (bloque `NOMBRE_CLIENTE_INTEGRIDAD_3`).
3. En el celular tras publicar: mirar que el nombre salga parejo (persona → «NOMBRE APELLIDO»;
   empresa → razón social) en las pantallas listadas de cada app.

## Trampas conocidas

- **La función devuelve MAYÚSCULAS** (antes el efecto era solo CSS). Cambia el `textContent`
  del DOM → los arneses que localizan por nombre deben buscar en MAYÚSCULAS.
- **Directorio/ficha/bloqueados** clasifican con la **razón social del referencial**
  (`REFERENCIALES`), sin `tipo` ni RUC: cuando hay referencial funciona bien; sin él, el
  nombre comercial se trata como persona natural (limitación conocida de esas pantallas).
- Nunca canonizar el campo crudo al mapear: rompe búsqueda, filtro, reverse-lookup y persistencia.
