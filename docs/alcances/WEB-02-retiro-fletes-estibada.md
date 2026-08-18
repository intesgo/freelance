# WEB-02 · Retiro del módulo «Fletes y estibada»

ESTADO: publicado (Sistema Web b169)
APPS: `sistema-web.html` únicamente.
BASE: no toca la base.

## Qué se cambió y por qué

El módulo «Fletes y estibada» (clave `recepcion`) quedó superado por FE-01…FE-06 y mostraba
datos de demostración (viajes que no existen, «por liquidar» que nadie liquida). Se retiró.
Sus cuatro pestañas ya viven de verdad: Viajes → Logística/Despacho; Fletes y Estibada →
módulo Pagos (pagos reales de `pagos_fe`); Variables → Tarifas de logística (FE-01).

## Qué se quitó

- Entrada de menú (`SECCIONES`), grupo «Operación» del sidebar, permiso de la operadora,
  `case "recepcion"` del router, el componente `EstibadaFletesWeb` completo (~900 líneas),
  `AYUDA_SECCION.recepcion` y `VIDEOS_AYUDA.recepcion`.

## Lo que NO se tocó (lo más importante)

- **Las constantes `EF_*` se quedan** (`EF_VIAJES_INI`, `EF_TRANSPORTISTAS_INI`,
  `EF_TARIFAS_HIST_INI`, `EF_CUADRILLAS_INI`): son el demo compartido de media app (Dashboard,
  Resumen del día, Cartera, Conciliación, Custodia, Reportes, catálogo de respaldo de
  Logística). Se reescribió su comentario para que nadie las borre por descuido.
- Las filas de auditoría con `modulo:"Fletes y estibada"` (historia, no se reescribe).
- El tab de Reportes «🚛 Fletes y estibada» (es una categoría de reporte, no el módulo).

## Navegaciones rearmadas

- Dashboard «por aprobar y pagar» y Resumen del día «aprobar y pagar»: **se retiraron**
  (contaban demo). El «por pagar» real vive en el módulo Pagos (pagos_fe firmes).
- Resumen del día «viajes con pendientes 3+ días»: **repunta a Logística** y su texto pasó a
  «paradas sin cerrar» — el aviso real de FE-06.

## Decisiones que quedan para el dueño (no bloquean; no se pierde nada real)

La pestaña Variables era el único sitio con estas dos cosas, y ninguna tenía tabla en la base
(eran puro demo). Desaparecen de la vista y, si en la práctica hacen falta, se rehacen de
verdad algún día:

1. **Cuadrillas de estibadores** (grupos con encargado). FE-01 modeló estibadores uno por uno.
2. **Acuerdo por proveedor: quién cancela flete y estibada.** FE-02 resolvió el cobro al
   CLIENTE en el pedido; el cargo al PROVEEDOR no tiene equivalente real todavía.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (94 ✓).
- `test_web02_retiro.js`: no queda rastro navegable de `recepcion`, y las `EF_*` siguen.
- En la web: el menú ya no muestra el módulo; el Dashboard/Resumen no tienen botones muertos;
  Pagos, Logística y Tarifas de logística siguen igual; y el demo de Cartera, Custodia,
  Conciliación y Reportes sigue mostrando sus datos.
