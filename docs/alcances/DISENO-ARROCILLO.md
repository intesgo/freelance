# Alcance · DISENO_ARROCILLO — clasificación dinámica del arrocillo

> Archivo: `sistema-web.html` (Sistema Web). Familia **A01 = «Arrocillo»** (línea Arroz).
> La base YA está aplicada por Cowork (familia A01, columnas `arr_*`, RPCs). **Code solo
> USA las RPCs; no toca la base** (ni migraciones ni insert/update de variantes).

## Qué se cambia y por qué

El arroz tiene 9 variedades fijas (constante `VARIEDADES_GRANO`). El **arrocillo** no
entra en ese molde: su variedad se arma con 5 atributos de listas cerradas. Ahora, en el
**Catálogo** del Sistema Web:

- **Clasificar un producto**: al crear un producto (`ModalNuevoProducto`) aparece un
  conmutador **Arroz / Arrocillo**. «Arroz» deja el `<select>` de siempre **igual**.
  «Arrocillo» muestra los **5 desplegables** (Tipo, Proceso, Estado, Destino, Calidad),
  los 5 obligatorios. Al guardar, se **busca** la variante viva que coincide en las 5
  columnas `arr_*`; si no existe, se **crea** con `arrocillo_crear_variante`. El
  `variedad_cod` resultante se escribe en `productos.tipo_grano` **exactamente como el
  arroz** (mismo insert/update).
- **Administración** (`AdminArrocillo`, solo rol **Freelance**): panel en el Catálogo que
  lista las variantes A01 (activas e inactivas), crea nuevas (RPC, muestra el error de
  duplicado/lista **tal cual**) y **activa/desactiva** (`arrocillo_activar_variante`).
  **Nunca borra.** Las inactivas se ocultan al clasificar pero se ven aquí y en documentos
  viejos.

## Listas cerradas exactas (constante `ARROCILLO_CAMPOS`)

- Tipo: `3/4 · Medio · Fino` · Proceso: `Selectado · No selectado` · Estado:
  `Envejecido · Natural` · Destino: `Humano · Animal` · Calidad:
  `Especial · Estándar · Económico`.
- Nombre comercial (lo arma la RPC; aquí se replica solo para la vista previa):
  `Arrocillo [Tipo] · [Proceso] · [Estado] · [Destino] · [Calidad]`.
- Sin texto libre, sin «Todos/Ninguno/Otro». No se pre-generan las 72 combinaciones: solo
  se crea la que se pida.

## Archivos y puntos (sistema-web.html)

- Constantes/helpers (`DISENO_ARROCILLO`, tras `VARIEDADES_GRANO`): `ARROCILLO_FAM`,
  `ARROCILLO_CAMPOS`, `arrocilloCompleto`, `arrocilloNombre`, `arrocilloResolver`
  (busca-o-crea con la RPC).
- Carga de `grano_variedades` (`CatalogoWeb.cargarGrano`): ahora trae las columnas `arr_*`
  y **también las inactivas** (para administración y traducción); `cargarGrano` es
  recargable tras crear/desactivar.
- Componentes `ArrocilloCampos` (5 desplegables) y `AdminArrocillo` (panel), montado en el
  return de `CatalogoWeb`.
- Alta `ModalNuevoProducto`: conmutador Arroz/Arrocillo; resolución a `granoCod` antes de
  escribir `tipo_grano`.

## Modal «Variedad» de dos pasos (ampliación · b246 / v484)

Además del alta del Catálogo, el **modal de Variedad** (donde se clasifica una marca) pasó a
**dos pasos** en **PiladorasWeb** (Sistema Web) y en **`freelance-completo.html`** (app del dueño):

- **Paso 1 · ¿Qué es?** dos botones grandes: **Arroz** / **Arrocillo**.
- **Paso 2 · Arroz** = exactamente lo de siempre (familias C09/L11/F14 × niveles). El arroz
  no cambia.
- **Paso 2 · Arrocillo** = los 5 desplegables (listas cerradas), el nombre que quedará en vivo
  y **«Guardar variante»** (busca-o-crea la variante y llama `guardarTipoGrano` **sin
  cambiarla**). Atajo: si la marca ya es arrocillo, el modal abre en el paso Arrocillo con sus
  5 valores precargados.
