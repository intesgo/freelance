# Alcance · Sistema Web · Rediseño de «Unidades / Presentaciones» (CatalogoUnidadesWeb) · SIN base

Ubicación única: `function CatalogoUnidadesWeb({ usuario })` en `sistema-web.html`. Solo front:
sin base, sin RLS, sin permisos. NO toca `ModalNuevoProducto` ni el alta de producto.

## 1. Qué se cambia y por qué (negocio)
Modernizar la pantalla del catálogo de unidades: cabecera con botón «Nueva unidad» + modal,
tarjetas de resumen, tabla limpia, ordenar con flechas ↑↓, y un modal que pide «peso + unidad»
y convierte a quintales por dentro (aceptando cualquier unidad de peso). Los escritos a Supabase
son los mismos que ya existían (`cargar`, `agregar`, `guardarUnidad`, `ocultar`).

## 2. Qué se construyó (todo dentro de CatalogoUnidadesWeb)
- **Cabecera** (`CAT_UNIDADES_UI`): ayuda + botón «＋ Nueva unidad» (solo freelance) que abre el
  modal (`modal` = "nueva" | "editar"). Se quitó el cuadro punteado fijo «Agregar unidad» del pie.
- **Tres tarjetas de resumen** (`CAT_UNIDADES_TARJETAS`): «N unidades activas» · «N de peso fijo» ·
  «N variables por producto», de datos reales.
- **Tabla limpia** (`CAT_UNIDADES_TABLA`): UNIDAD (nombre + código chico debajo) · TIPO (Peso fijo /
  Variable) · EQUIVALENCIA (fijo `{equiv_qq} qq`; variable «Según producto») · ESTADO (Activa/Oculta) ·
  ACCIONES (Editar · Ocultar/Reactivar · flechas ↑↓). Se quitó la columna «Orden».
- **Flechas ↑↓** (`CAT_UNIDADES_ORDEN`, función `mover`): intercambia el `orden` entero con el vecino;
  ↑ deshabilitada en la primera fila, ↓ en la última.
- **Modal Nueva/Editar** (`CAT_UNIDADES_MODAL`): Nombre · Tipo (botones «Peso fijo» | «Peso variable») ·
  si fijo, Peso [number] + selector de unidad y, debajo, «Equivalencia: {equiv} qq» en vivo · si
  variable, texto explicativo sin peso · Código solo en «Nueva» (mayúsculas, único) y en solo lectura
  al editar · botones Guardar/Cerrar. Se conservan las validaciones y mensajes actuales.
- **Conversión** (`CAT_UNIDADES_CONV`, `UNIDADES_PESO` + `pesoAEquiv`): factores a quintal (1 qq = 100 lb
  = 45,36 kg): qq, arroba (0.25), libra (0.01), kg (1/45.36), g (1/45360), ton (1000/45.36), oz (1/1600).
  Se sigue guardando en `equiv_qq` (misma columna, mismo insert/update); la conversión es 100% frontend.
  Al «Editar» de una unidad fija, el selector precarga en «Quintales» con el `equiv_qq` guardado.

Ejemplos: 25 lb → 0,25 qq · 1 kg → 0,022 qq · 1 arroba → 0,25 qq · 50 kg → 1,10229 qq.

## 3. Qué NO se tocó
- Nada de base: sin migraciones/RPC/constraints, sin cambiar `equiv_qq` de las variables, sin RLS
  ni permisos. Se reusan `cargar`/`agregar`/`guardarUnidad`/`ocultar` (mismos `.from`/insert/update).
- `ModalNuevoProducto` ni el selector de unidades del alta de producto.
- Código inmutable (no se edita `cod`). Ocultar/reactivar en vez de borrar. `soloLectura` (rol ≠
  freelance) ve la tabla sin botones ni «Nueva unidad».

## 4. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde (116 ✓).
  `ARNES_SECCIONES_WEB` ahora renderiza también `CatalogoUnidadesWeb` (sin ReferenceError).
- VERSION Sistema Web **b226** + CACHE **v336**; arneses de versión al día.
- En intesgo.app/home (freelance): 3 tarjetas, tabla limpia, «Nueva unidad» abre el modal, el modal
  convierte peso→qq desde cualquier unidad, flechas ↑↓ reordenan. Rol no-freelance: solo lectura.

## 5. Trampas conocidas
- El guardado y sus validaciones/mensajes se conservan EXACTO: solo cambia de dónde salen los datos
  (del modal en vez de inputs en línea). `equiv` en el estado del modal se mantiene en quintales.
- Publicar VERSION + CACHE juntos o el robot no publica.
