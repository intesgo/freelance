# Alcance · Sistema Web · Resalte «interruptor» Crédito(verde)/Contado(azul) en la pestaña Precio

## 1. Qué se cambia y por qué (negocio)
En el modal de pedido → pestaña Precio, el resalte ahora «juega» con lo elegido (solo una activa):
- Al elegir **CRÉDITO**: botón «Crédito» y tarjeta «CRÉDITO» en **verde** (activos); tarjeta
  «CONTADO» apagada (gris/atenuada).
- Al elegir **CONTADO**: botón «Contado» y tarjeta «CONTADO» en **azul** (activos); tarjeta
  «CRÉDITO» apagada.
Antes las dos tarjetas estaban siempre coloreadas y el botón «Contado» se resaltaba en verde.

## 2. Qué se cambió (sistema-web.html, `modalPed==="precio"`)
- **Botón de tipo**: el botón «Contado» (P2), cuando está activo, pasa a **azul** (`#2b6cb0` /
  `#eef4fb`); los demás tipos siguen resaltando en verde al elegirse.
- **Tarjetas de base** (ancla `BASE_DOS_TARJETAS_WEB`): se enciende solo la de la condición
  elegida, usando la constante existente `esCredito` (`credOn = esCredito`, `contOn = !esCredito`).
  La activa va con su color (crédito verde / contado azul); la otra queda `opacity:.5`, borde
  gris, ícono/texto en `COLOR.muted`.

## 3. Qué NO se tocó
- La tabla comparativa (`COMPARA_CRED_CONTADO_WEB`), el aviso azul (`INFO_BANNER_WEB`) y el pie.
- El cálculo de precios/comisión, `esCredito`, base de datos, permisos y camino demo.
- Los íconos `creditCard` / `banknote` (los dejó #135).

## 4. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde
  (116 ✓). `test_web_al_dia` sigue verde (ancla `BASE_DOS_TARJETAS_WEB` conservada).
- VERSION Sistema Web **b225** + CACHE **v335**; arneses de versión al día.
- En intesgo.app/home, pestaña Precio: «Crédito» → botón y tarjeta CRÉDITO verdes, CONTADO
  apagada; «Contado» → botón y tarjeta CONTADO azules, CRÉDITO apagada. El resalte cambia de lado.

## 5. Trampas conocidas
- Solo el botón «Contado» cambia a azul; los otros tipos siguen en verde al elegirse.
- En promos (P4/P6), `esCredito` es falso → queda activa la de Contado por defecto (no es foco).
- Publicar VERSION + CACHE juntos o el robot no publica.
