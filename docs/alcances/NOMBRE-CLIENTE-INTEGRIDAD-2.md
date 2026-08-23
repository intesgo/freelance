# Alcance · NOMBRE_CLIENTE_INTEGRIDAD_2 — cerrar las pantallas que faltaban

> Continuación de `NOMBRE-CLIENTE-INTEGRIDAD.md`. Aquí se cierran las pantallas
> que quedaron pendientes para que **todas** muestren el nombre del cliente con la
> **misma función** ya existente (`nombreClientePedido`), sin duplicar criterio.

## 1. Qué se cambia y por qué

En más pantallas el nombre del cliente salía crudo (el comercial, en minúsculas o
mezclado). Ahora sale parejo con la regla única:

- **Persona natural** → primer nombre + primer apellido en MAYÚSCULAS (ej. «DORA DIAZ»),
  tomados de la **razón social**, no del nombre comercial.
- **Empresa (jurídica)** → su razón social en MAYÚSCULAS.

Es **solo presentación**: no cambia columnas, ni el orden, ni el servidor, ni la base.

## 2. Archivos y puntos exactos

### Sistema Web (`sistema-web.html`, b196)
- **Cobranza / cartera** — `CobranzaWeb`: el select trae `clientes(nombre,razon_social,tipo)`;
  el mapeo agrega `razon`/`tipoCli` (el campo `cliente` queda **crudo**, se filtra por él);
  se muestra con `nombreClientePedido({cli, razon, tipoCli})` en las 3 vistas (grupo, fila, modal).
- **Solicitudes** — `SolicitudesWeb`: mismo patrón; el chequeo `!== "—"` se mantiene sobre el crudo.
- **Logística — Guías**:
  - viajes en curso (guías del viaje) — select + mapeo + display del cliente por guía.
  - aviso de guías sin cerrar (`guiasAviso`) — select + mapeo + display.
  - novedades vivas (`mapNovViva`) — select + mapeo; lista y modal de detalle (`nvVer`).
  - registro local de novedad (demo, `nvGuardar`) — el registro también lleva `razon`/`tipoCli`.
  - opción del select «Guía afectada» al registrar novedad (demo, `EF_VIAJES_INI`).

### App Freelance (`freelance-completo.html`, v473)
- **Comisiones** (`vivoComisionDetalle`): la vista de base **`v_comisiones_app` ya trae**
  `razon_social`, `tipo` y `ruc` (la amplió Cowork). Se toman de ahí y se formatean con la
  misma función. **Code no tocó la base.**
- **Notas de crédito**, **Novedades**, **Solicitudes**, **Agenda**, **Arranque** y
  **Cobranza/cartera**: el select trae `razon_social`/`tipo`; el mapeo agrega `razon`/`tipoCli`;
  el nombre se muestra con `nombreClientePedido`. El campo `cli` queda **crudo** donde se usa
  para búsqueda, reverse-lookup o persistencia (Novedades, Solicitudes, Agenda).

### `sw.js`
- `CACHE` sube a `freelance-v299`.

## 3. Qué NO se debe tocar

- **Comprobantes / PDF / canvas impresos.**
- **Formularios de edición de cliente.**
- **La base de datos** (ningún insert/update/delete/migración). La vista `v_comisiones_app`
  ya venía ampliada por Cowork.
- **Permisos ni reglas de negocio.**
- El campo crudo `cli`/`cliente` donde se usa para **filtrar, buscar, hacer reverse-lookup o
  persistir** (no se debe canonizar al mapear).

## 4. Cómo verificar

1. `node scripts/compilar.js` (ambas apps compilan).
2. `node pruebas/pruebas.js rapido` en verde. Guardas en `test_cambios_422.js`
   (bloque `NOMBRE_CLIENTE_INTEGRIDAD_2`) y en `test_nombre_cliente.js` (la función única).
3. En el celular / web, tras publicar b196 / v473: mirar que en Cobranza, Solicitudes,
   Novedades, Agenda, Notas de crédito, Arranque, Comisiones y las Guías de Logística el
   nombre salga parejo (persona → «NOMBRE APELLIDO»; empresa → razón social).

## 5. Trampas conocidas (lo que ya se revisó y lo que puede morder)

- **Canonizar `cli` al mapear ROMPE** la búsqueda (Cobranza/Solicitudes), el reverse-lookup
  (Novedades `.eq("nombre", …)`) y la persistencia (Agenda `guardarActividad`). Patrón seguro:
  dejar `cli` crudo y **agregar** `razon`/`tipoCli` al objeto; mostrar con la función.
- **La función devuelve MAYÚSCULAS** (antes el efecto era solo CSS `textTransform`). Eso cambia
  el `textContent` del DOM: los arneses que localizan por nombre deben buscar en MAYÚSCULAS.
- **`recorrido_viaje` (RPC)** — la lista «Ver recorrido del camión» (paradas) muestra el
  cliente que devuelve esa función de base, que **no** entrega `razon_social`/`tipo`. Para
  formatearlo con la regla persona-natural haría falta **ampliar el RPC en la base** →
  **tarea de Cowork**, no de Code. Se dejó como está (avisado).
- **Trazabilidad de Pedidos** (`vistaTraza`/`tzRecorrido`) corre sobre datos **demo estáticos**
  (`EF_VIAJES_INI`) y usa `g.cliente` crudo para reverse-lookup y plantillas de WhatsApp; no es
  una pantalla viva con select que ampliar, así que quedó fuera de este envío.
