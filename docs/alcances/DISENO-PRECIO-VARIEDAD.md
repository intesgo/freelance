# DISENO_PRECIO_VARIEDAD · Precio por variedad y por piladora

**Ancla:** `DISENO_PRECIO_VARIEDAD`
**Archivo:** `sistema-web.html` · `PiladorasWeb` · **Versión:** b242 · CACHE `freelance-v354`

## 1. Qué se cambia y por qué

En la pantalla de costos de una piladora se agrega una sección **«Precios por variedad»**:
el freelance fija el precio de una variedad de grano y, al cambiarlo, cada marca colgada de
esa variedad se mueve **la misma diferencia** contra el precio anterior. Así cada marca y
cada presentación conservan su distancia (su diferencial), sin sobrescribir nada.

## 2. La regla central

    delta_qq = precio_nuevo_variedad − precio_anterior_variedad
    nuevo_precio_oferta = precio_actual_oferta + (delta_qq × equiv_qq)

- Se SUMA el delta, nunca «precio de variedad × equivalencia»: eso rompería el recargo de
  los empaques chicos (una funda de 10 lb puede cargar centavos sobre el proporcional).
- El delta va en **$/quintal** y se multiplica por el `equiv_qq` de CADA oferta.
- Los cuatro números (costo crédito, costo contado, base crédito, base contado) son
  independientes: si solo cambia uno, solo ese se mueve.
- **Primera vez sin precio anterior**: el primer precio SOLO se registra en
  `precios_variedad`, no toca ninguna oferta. Del segundo cambio en adelante propaga. Así se
  puede cargar la lista y clasificar después sin que nadie vea precios moverse.

Ejemplo real (L1103 de AGU, 34 → 36): QQ 35→37,00 · ARR 8,75→9,25 · funda 10 lb 3,50→3,70.

## 3. Cómo se guarda

- `precios_variedad`: se cierra la fila vigente (`vigente_hasta = hoy`) y se inserta la nueva
  (`vigente_desde = hoy`); si la vigente YA es de hoy, se actualiza en sitio (mismo criterio
  MISMO_DIA que las ofertas).
- Las ofertas se escriben **UNA POR UNA** por la puerta única `versionarOfertaWeb` — nunca
  directo a `ofertas_piladora`. Toda la tanda comparte el mismo `codigo` de auditoría y
  `operacion:"Precio por variedad"`.
- Diálogo con **vista previa obligatoria** (marca · presentación · precio hoy → nuevo) que se
  confirma antes de guardar, casilla para excluir marcas de la tanda, y resumen al terminar
  («N de N marcas actualizadas»; si algo falla, lista las marcas por nombre).

## 4. Clasificar sin salir

- Filtro **«Sin variedad (N)»** con el conteo de marcas de ESA piladora sin variedad; al
  vincular una marca solo se escribe `productos.tipo_grano` (ningún precio se toca).
- Aviso (una vez por sesión) si la marca se vende en más de una piladora: la variedad es la
  misma para todas (porque `productos.tipo_grano` es global por marca).

## 5. Qué NO se tocó

- La base de datos (las tablas `precios_variedad`, `grano_variedades` y `grano_familias` las
  mantiene Cowork). Se conservan «Ajustar por grano» y la edición marca por marca (la salida
  cuando algo se sale de la regla). Márgenes, cupo, comisiones y permisos: intactos.
- `ofertas_piladora` sigue siendo la verdad que leen pedidos, apps móviles y comisiones.

## 6. Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arnés propio: `pruebas/test_precio_variedad.js` (la resta y su propagación, la puerta
  única, el código común, el primer precio que no mueve nada). Además `test_precio_una_puerta`,
  `test_precios_ofertas`, `test_tipo_grano`.
- En pantalla: con AGU, subir L1103 y comprobar que las marcas se mueven la misma diferencia
  y que la funda conserva su recargo.

## 7. Trampas conocidas

- NO calcular «precio × equivalencia»: siempre SUMAR el delta.
- El delta es en $/qq y se multiplica por el `equiv_qq` de cada oferta (no un delta plano).
- Una tanda son decenas de escrituras seguidas: por eso el código de auditoría común y el
  resumen con nombres. NO envolverlo en un RPC: sería una segunda puerta.
- Hay marcas de arroz en varias piladoras; el aviso evita el susto al clasificar.
- Un producto de arroz de AGU no tiene nombre de marca: se muestra como «(sin marca)».
