# Logística · fila rica en «Escoger pedidos» (sistema-web)

`sistema-web.html`, componente `TrazabilidadWeb`, pantalla «Escoger pedidos»
(`seleccionPedidos`). Ancla `/* DISENO_LOGISTICA_FILA_DATOS */`.
Es presentación + un cálculo de días. No se toca la base, ni el armado de rutas,
ni los cálculos de qq / «llena un camión», ni permisos.

## Qué se hizo
En «Escoger pedidos», cada pedido pasó de 2 líneas (nombre / número·vendedor) a **una
sola línea horizontal con columnas alineadas**, en este orden:

`[✓] NOMBRE(mayúsc.) · PED-N.º(chip) · 📅 Ingresó <fecha> · ⏱ <hace N días> · 🏭 Piladora <prov> · 👤 Vendedor <sc>` … `<qq> qq`

- La fila va dentro de un contenedor con `overflow-x:auto` y un `min-width:920px`, así
  en pantallas angostas **se desliza en horizontal** en vez de amontonarse.
- Se conserva todo el comportamiento: checkbox (con `stopPropagation`), clic en la fila
  que selecciona, resaltado sel/llena («llena un camión»), borde naranja, chip verde del
  número y el nombre en MAYÚSCULAS con `nombreClientePedido(p)`.
- Íconos Lucide del set `ICONS` vía `<Ico>`: `calendar`, `clock`, `warehouse`, `user`
  (ya existían; no se agregó ningún SVG ni CDN).

### Cambios puntuales
1. **Mapeo (~L2537)**: cada fila expone ahora `creado: p.creado` (fecha cruda) y
   `prov: (p.proveedores && p.proveedores.nombre) || "—"` (piladora por fila). El vendedor
   ya viajaba en `sc` (usuarios.nombre). **El select NO se tocó** (ya traía todo).
2. **Helpers (nivel de `TrazabilidadWeb`)**: `fmtFechaLog(iso)` → «4 ago 2026»; `diasDeLog(iso)`
   → «hoy» / «hace 1 día» / «hace N días», ambos en horario de Ecuador con `hoyECWeb()`.
   No se reutilizan `diasDesde`/`fmtFecha` de otros componentes (fuera de alcance).
3. **Fila (~L3064)**: reescrita a una línea con columnas de ancho fijo (nombre 160,
   número 135, fecha 150, días 110 ámbar, piladora 180, vendedor 190) + spacer + qq.
4. **Orden nuevo «↓ Más recientes»** (`ordenP1==="fecha"`): las ciudades se ordenan por su
   pedido más reciente (desc) y, dentro de cada ciudad, la lista va por `creado` desc.
   «qq» y «ns» no cambian.

## Qué NO se toca
- El armado de rutas, el despacho, las zonas, el cálculo de qq/«llena un camión», permisos.
- La pestaña «Orden de entrega» (tiene otro arreglo de orden).
- `nombreClientePedido` (solo se usa).

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Guards `DISENO_LOGISTICA_FILA_DATOS` en `test_cambios_422.js`: mapeo (creado/prov),
  helpers (fmtFechaLog/diasDeLog), la fila muestra fecha/días/piladora/vendedor, íconos
  Lucide, `min-width:920` y el orden «Más recientes».
- En el navegador: Logística → Escoger pedidos → cada pedido en una línea con fecha, días,
  piladora y vendedor; el botón «↓ Más recientes» ordena por fecha de ingreso; en pantalla
  angosta la fila se desliza.

## Refinamiento (b191) · solo el valor, sin palabra-etiqueta
Para dar más aire a la línea, se quitaron las palabras-etiqueta de la fila y quedó **solo el
valor con su iconito** (los iconos ya dicen qué es cada dato):
- Fecha: se quitó «Ingresó» → «4 ago 2026» (📅).
- Días (`diasDeLog`): se quitó «hace» → «18 días» / «1 día» / «hoy» (⏱). **Solo cambió el texto de
  salida, no el cálculo.**
- Piladora: se quitó «Piladora» → «San Agustín» (🏭).
- Vendedor: se quitó «Vendedor» → «Richard Ramírez» (👤).
Además se angostaron esas columnas (fecha 150→105, días 110→80, piladora 180→140, vendedor 190→150)
y el `min-width` de la fila bajó 920→760, para que entre mejor sin deslizarse.

## Versiones
Sistema Web **b190** (fila rica) → **b191** (solo valores), caché **freelance-v292** → **freelance-v293**.

## Trampas conocidas
- El `<Ico>` renderiza un `<svg display:block>`: por eso cada columna es un flex con el
  ícono y un `<span>` de texto que corta con «…» (no un inline suelto).
- En modo demo `creado` puede venir `null`: `fmtFechaLog`/`diasDeLog` devuelven «—» y el
  orden por fecha usa `""` de respaldo (no rompe).
- Las comparaciones de fecha usan el string ISO tal cual (orden lexicográfico correcto).
