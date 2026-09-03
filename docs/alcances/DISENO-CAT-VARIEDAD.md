# DISENO_CAT_VARIEDAD · Columna «Variedad» y filtro «Sin variedad» en Productos (Sistema Web)

**Ancla:** `DISENO_CAT_VARIEDAD`
**Archivo:** `sistema-web.html` · componente `CatalogoWeb` (pantalla **Productos**)
**Versión:** b239 · CACHE `freelance-v351`

## 1. Qué se cambia y por qué

En la tabla de **Productos** del Sistema Web ahora se ve una columna **Variedad** (la
variedad del grano de cada producto) y un botón de filtro **«Sin variedad (N)»** para
encontrar de un vistazo los granos que todavía no tienen variedad asignada. Así la
oficina completa la ficha sin ir producto por producto.

## 2. De dónde sale la variedad

- Se lee de la base, de las tablas **`grano_variedades`** y **`grano_familias`** (ya
  aplicadas por Cowork; **Code no las toca**), filtrando `activo = true` y ordenando por
  `orden`.
- Si la lectura falla o el rol no tiene permiso, cae al **respaldo** de las constantes del
  propio archivo: `VARIEDADES_GRANO` y `FAMILIAS_GRANO`. Nunca queda la pantalla en blanco.
- La traducción la hace `variedadDe(cod)`, que devuelve uno de tres estados:
  - **ok** → nombre de la variedad + «código · familia».
  - **desconocida** → el código tal cual + chip **«sin ficha»** (color maíz).
  - **vacío** → «—» si el producto es de una línea con grano; celda vacía si no.

## 3. El contador y el filtro

- El botón dice **«Sin variedad (N)»** donde **N** cuenta **solo** los productos de líneas
  con grano (`LINEAS_CON_GRANO`, derivadas de `grano_familias`) que aún no tienen variedad.
  Un producto de una línea sin grano (p. ej. Enlatados) **no** entra en la cuenta.
- Al encender el filtro se hace `setPagina(0)` para no quedar en una página vacía.
- El buscador ahora también encuentra por **nombre** y **familia** de la variedad, además
  de por código.

## 4. Qué NO se debe tocar

- **La base de datos.** `grano_variedades` / `grano_familias` las mantiene Cowork.
- **Los márgenes / rentabilidad** (`preMargenObjetivo` sigue en 8 %).
- Los otros filtros de la pantalla (Sin piladora, Margen bajo) siguen independientes.
- Precios, presentaciones y demás módulos: intactos.

## 5. Cómo verificar

- Local: `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arnés propio: `pruebas/test_catalogo_variedad.js` (registrado en `pruebas.js`, `apps:[null]`).
- En el celular / navegador, en **Productos**: la columna **Variedad** aparece tercera
  (Producto · Unidad · **Variedad** · Presentaciones · Rentab. · Piladoras); el botón
  **«Sin variedad (N)»** filtra los granos sin variedad; un producto con variedad muestra
  su nombre y su familia.

## 6. Trampas conocidas

- La columna **Variedad va tercera**; si se reordena la rejilla hay que ajustar tanto la
  cabecera como la fila (mismo `gridTemplateColumns`) y el arnés `test_catalogo_variedad.js`.
- El contador va sobre **PRODS** (todos), no sobre `productosFiltrados`, para que el número
  no cambie al aplicar otros filtros.
- Si Cowork agrega familias nuevas, `LINEAS_CON_GRANO` las toma solas desde la base; no hay
  que tocar constantes salvo que se quiera respaldo offline.
