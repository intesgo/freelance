# Alcance · Sistema Web · Mejora de UI de la pantalla PRODUCTOS (CatalogoWeb) · SIN base

Ubicación: `function CatalogoWeb({ usuario })` en `sistema-web.html`. Solo front: sin base, sin
RLS, sin permisos, sin tocar el alta (`ModalNuevoProducto`) ni «una marca = una ficha».

## 1. Qué se cambia y por qué (negocio)
Mejorar solo la UI de «Productos»: tarjeta «Proveedor actual», mejor estado vacío, búsqueda
ampliada (marca/código), estados carga/vacío/sin-resultados/error, y responsive a tarjetas en
móvil. Se mantiene: PRIMERO proveedor, luego su catálogo.

## 2. Qué se cambió
- **Búsqueda ampliada** (`DISENO_CAT_BUSCA`, ≈filtro de `productosFiltrados`): además de nombre y
  línea, busca por **marca** y por **código** (`p.id`, p. ej. `P-00197`).
- **Barra superior** (`DISENO_CAT_BARRA`):
  - **Sin proveedor** → estado vacío grande: título, buscador de proveedor (`BuscadorPredictivo`)
    y chips de los 6 proveedores con más productos (de datos reales).
  - **Con proveedor** → tarjeta **«Proveedor actual»** (nombre + `N productos · M presentaciones`,
    conteos reales) con botón «Cambiar proveedor», la búsqueda de producto (nombre/marca/código) y
    el botón «+ Nuevo producto» (solo con proveedor y si no es solo lectura).
- **Estados del catálogo** (`DISENO_CAT_ESTADOS`): error (con **Reintentar** que reejecuta
  `cargarProductos`) → cargando (`fuente==="supabase" && prodsReales===null`) → «Este proveedor
  todavía no tiene productos.» → «No encontramos productos con esa búsqueda.» (si hay texto) →
  lista. Se añadió una bandera mínima `errorProd` en el `try/catch` del cargador de productos.
- **Responsive** (`DISENO_CAT_RESPONSIVE`, `useEsMovil(720)`): en móvil el encabezado de tabla se
  oculta y cada fila se apila como tarjeta (una sola columna, con etiquetas Unidad/Presentaciones/
  Rentab.), sin barrido horizontal. Se reusan los mismos datos, el menú ⧉ y las acciones.

## 3. Qué NO se tocó
- Base, RLS, permisos, `ModalNuevoProducto`, «una marca = una ficha».
- La carga de datos (solo se refactorizó a `cargarProductos` re-invocable para el Reintentar) ni
  los filtros existentes (línea / sin piladora / margen bajo), que siguen debajo de la barra.
- prod_id/pres_id, precios, ofertas, pedidos.

## 4. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde (116 ✓).
  `ARNES_SECCIONES_WEB` renderiza `CatalogoWeb` sin error.
- VERSION Sistema Web **b227** + CACHE **v337**; arneses de versión al día.
- En intesgo.app/home (freelance): sin proveedor sale el bloque grande con buscador y chips; al
  elegir aparece la tarjeta «Proveedor actual» con conteos reales, la búsqueda por nombre/marca/
  código y «+ Nuevo producto»; «Cambiar proveedor» vuelve al estado vacío; se ven los estados
  cargando/sin productos/sin resultados; en móvil no hay barrido horizontal.

## 5. Trampas conocidas
- `useEsMovil(720)` a propósito (no 760): el arnés `test_pedidos_busca_web` muta la línea
  `const movil = useEsMovil(760);` de PedidosWeb y necesita que ese texto sea único; usar otro
  breakpoint en CatalogoWeb evita el choque.
- El resto del componente (filtros, «Ver más», modo selección, replicar) queda igual: solo cambia
  la barra superior, se agregan estados y el responsive.
- Publicar VERSION + CACHE juntos o el robot no publica.
