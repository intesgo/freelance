# Alcance · Precios por una sola puerta + Buscador de presentación/unidad

> `sistema-web.html`. **Dos cambios, una sola rama y un solo PR** (mismo componente y mismos
> arneses de versión). Una sola subida de VERSION.n y CACHE.
>
> **Nota de construcción (§9):** el alcance se escribió contra `e123cc0` (b212). Al construirlo,
> `main` ya estaba en **b213** (tanda «peso variable», `e40b064`), que tocó el bloque del selector
> de unidades del CAMBIO B y ya subió VERSION 212→213 / CACHE v317→v318. Por eso: se construye
> contra el `main` real (b213), se sube a **b214 / v319** (no 212→213), y el CAMBIO B se integra
> **preservando el peso variable** (el buscador y los atajos llevan `peso_variable`; el peso sigue
> siendo obligatorio en envases). Los números de línea del alcance están corridos; se ubican en el
> archivo real.

═══════════════════════════════════════════════════════════════════
CAMBIO A · El precio se guarda por UNA SOLA PUERTA
═══════════════════════════════════════════════════════════════════

El mismo dato (costo y base de una piladora) se guardaba desde TRES pantallas con TRES códigos
distintos que no hacían lo mismo. Solo «Piladoras · Costos y Base» versiona con fecha, deja
historial, anota en `auditoria` y aplica la regla del mismo día (MISMO_DIA_ACTUALIZA). La ficha del
producto y el alza en bloque tenían copias propias SIN esas reglas: al retocar dos veces el mismo
día quedaban DOS filas vigentes del mismo día y `v_ofertas_vigentes` podía devolver la que no es.

**No se elimina ninguna pantalla ni capacidad.** Las tres siguen iguales en lo visible; solo cambia
de dónde sale el código que guarda.

- **Puerta única:** `async function versionarOfertaWeb(o, nuevos, usuario)` declarada con `function`
  (hoisting obligatorio: la usa `FichaProducto`, ~1.600 líneas más arriba), justo antes de
  `function PiladorasWeb`. Cuerpo = el de `PiladorasWeb.versionar` (el correcto), con: código de
  auditoría `nuevos.codigo || preAu()`; `nuevos.motivo` sumado al `valor_nuevo`; rótulo
  `nuevos.operacion` (por defecto "Costo/Base"). Conserva MISMO_DIA_ACTUALIZA, el cierre con
  `vigente_hasta = hoy`, el insert de la nueva versión y el try/catch de auditoría. Ancla
  `PRECIO_UNA_SOLA_PUERTA`.
- **Piladoras:** `versionar` pasa a ser un envoltorio → `versionarOfertaWeb(o, {...nuevos,
  operacion:"Costo/Base por piladora"}, usuario)`.
- **Ficha del producto:** los DOS selects de `v_ofertas_vigentes` (carga y recarga) suman
  `vigente_desde` (causa de raíz); cada `piladoras.push` suma `desde` y `margenMin`;
  `guardarPreciosVersionado` reemplaza su cierre+insert por la puerta con rótulo "Costo/Base desde la
  ficha del producto". Se quita el `const hoy` sin uso; se conservan `if (igual) continue;` y el corte
  de base/costo > 0.
- **Alza en bloque (ModalCostoBloque):** `aplicar` reemplaza cierre+insert+auditoría por la puerta
  con `operacion:"Alza de costo por piladora"`, `motivo: mot`, `codigo: au` (un solo código para toda
  la tanda). Se quita el `const hoy` sin uso; se conservan la vista previa, `setHechos(ok)` y
  `ultimoError`.
- **Nuevo producto:** solo rótulo «Precios iniciales» + ayuda. Su insert de alta NO pasa por la
  puerta (no hay pasado que cerrar).
- **Arnés nuevo** `pruebas/test_precio_una_puerta.js` (registrado con `apps:[null]`): la puerta existe
  una sola vez con `function`; ancla presente; las 3 pantallas la llaman con su rótulo; ≤4 escrituras
  sueltas a `ofertas_piladora` (3 puerta + 1 alta); sin escrituras a `precios`; MISMO_DIA_ACTUALIZA
  vivo y los dos selects de la ficha con `vigente_desde`; auditoría con valor_anterior y valor_nuevo.

═══════════════════════════════════════════════════════════════════
CAMBIO B · Buscador predictivo para la presentación / unidad
═══════════════════════════════════════════════════════════════════

Los diez botones de unidad (dos filas) empujan los precios fuera de vista en el celular y crecen con
cada unidad del catálogo. Se reemplazan por `BuscadorPredictivo` (el patrón que la misma pantalla ya
usa para la piladora) + TRES atajos de un toque con las unidades más usadas.

