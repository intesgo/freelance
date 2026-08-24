# Alcance · FE01_QUITA_COBRO — Quitar el cobro de flete/estibada al cliente

> Front puro, en las 4 apps que toman pedido + el módulo de tarifas del Sistema Web.
> **NO toca la base:** las columnas `flete_cobro_qq`/`estibada_cobro_qq` se conservan y se mandan en **0**.

## Por qué
El flete y la estibada **ya van incluidos en los precios base** de los productos. Cobrarlos otra vez
aparte inflaba el total. Se quita el cobro de la pantalla; el total del pedido = solo la base de productos.

## Qué se cambió

### A) `sistema-web.html` (b204)
1. Módulo «Tarifas de logística»: se quitó el **título repetido** (lo pone el menú) y se reescribió el texto
   para no mencionar el «cobro por zona».
2. Se quitó la pestaña **«📍 Zonas (cobro)»** (botón + todo el bloque `FE01_TARIFAS_ZONA`). Quedan
   **Chóferes** y **Estibadores**. La pestaña por defecto pasó a **Chóferes**.
   - La lista de zonas (`cargarZonas`/`zonas`) **se conserva**: la usa el tab Chóferes (flete por zona).
3. En «Tomar pedido»: se quitó el cuadro **«Cobro al cliente ($/qq)»** (inputs Flete/Estibada), el efecto
   que los prellenaba desde la tarifa de zona, la lectura de `zonas`/`tarifas_fe` ámbito zona para el cobro,
   `zonaDeCiudadFE`/`normCiudadFE`, y el desglose «Base + Flete + Estibada». El total = `totalCarrito`.
4. Payload: `flete_cobro_qq: 0`, `estibada_cobro_qq: 0` fijos.

### B) `freelance-completo.html` (v474), `Comisionista.html` (v193), `socio-comercial.html` (v60)
Mismo criterio: se quitó el cuadro «Cobro al cliente», el prellenado por zona, el desglose Base+Flete+Estibada
(total = base), y el paso de `fleteCobroQq`/`estibadaCobroQq` por los parámetros; el payload manda 0. Se
limpiaron las variables/lecturas que quedaban sin uso para que compile sin código muerto.

## Qué NO se tocó
- **Histórico:** la ficha de pedidos ya hechos (`ModalPedido`) sigue mostrando flete/estibada **si > 0** — los
  pedidos viejos conservan su cobro. El `select` del listado y el mapeo (`fleteCobro`/`estibadaCobro`) se quedan.
- **`asume_flete`/`asume_estibada`** («¿quién asume el flete/la estibada?»): es otra cosa, se queda igual.
- Las pestañas **Chóferes** y **Estibadores** del módulo de tarifas y su versionado.
- Nada de permisos ni de la base.

## Arneses
- `pruebas/test_fe02_cobro.js`: **borrado** (validaba justo el cobro que se elimina) y quitado del runner.
- `pruebas/test_fe01_tarifas.js`: se quitaron las verificaciones de la pestaña Zonas/cobro
  (`FE01_TARIFAS_ZONA`, `ambito:"zona"`), se agregó un negativo (`!tab==="zonas"`), y se mantienen las de
  Chóferes/Estibadores (alta de chofer, versionado, ocultar/reactivar).
- Guards de versión/caché al día (sistema-web b204 / `sw.js` v308; freelance v474, comisionista v193, socio v60).
- `test_cambios_422` / `test_pedido_numero_modal` / `test_pedidos_cliente` mantienen sus chequeos del
  **histórico** (select con `flete_cobro_qq`, ficha con cobro > 0): eso se conserva, no se toca.

## Cómo verificar en el celular
- Tomar un pedido nuevo: ya **no** aparece «Cobro al cliente»; el total es solo productos.
- «Tarifas de logística»: ya **no** está «Zonas (cobro)»; abre en Chóferes; sin título repetido.
- Un pedido viejo con cobro: su ficha **sigue** mostrándolo (histórico).

## Trampa conocida
El total de pedidos nuevos **baja** (queda solo la base): es lo esperado, el flete/estibada ya está en los
precios. La **comisión no cambia** (siempre fue sobre la base).
