# PEDIDOS · Corrección P5 (condición elegible + piso real sobre costo)

**Reemplaza lo dicho en P1-4 sobre «piso = base».** Es solo frontend; la base no se toca.

## 1. Qué se cambia y por qué (en lenguaje de negocio)

El precio base (precio_contado / precio_credito) es el precio NORMAL de venta. El precio
especial (P5) baja **desde ahí**, pero nunca por debajo de lo que le cuesta a la piladora
más su margen mínimo. Dos correcciones:

1. **La condición del P5 la elige el usuario** (contado o crédito), igual que cualquier
   línea normal. Ya no queda fija. App y web mandan la MISMA condición para el mismo P5.
   El retiro en bodega es otro asunto (no cambia la condición); el flete se cobra aparte (fe02).
2. **El piso del P5 = costo(según condición) × (1 + margen_min/100)**, no la base de venta.
   - Costo por condición: **contado → costo_contado**, **crédito → costo**.
   - `margen_min` viene de la oferta (hoy 8%); si falta, se trata como 0.
   - El piso NO suma flete ni estibada.
   - Si el precio del P5 queda por debajo del piso, se **bloquea** «Agregar al pedido»
     (bloqueo duro, aviso rojo). App y web igual.

**Ejemplo (Quintal San Agustín):** costo_contado 17 / costo 18, margen_min 8%:
- P5 contado → piso = 17 × 1.08 = **18.36**
- P5 crédito → piso = 18 × 1.08 = **19.44**

## 2. Archivos y puntos exactos

- **sistema-web.html**
  - Fetch catálogo (`v_ofertas_vigentes`): agregar `margen_min` al `select`.
  - Mapeo de producto del catálogo: agregar `costoContado` y `margenMin`.
  - `esCredito`: quitar el caso fijo `|| tipo==="P5"`; el P5 entra por `condP3`.
  - Bloque del piso (ancla `PED_PISO_P5_V2`): piso = costo(condición)×(1+margen_min/100).
  - Panel P5: agregar toggle Contado/Crédito (reutiliza `condP3`, arranca en contado).
  - Mensaje rojo del piso: actualizar el texto (costo de la piladora + margen mínimo).
- **freelance-completo.html**
  - Fetch `ofertas_piladora`: agregar `margen_min`.
  - `construirCatalogoPedido`: mapear `costoContado` y `margenMin`.
  - Demo (producto sin datos reales): agregar `margenMin` de respaldo.
  - `esCredito`: sumar P5 vía `condP3`.
  - Bloque del piso (ancla `PED_PISO_P5_V2`): `bajoPisoP5` sobre el nuevo piso.
  - Panel del precio P5: agregar toggle Contado/Crédito.
  - Mensaje del piso: actualizar el texto.
- **Pruebas:** `pruebas/test_p1_4_cupo_p5.js` y `pruebas/test_cambios_422.js` al nuevo piso.
- **Versión/caché:** app `v460`, web `b174`, `sw.js` `freelance-v268`.

## 3. Qué NO se debe tocar

- La base de datos (ni RPC, ni migraciones). Solo frontend.
- El freelance NO se autoriza a sí mismo el P5 (por encima del piso pasa sin autorización).
- Operadora / contadora: sin cambios de comportamiento.
- El cupo de crédito, las comisiones y los precios normales: sin cambios.
- El flete/estibada se siguen cobrando aparte (fe02); NO entran al piso.

## 4. Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Un mismo P5 guarda la MISMA condición desde app y web (la que elige el usuario).
- Un P5 por debajo de costo+margen_min queda bloqueado en app y web; por encima pasa.
- Precios normales y comisiones sin cambios.

## 5. Trampas conocidas

- `costo` = costo a crédito; `costo_contado` = costo a contado. No confundirlos.
- Si `margen_min` es null, tratar como 0 (no romper el piso).
- El arnés `test_p1_4_cupo_p5.js` y `test_cambios_422.js` estaban atados al piso viejo
  (base de la oferta); hay que reescribir esas aserciones al piso nuevo en el mismo cambio.
- El toggle de P5 reutiliza `condP3` (mismo estado que P3/P4): solo un tipo activo a la vez.
