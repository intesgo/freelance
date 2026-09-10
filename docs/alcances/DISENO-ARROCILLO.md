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

## Qué NO se toca

- La clasificación del **arroz** (familias C09/L11/F14) ni sus constantes.
- **PiladorasWeb** (Piladoras y Precios): NO se tocó. Su traducción de variedad usa la
  **constante** `VARIEDADES_GRANO`, no la base, así que el arrocillo **no aparece** aún en
  su subtítulo de marca ni en la pestaña «Por variedad» de Precios. **Pendiente (follow-up):**
  cablear PiladorasWeb a la lista viva de variedades para mostrar/ajustar precios del
  arrocillo. Se dejó fuera a propósito para no dejar un «clasificar» que se vea roto.
- **Apps móviles**: solo `freelance-completo.html` clasifica por variedad (2 puntos que
  escriben `productos.tipo_grano`). **Pendiente (follow-up):** aplicar el mismo criterio
  ahí. Comisionista, socio, proveedor y transportista **no clasifican por variedad** — no
  requieren cambio.
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
