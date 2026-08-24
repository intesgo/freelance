# Alcance · Catálogo de unidades / presentaciones (Sistema Web)

> `sistema-web.html` · **Solo front**. La tabla `catalogo_unidades(cod, org_id, nombre, equiv_qq,
> activo, orden)` y su seed ya están aplicados por Cowork; lectura para todos, escritura solo rol
> freelance (RLS). **Code no toca la base**: la UI escribe con la sesión del freelance por el
> cliente de Supabase, igual que «Tarifas de logística» escribe en `tarifas_fe`.

## Qué se cambió

### 1) Modal «Nuevo producto» · unidad desde el catálogo (ancla `CAT_UNIDADES`)
- Al montar, carga `catalogo_unidades` (`.eq("activo",true).order("orden")`) a estado `unidades`.
- El selector de unidad pasa de la lista quemada (`PRES_MAP`/`UNIDADES_MEDIDA`) a **pastillas del
  catálogo** por nombre; la elegida guarda `{ cod, nombre, equiv_qq }` en `uniSel`.
- Se muestra el **peso en quintales** (`equiv_qq`) y se puede **ajustar para ese producto** antes de
  crear (por si un saco/caja pesa distinto). Si no se toca, se usa el del catálogo.
- En `guardar()`: `pres = { cod, nom, eq }` sale de la unidad del catálogo (con el equiv ajustado);
  el resto igual (`presId = prodId+"-"+pres.cod`; el insert de `presentaciones`/`ofertas_piladora`
  usa `presentacion_cod=pres.cod`, `presentacion=pres.nom`, `equiv_qq=pres.eq`).
- **Fallback:** si el catálogo viene vacío o sin conexión (`unidades = []`), el modal cae al selector
  fijo de siempre para no bloquear el alta.

### 2) Pantalla «Unidades / Presentaciones» (solo freelance) · `CatalogoUnidadesWeb`
- Nueva sección `unidades` en `SECCIONES`, grupo **Comercial** de `GRUPOS_MENU`, ruteada en el switch.
  Como `TODAS_LAS_SECCIONES = SECCIONES.map(...)` y contadora/operadora tienen listas explícitas que
  no la incluyen, la sección queda **visible solo para freelance** (y admin de plataforma).
- Lista `catalogo_unidades` ordenada por `orden`: nombre, código, peso en quintales, orden, activo.
- Acciones solo freelance: **Agregar** (cod, nombre, equiv_qq, orden), **Editar** (nombre/equiv_qq/
  orden), **Ocultar/Reactivar** (`activo`). Escribe directo a `catalogo_unidades` (la RLS ya candó a
  freelance). El **cod no se cambia** en una existente (se crea otra). Para quien no es freelance,
  la pantalla es de solo lectura con su aviso.
- Aviso claro: `equiv_qq` es **el peso en quintales** (10 libras = 0,10; arroba = 0,25; quintal = 1).

## Qué NO se tocó
La base (ni migración ni seed), cómo se guardan productos/ofertas/presentaciones (solo cambia de
dónde salen las opciones de unidad), otros roles, permisos ni reglas de negocio.

## Cómo verificar
1. `node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde.
2. En «Nuevo producto» el selector muestra Quintal, Arroba, 10 libras, 5 libras, Libra, Saco, Caja,
   Funda, Unidad (los activos del catálogo). Crear «Arroz Crecedor» con «10 libras» queda con
   `equiv_qq` 0,10.
3. En «Unidades / Presentaciones» (solo freelance) se puede agregar/editar/ocultar una unidad y
   aparece en el selector del modal.

## Trampas conocidas
- La escritura la protege la **RLS por rol freelance**; el `soloLectura` del front es solo para no
  chocar con el error de permiso. No cambia permisos.
- Si el catálogo está vacío, el modal usa el selector fijo (fallback) — es lo esperado hasta que el
  freelance cargue unidades.
- `cod` es la llave junto con `org_id`: por eso no se edita en una fila existente (se crea otra).
