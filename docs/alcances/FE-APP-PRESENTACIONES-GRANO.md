# Alcance · App Freelance: presentaciones reales + Tipo de grano en la ficha

> `freelance-completo.html`. **Solo front.** No toca la base: `tipo_grano` ya existe en `productos`,
> `presentacion` ya está en `ofertas_piladora`; solo se agregan dos columnas a `select` que ya existen.
>
> **Nota (§9):** el alcance venía escrito contra `e123cc0` (b212) y proponía subir sistema-web 212→213
> junto con freelance 474→475. Pero A/B/C ya se publicó (b214) y sistema-web quedó en b214; así que
> esta tanda es un PR aparte que **solo** toca freelance-completo (474→475) y sube la caché (v319→v320).

## CAMBIO D · La app FREELANCE muestra las presentaciones REALES (`construirCatalogo`)
Antes armaba el catálogo con **dos presentaciones fijas a mano** (Quintal + Arroba) y el precio de la
arroba lo **calculaba** (quintal × 0,25). Consecuencias: «10 libras», Saco, Funda o Caja **nunca**
aparecían en la app del dueño; el precio de la arroba era un cálculo, no el guardado; y el vendedor
(Comisionista, que sí arma bien) podía vender una presentación que el dueño no veía.

Ahora (ancla `PRESENTACIONES_REALES`):
- El `.select` de `ofertas_piladora` suma `presentacion`; el de `productos` suma `tipo_grano`.
- Se borró el bloque `precioDe` (que normalizaba a quintales y se quedaba con el más barato del
  producto). Cada presentación trae su propio precio.
- `base(cod,tam,eq,bc,bk)` resuelve el `pres_id` con `infoPres` y el `id` pasa a ser
  `prod_id+"-"+cod` (antes «-AR» mientras el presCod decía «ARR»: inconsistencia resuelta).
- Las presentaciones salen de las ofertas vigentes agrupadas por `pres_cod`, quedándose con la
  piladora **más barata de esa presentación**, ordenadas por peso (quintal primero). Sin presentación
  vendible (sin peso o sin precio) el producto no se ofrece.
- El producto lleva `tipoGrano` (lo usa el CAMBIO E).
- **Arnés** `test_catalogo_productos.js` repuntado: el ancla del mutante `precios` incluye
  `presentacion`; los dos mutantes de `precioDe` se cambian por dos que apuntan a la nueva regla
  (más barata por presentación / no inventar el par fijo). Sigue en 9 mutantes → 39 ✓ · 0 ✗.

## CAMBIO E · «Unidades y agrupación» → Tipo de grano real (`FichaMarca`)
La tarjeta de agrupación escribía en `AGRUPACION_INI` (un objeto en memoria): decía «✓ guardado» y era
falso (se perdía al cerrar la app), estaba indexada por nombre de marca (dos marcas iguales se pisaban)
y declaraba una «unidad base» que las presentaciones reales ya contradecían.

Ahora (ancla `GRANO_EN_LA_FICHA`): la tarjeta es el **Tipo de grano** (`productos.tipo_grano`), que sí
manda (el ajuste de precios por bloque filtra por familia+nivel) y antes solo se tocaba desde el Sistema
Web. `guardarGrano` hace el mismo `update({tipo_grano}).eq("prod_id", marca.id)` que ya usa PiladorasApp,
actualiza el catálogo en memoria (`marca.tipoGrano`), y `puedeGrano` respeta el mismo criterio que
`puedeFoto` (solo con sesión real). Se retiraron `UNIDADES_MEDIDA` y `AGRUPACION_INI` (ya sin uso; ningún
arnés las referencia como código).

## Qué NO se tocó
La base; `Comisionista.html` y `socio-comercial.html` (ya lo hacen bien); `sistema-web.html`; la regla
«un producto, un precio» (ahora POR presentación, que es más correcto); `FiltroBuscador`; el selector de
grano del Sistema Web y `guardarTipoGrano` de PiladorasApp; la foto por presentación; roles y permisos.

## Publicación (§4)
`freelance-completo.html` **VERSION v475** · `sw.js` **CACHE freelance-v320** (sistema-web se queda en
b214). Arneses de versión ajustados: `test_cambios_419/422`, `test_fe01_tarifas`, `test_fe03_pagos`.
`compilar.js` + `pruebas.js rapido` en verde.

## Cómo verificar en el celular
Productos → «Arroz Crecedor» (San Agustín): 3 presentaciones (Quintal, Arroba, 10 libras) con su propio
precio, no calculado; tomar pedido con las 10 libras da 0,1 qq por unidad. En la ficha, donde estaba
«Unidades y agrupación» ahora está «Tipo de grano»: clasificar, salir y volver → sigue ahí; en el
Sistema Web ese producto aparece ya clasificado y el ajuste por bloque lo alcanza.
