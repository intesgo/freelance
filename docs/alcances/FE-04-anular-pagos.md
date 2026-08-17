# FE-04 · Cuando se anula un viaje, sus pagos se anulan

ESTADO: aplicado en producción por Cowork (16/08/2026). La línea de mensaje en el
frontend (FE-03.1) sale con el Sistema Web b164.
QUIÉN LO EJECUTÓ: Claude en Cowork (cambio de base). Code NO tocó la base.
BASE: función `public.fe_pagos_al_anular_viaje()` + disparador
`t_fe_pagos_al_anular_viaje` (BEFORE UPDATE OF estado ON public.viajes). El SQL
aplicado queda como registro en `migraciones/FE-04-anular-pagos-al-anular-viaje.sql`.

## El problema, en una línea

Se podía anular un despacho y los pagos de flete/estibada de ese viaje quedaban vivos
y pagables. Era el único camino de FE-03 por donde se podía pagar plata que no se debe.

## Qué hace el disparador

Al pasar un viaje a `anulado`:
- Si algún pago del viaje ya está `pagado` → se PLANTA con `VIAJE_CON_PAGOS_PAGADOS`
  y la anulación **no ocurre** (el viaje queda en su estado anterior; nada a medias).
  Esa plata ya salió: se resuelve a mano con la contadora.
- Si no hay pagos pagados → todos los pagos del viaje pasan a `anulado`, con
  `origen='viaje_anulado'` para dejar el rastro.

Cuelga de la tabla `viajes` (no de una función), así que cubre cualquier camino que
anule un viaje, hoy y mañana.

## Parte de Code (FE-03.1)

Una sola línea en el diccionario `ANUL_VIAJE_ERR` de `sistema-web.html` (Logística),
para que el bloqueo salga en palabras y no como error crudo de Postgres:

```js
VIAJE_CON_PAGOS_PAGADOS: "No se puede anular: el viaje tiene pagos ya realizados. Resuélvelo con la contadora.",
```

El resto de FE-03 ya pinta el estado `anulado` y esconde el botón «Pagar»: no hay más
que tocar en las apps.

## Qué NO se tocó

- No hay DDL de columnas, tablas ni cambios de RLS/permisos.
- `anular_viaje`, `anular_ruta` y demás RPC quedan igual.
- Los otros dos disparadores (al despachar, al entregar) quedan igual.

## Pendiente (fase 2, aparte)

Que el FLETE nazca `provisional` y pase a `firme` al entregar (como la estibada). Elimina
la raíz (hoy el flete se puede pagar al despachar, antes de cualquier entrega) y ajusta el
flete a lo entregado. Es un cambio de regla más grande: su propio análisis y aprobación.

## Cómo verificar

1. Despachar una ruta de prueba → nacen los pagos.
2. Anular ese despacho desde Logística → los pagos salen como «Anulado» en el módulo Pagos
   y el botón «Pagar» desaparece.
3. Si algún pago estaba pagado, al anular sale el mensaje en palabras
   (no el error crudo) y el viaje no se anula.
