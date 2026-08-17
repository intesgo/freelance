# FE-06 · Aviso de guías sin cerrar (para que ningún flete quede impago)

ESTADO: publicado (Sistema Web b167)
APPS: `sistema-web.html` (módulo Logística, pestaña Despacho).
BASE: no toca la base. Las políticas de lectura de `viajes`, `viaje_guias` y `pagos_fe`
ya permiten esta consulta a logística/freelance/financiero/admin. No hay migración.

## Qué se cambia y por qué

Desde FE-05 el flete se paga cuando el chofer cierra la parada. Si una parada se queda
pendiente y nadie la cierra, ese flete no se paga nunca. Este aviso lo pone al frente, con
la plata trabada, para que se llame al chofer.

## Dónde · ancla `/* FE06_GUIAS_SIN_CERRAR */`

En `TrazabilidadWeb`, pestaña **Despacho**, ARRIBA del panel «Viajes vivos en la base». Un
bloque ámbar que **solo aparece si hay algo que avisar** (si está limpio, no se pinta nada).

## Qué dice

- Título: `⏳ Paradas sin cerrar hace más de 3 días · N`
- Una línea por guía (de la más vieja a la más nueva): guía · cliente · chofer · «salió hace
  X días» · plata en espera.
- Total al final: «$X en fletes y estibadas esperando que se cierren estas paradas.»

## Detalles

- Umbral en la constante `FE06_DIAS_AVISO = 3` (un solo sitio para cambiarlo).
- Días de calendario con la fecha de Ecuador (`hoyECWeb`), no con el reloj del navegador.
- Solo en modo vivo (`fuenteLog === "vivo"`); en demo no se pinta.
- Plata trabada = suma de `pagos_fe` en `provisional` de esa guía. Si hay `pendiente_tarifa`,
  cuenta como trabada pero se muestra «falta tarifa» (no tiene monto útil).
- **Solo LEE**: no paga, no anula, no cierra paradas.

## Qué NO se tocó

- La base y sus políticas; el panel de «Viajes vivos» y el flujo de despacho; permisos y
  roles; el camino demo; las otras apps. Nada escribe en `viajes` ni en `pagos_fe`.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- `test_fe03_pagos.js` incluye la ancla, la constante del umbral, que el bloque no se pinte
  vacío y que no haya escritura en `viajes`.
- En la web: sin viajes reales, el bloque no aparece (correcto). Con un viaje real de más de
  3 días con una parada abierta, sale con su monto.

## Pendiente/futuro

El aviso NO reemplaza cerrar la parada: es un recordatorio. La entrega la sigue confirmando
el chofer o logística por su camino normal.
