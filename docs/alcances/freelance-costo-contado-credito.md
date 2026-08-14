# Freelance · mostrar el costo de compra en dos (contado y crédito)

ESTADO: pendiente
APPS: `freelance-completo.html` (módulo de precios/costos). Nada más.
BASE: no toca la base, ni el RPC `cambiar_costo`, ni permisos. Solo pantalla/lectura.

## Qué se cambia y por qué

En la App Freelance, el precio de VENTA se muestra en dos: contado y crédito. El COSTO de compra
(lo que da la piladora) se muestra como UN solo número, aunque en la base YA existen los dos
valores (`ofertas_piladora.costo` = crédito, `ofertas_piladora.costo_contado` = contado) y el
catálogo ya los carga. Hay que MOSTRAR los dos costos, igual que el precio de venta.

## Datos (ya disponibles, no cargar de nuevo salvo que falte)

- El costo de crédito está en el objeto del producto como `p.costo` (el catálogo lo trae de
  `ofertas_piladora.costo`).
- El costo de contado está como `costo_contado` en el mismo origen; en la tabla comparativa ya se
  usa como `costoContado` (y `costoCredito`) por proveedor (ver el bloque ~línea 17318-17352 que ya
  muestra ambos con su margen). Reutiliza esa misma fuente.

## Cambios

1. Detalle del producto (módulo de precios), tarjeta "Compra" (~línea 16636): en vez de un solo
   `money(p.costo)`, mostrar DOS valores etiquetados: "Compra crédito" (`p.costo`) y
   "Compra contado" (el `costo_contado` del producto). Mismo estilo compacto que ya usan las
   tarjetas de al lado. Si el objeto `p` de esa vista no trae el contado, tómalo de `p.costos`
   (que ya tiene `costoContado`/`costoCredito`) o añádelo al armar `p` desde el mismo select.
2. Revisar los otros puntos donde se muestra un costo único y darles el mismo trato (dos valores):
   busca con patrón MULTILÍNEA los usos de `money(p.costo)` / campos "Costo" en el módulo de
   precios/costos (p.ej. ~17025 y ~20976) y muéstralos como contado/crédito cuando ambos existan.
3. Márgenes: hoy "U. bruta / U. neta" y el "Precio sugerido por tipo de cliente" calculan el margen
   contra un costo único (el de crédito). NO cambies la fórmula, pero ROTULA que ese margen es
   "sobre costo crédito" para no confundir. (Mostrar margen para ambos costos es una mejora aparte;
   no la incluyas en esta entrega salvo que sea trivial.)

## Qué NO se debe tocar

- La base, el RPC `cambiar_costo`, la app del proveedor (ya captura ambos), ni los permisos.
- La lógica de cálculo de precio/comisión/piso; esto es solo mostrar el segundo costo.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Sube `VERSION` de la app y `CACHE` de `sw.js` (los que correspondan) y actualiza los arneses de
  versión/diseño (`test_cambios_*`).
- En el celular: en el detalle de un producto se ven DOS costos (Compra crédito y Compra contado)
  cuando ambos existen; si solo hay uno cargado, se muestra ese sin romper la tarjeta.

## Trampas conocidas

- Cuando `costo_contado` viene null/0 (no lo pusieron), no muestres "$0,00" como si fuera un costo
  real: muestra solo el que exista (o un guion en el que falta).
- Es solo diseño/lectura: NO cambia datos ni permisos.