- Estado nuevo `uniTexto` (ancla `UNIDAD_BUSCADOR`).
- Helpers en el modal: `uniLabelFijo`; `elegirUnidad(u)` (un solo camino: fija `uniSel`, `equivAjuste`
  y `uniTexto` — **preservando peso variable:** cuando `u.peso_variable`, no precarga el peso);
  `rapidas` (useMemo sobre `[unidades]`: primero lo más usado en este navegador vía USOS, luego el
  resto por `orden`, tres).
- Rama con catálogo: se borran los diez botones; van los tres atajos + `BuscadorPredictivo cat="unidades"`
  con `sub` (peso en qq), `right`/`extra` (cod) y un aviso «Elegida: …» / «Todavía no eliges…». El
  bloque «Peso en quintales» (con su lógica de peso variable) queda debajo, igual.
- Rama de respaldo (UNIDADES_MEDIDA): mismo patrón con `uniLabelFijo`.
- Guardado: corte nuevo `if (unidades && unidades.length && !uniSel) { aviso; return; }`. En el
  useEffect que preselecciona el quintal, `setUniTexto(qq.nombre)`.

═══════════════════════════════════════════════════════════════════
QUÉ NO SE TOCA · VERSIÓN · TRAMPAS
═══════════════════════════════════════════════════════════════════

- **La base: nada.** Solo código; `vigente_desde` ya existe en `v_ofertas_vigentes`; `catalogo_unidades`
  se lee igual. No se elimina ninguna pantalla ni capacidad. `BuscadorPredictivo` (compartido) no se
  toca. `regUso/ordUso/USOS/USO_FIJO` no se tocan. `presentaciones.precio_*` se dejan. `precios`
  sigue de solo lectura. El campo «Peso en quintales» y su ayuda quedan igual. `CatalogoUnidadesWeb`
  fuera de alcance. Roles/permisos sin cambios. `freelance-completo.html` fuera de alcance
  (mismo patrón duplicado; revisar después).
- **Versión:** VERSION.n **213 → 214** · CACHE **freelance-v318 → freelance-v319** (main ya estaba en
  213/v318). Ajustar `test_cambios_419/422`, `test_fe01_tarifas`, `test_fe03_pagos`.
- **Trampas:** hoisting obligatorio (`function`); `vigente_desde` en los DOS selects de la ficha;
  el alza en bloque comparte un `codigo` de auditoría; el alta no versiona; `equiv_qq` engaña (el peso
  va en la línea secundaria); sin el corte de `guardar` se crearía en quintales calladamente; manda
  `uniSel`, no `uniTexto`; `rapidas` usa useMemo sobre `[unidades]` a propósito; no dar el deploy por
  hecho.

═══════════════════════════════════════════════════════════════════
CAMBIO C · Una marca = una sola ficha, y el grano se pone al crear
═══════════════════════════════════════════════════════════════════

Dos agujeros del alta (mismo modal ModalNuevoProducto):
1. Siempre se generaba un prod_id nuevo → cada presentación de la misma marca nacía como
   producto aparte (p. ej. «Arroz Crecedor» partido en P-00197 y P-00198). Ahora, si ya
   existe la marca ACTIVA con el mismo nombre normalizado y el mismo proveedor_cod, se
   ofrece SUMAR la presentación a esa ficha (reusa su prod_id); no se crea otro producto.
2. El alta nunca preguntaba el tipo de grano → los productos nacían «sin clasificar» y el
   ajuste de precios por bloque (familia+nivel) no los alcanzaba. Ahora se elige el grano
   al crear (mismo `<select>` de VARIEDADES_GRANO que la ficha). Si se suma a una marca que
   ya tiene grano, se hereda (tipo_grano vive SOLO en `productos`; no se copia a otras
   tablas). Si la marca estaba sin clasificar y aquí se elige grano, se le pone al producto
   (rige para todas sus presentaciones).

Anclas: MARCA_UNA_SOLA_FICHA, GRANO_DESDE_EL_ALTA. Cortes: no se deja sumar una presentación
que la marca ya tiene (se manda a Piladoras · Costos y Base); no se bloquea el guardado por
no elegir grano (solo se avisa, hay líneas que no son arroz). La consulta del gemelo es por
proveedor_cod (dos piladoras con la misma marca = dos fichas), filtra estado='activo', y usa
bandera `vivo` + clearTimeout (400 ms) para no ofrecer sumar a la marca equivocada. La foto,
al sumar, queda solo en la presentación nueva (no toca productos.foto).

**Nota (§9):** el alcance venía contra e123cc0 (b212). Al construirlo, main estaba en b213 y
CAMBIO C se integró junto con A+B en el mismo PR (b214), sobre el mismo ModalNuevoProducto ya
reestructurado por A+B y por «peso variable». No toca la base: tipo_grano ya existe en productos.
