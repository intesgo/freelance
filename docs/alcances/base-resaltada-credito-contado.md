# Alcance · Sistema Web · Recuadro de base resaltado según Crédito/Contado

## 1. Qué se cambia y por qué
En «Detalles del pedido» → pestaña «Precio», al elegir Crédito o Contado se resaltaba el
recuadro de base **equivocado** (cruzado). Ahora: Crédito → recuadro **Base crédito**;
Contado → recuadro **Base contado**. El número «Base de referencia» ya salía bien; esto es
solo el recuadro que se ilumina (borde/fondo teal).

## 2. Qué se cambió
`sistema-web.html`, bloque `BASE_EN_CHIPS_WEB` (≈7405-7409). Mapeo real (canon del repo):
**P1 = Crédito, P2 = Contado**.
- Recuadro **Base contado**: se resalta ahora con `tipo==="P2"` (antes `P1`).
- Recuadro **Base crédito**: se resalta ahora con `tipo==="P1"` (antes `P2`).
Solo se intercambió P1 ↔ P2 en esos dos recuadros.

## 3. Qué NO se tocó
- El cálculo de `base` (≈6480-6483), que ya era correcto (P1→baseCredito, P2→baseContado).
- Los botones de tipo de precio, el precio sugerido, la comisión, ni el camino demo.
- Base de datos ni permisos.

## 4. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde (116 ✓).
- VERSION Sistema Web **b221** + CACHE **v331**; arneses de versión al día.
- En el celular, producto con dos bases (Arroz Crecedor: contado 37 / crédito 38): elegir
  «Crédito» ilumina Base crédito ($38); «Contado» ilumina Base contado ($37); la «Base de
  referencia» coincide con el recuadro iluminado.

## 5. Trampas conocidas
- P1 NO es contado: **P1=Crédito, P2=Contado**. Guiarse por ahí.
- Publicar VERSION + CACHE juntos o el robot no publica.
