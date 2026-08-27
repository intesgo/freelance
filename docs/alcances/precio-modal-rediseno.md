# Alcance · Sistema Web · Rediseño de la pestaña «Precio» del modal «Detalles del pedido»

## 1. Qué se cambia y por qué (negocio)
La pestaña «Precio» del modal se ve como el diseño aprobado: las DOS bases (Crédito en verde,
Contado en azul) como **tarjetas grandes** lado a lado, y debajo una **tabla comparativa** de
«Precio sugerido» y «Tu comisión» en dos columnas (crédito verde / contado azul), más un
**aviso azul**. Cabecera, pestañas (Entrega/Precio/Historial) y pie (Cerrar/Listo) quedan igual.
Solo cambia el **cuerpo** de la pestaña Precio.

## 2. Qué se cambió (sistema-web.html, bloque `modalPed==="precio"`)
- **Dos tarjetas de base** (ancla `BASE_DOS_TARJETAS_WEB`): reemplazan al viejo
  `BASE_EN_CHIPS_WEB`. Muestran SIEMPRE las dos bases (ya no se resaltan/togglean según el tipo):
  CRÉDITO (verde, ícono `creditCard`) y CONTADO (azul, ícono `banknote`).
- **Tabla comparativa** (ancla `COMPARA_CRED_CONTADO_WEB`): reemplaza las 3 líneas del cuadro
  resumen (Base de referencia / Precio sugerido / Tu comisión). Dos columnas crédito(verde) /
  contado(azul): «Precio sugerido (canal)» = base × factor de canal por condición, y «Tu comisión»
  en la columna de la condición ELEGIDA (`esCredito`), «—» en la otra. NO hay fila «Margen».
- **Aviso azul** (ancla `INFO_BANNER_WEB`): reemplaza el `<p>` de ayuda; ícono `messageCircle`
  (el set `Ico` no tiene `info`).
- Los dos avisos `requiereAutorizacion` y `bajoPiso` **se conservan** debajo de la tabla.
- Se quitó la const `sugerido` (quedó sin uso al sacar la línea de resumen); el sugerido ahora
  se calcula por columna dentro de la tabla. `base`, `dif`, `bajoBase` SIGUEN en uso: no se tocaron.

## 3. Qué NO se tocó
- Cabecera del modal, pestañas y pie (Cerrar/Listo). Botones de Tipo de precio y secciones
  P3/P4/P5/P6. El cálculo de `base`, `esCredito`, `comisionTotal`, `canalF` y el guardado.
- Base de datos, permisos, camino demo.

## 4. Verificación
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde
  (116 ✓). `test_web_al_dia` valida las anclas nuevas (`BASE_DOS_TARJETAS_WEB`,
  `COMPARA_CRED_CONTADO_WEB`); `test_canon_p1p2` sigue en verde (el cálculo de base no cambió).
- VERSION Sistema Web **b224** + CACHE **v334**; arneses de versión al día.
- En intesgo.app/home (Arroz Crecedor de San Agustín para Supermercado Castillo) → pestaña
  Precio: dos tarjetas (CRÉDITO $38 verde / CONTADO $37 azul), tabla «Precio sugerido
  (Supermercado)» $39,90 / $38,90 y «Tu comisión», y el aviso azul. Al escribir un precio, la
  comisión aparece en la columna de la condición elegida.

## 5. Trampas conocidas
- Este rediseño MUESTRA las dos bases siempre (no se resaltan). **Deja obsoleto** el cambio
  anterior «recuadro base crédito/contado resaltado» (b221): aquí ese bloque desaparece.
- Íconos: `creditCard`/`banknote` existen; no hay `info` → banner con `messageCircle`.
- Publicar VERSION + CACHE juntos o el robot no publica.