- **Decodificación**: PiladorasWeb y la app del dueño ahora leen las variantes A01 de la base
  (`arrocVars`, activas e inactivas) y muestran el **nombre comercial** del arrocillo en el
  subtítulo de la marca (antes salía en blanco). El arroz se decodifica igual que siempre.
- **Administración**: la app del dueño tiene su propio panel `AdminArrocilloSB` (dentro de
  Piladoras · Costos y precios); el Sistema Web conserva el suyo en el Catálogo.
- La app del dueño usa **`window.SB`** (no `window.supa`): resolver = `arrocilloResolverSB`.

## Refinamientos del modal + ficha de marca (ampliación · b247 / v485)

Sobre el modal de dos pasos ya existente, en **ambas apps**:
- **Título** = la marca; debajo, chip gris **«Actual: …»** (arroz «Largo 011 · Especial»;
  arrocillo su nombre comercial; o «Sin clasificar») — sin repetir en el título la opción marcada.
- **«¿Qué es?»** pasó a un **toggle segmentado bajo** (Arroz/Arrocillo).
- **Un solo botón «Guardar»** en ambos modos: en arroz se **marca** la variedad y «Guardar»
  la confirma; en arrocillo queda deshabilitado hasta los 5 campos.
- **«Sin clasificar»** apartado a la izquierda, en tono tenue, separado de Cancelar/Guardar.
- **Autoscroll** a la opción marcada al abrir un producto ya clasificado.
- **Chips «usados recientemente»** (solo en Arrocillo): las variantes A01 más nuevas (por
  `creado`, agregado al `select`); un toque llena los 5 desplegables (no crea duplicado).
- En Sistema Web el modal es la instancia inline de PiladorasWeb; en la app del dueño se
  extrajo un **componente compartido `ModalVariedad`** que usan Costos y precios **y** la ficha.

**Ficha de marca** (`freelance-completo.html`, Productos): ya **decodifica el A01** (muestra el
nombre comercial, no en blanco) y el botón «Clasificar / Cambiar variedad» abre el **mismo
modal de dos pasos** (antes era un buscador de solo-arroz). Se conserva el aviso «Sin
clasificar». Escribe con `guardarGranoCod` (misma columna `productos.tipo_grano`).

## Qué NO se toca

- La clasificación del **arroz** (familias C09/L11/F14) ni sus constantes.
- `guardarTipoGrano` / `guardarGrano` (misma escritura a `productos.tipo_grano`); la escritura
  de precios (`ofertas_piladora` / `precios_variedad`); permisos; `registrar_pedido_atomico` /
  `editar_pedido_atomico`. No se borran variantes (solo desactivar).
- **Apps móviles**: solo `freelance-completo.html` clasifica por variedad. Comisionista,
  socio, proveedor y transportista **no clasifican por variedad** — no se tocan.
- La lógica de permisos, la escritura de precios (`ofertas_piladora`/`precios_variedad`),
  `registrar_pedido_atomico`/`editar_pedido_atomico`. Los 3 arrocillos actuales
  (P-00001/2/3) quedan «pendiente de clasificación» hasta que el freelance los clasifique.

## Cómo verificar

```bash
node scripts/compilar.js
node pruebas/test_arrocillo.js sistema-web.html
node pruebas/pruebas.js rapido
```

En el navegador (Catálogo, rol Freelance): abre «Variantes de arrocillo», crea una con los
5 desplegables (ve el nombre comercial), intenta crear la misma (avisa que ya existe),
desactívala (no aparece al clasificar, sí en administración). En «Nuevo producto» elige
«Arrocillo», los 5 campos, guarda y busca el producto en el Catálogo.

## Trampas conocidas

- Los 5 campos son obligatorios: sin los 5 no se crea ni se usa.
- El buscador de variante (`arrocilloResolver`) filtra `activo=true`: si la combinación
  existe **inactiva**, no la encuentra y la RPC decide (rechaza duplicado o reactiva). En el
  panel de administración, «Crear» llama la RPC **directo** para que el error de duplicado
  se muestre tal cual.
- `variedadDe` (CatalogoWeb) traduce por la base, así que el arrocillo se ve bien en el
  listado y la búsqueda del Catálogo. `variedadDesc` (PiladorasWeb) usa la constante: ahí
  no (follow-up).
