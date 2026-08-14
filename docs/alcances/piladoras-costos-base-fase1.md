# Piladoras · Costos y Base (Fase 1) · Freelance + Sistema Web

ESTADO: pendiente
APPS: `freelance-completo.html` (componente `PiladorasReales` ~22858) y `sistema-web.html`.
BASE: no toca la base ni el motor de precios. Las escrituras a `ofertas_piladora` las hace la
app en tiempo real (las políticas ya permiten que el freelance escriba, verificado), reusando
el patrón versionado que ya existe (`ModalCostoBloque` en sistema-web).

## Qué se cambia y por qué

Unificar un módulo "Piladoras" con la MISMA data en Freelance y en Sistema Web: la ficha de cada
piladora suma "Costos y precios", organizados por Grano → Marcas → Presentaciones, con el Costo
(de la piladora) y el Base (que arma el freelance), y una acción "Ajustar por grano".

## Datos (ya existen; usar estos, sin copias)

- `ofertas_piladora` por (prod_id · pres_cod · prov_cod): `costo_contado`, `costo` (= costo
  crédito), `precio_contado` (= BASE contado), `precio_credito` (= BASE crédito), `margen_min`,
  `vigente_desde`/`vigente_hasta`.
- Grano = `productos.linea` (ej. "Arroz"). Marca = `productos` (nombre/marca). Presentación =
  `pres_cod` + `equiv_qq` (Quintal 1, Arroba 0,25).

## Reglas de negocio (críticas — respetar al pie)

1. **Costo = de la piladora** (se muestra; editable como "lo que cotizó", interino hasta que el
   proveedor tenga login). **Base = del freelance** (editable). Mostrar el **margen** (base − costo)
   como guía.
2. **TODO es POR PILADORA.** Cambiar costo/base en una piladora **NUNCA** cambia a otra piladora.
3. **"Ajustar por grano" = edición masiva DENTRO de una piladora:** aplica el cambio (a Costo o a
   Base, en +/− monto o %) a **todas las marcas de ese grano de ESA piladora**. Cada marca puede
   quedar **excluida** (se apaga manual) y entonces el ajuste la salta. **Filtrar siempre por
   `prov_cod`**; jamás cruzar piladoras.
4. **Modelo versionado por fecha (obligatorio):** al cambiar un valor NO se sobrescribe. Se **cierra
   la fila vigente** (`vigente_hasta` = hoy) y se **inserta una nueva** (`vigente_desde` = hoy),
   igual que ya hace `ModalCostoBloque` en sistema-web. Reusar ESE patrón. Auditar el cambio.

## Parte A — App Freelance (`freelance-completo.html` · `PiladorasReales` ~22858)

- En el detalle de una piladora, agregar la pestaña "Costos y precios" junto a Contactos/Condiciones.
- Cargar las ofertas de ESA piladora (`ofertas_piladora` vigentes) y agruparlas Grano → Marca →
  Presentación. Por presentación mostrar Costo (contado/crédito) y Base (contado/crédito) + margen.
- Editar Base (y Costo) por celda → guardar con el patrón versionado (cerrar + insertar).
- Panel "Ajustar por grano": elegir Costo o Base, +/− monto o %, aplicar a las marcas del grano de
  esa piladora salvo las excluidas; toggle "excluida" por marca.

## Parte B — Sistema Web (`sistema-web.html`)

- Crear el módulo "Piladoras" (mismo nombre) y **fusionar dentro** lo que hoy está suelto:
  "Precios vigentes" + la parte de precios del "Catálogo". Misma ficha por piladora (Grano → Marca →
  Presentación, Costo + Base, "Ajustar por grano"), misma data `ofertas_piladora`.
- **Preservar** lo que ya funciona del Catálogo: la edición en bloque / "replicar", y el histórico.
  (Si "replicar" hoy copia entre piladoras, dejarlo como acción aparte y CLARAMENTE distinta del
  "ajustar por grano", que NO cruza piladoras.)

## Qué NO se debe tocar

- El motor `precio_comision_vigente` ni `registrar_pedido_atomico` (siguen leyendo `ofertas_piladora`).
- Permisos/RLS (ya permiten la escritura del freelance).
- El **costo especial** (es Fase 3: necesita cuenta proveedor + aprobación). NO incluirlo aquí.
- La **promo-regalo**: se puede **mostrar enlazada** (solo lectura), pero NO se edita en este módulo.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde. Publicar cada app por
  separado (Freelance primero, luego Sistema Web), con su VERSION + CACHE + arneses de versión/diseño.
- En el celular / navegador:
  - Cambiar el Base de una marca en una piladora **no** cambia esa marca en otra piladora.
  - "Ajustar por grano +$0,50 al Base" sube todas las marcas de Arroz de ESA piladora, **menos** la
    excluida.
  - Tras un cambio, queda una fila nueva vigente y la anterior cerrada (histórico intacto); tomar un
    pedido usa el valor nuevo.
- Añadir un arnés que confirme: (a) el ajuste por grano filtra por `prov_cod`; (b) el guardado cierra
  la fila anterior e inserta una nueva (no sobrescribe).

## Trampas conocidas

- Si sobrescribes en vez de versionar, se pierde el historial de precios. Cerrar + insertar.
- "Por grano" debe filtrar por `prov_cod` SIEMPRE; nunca tocar otras piladoras.
- Guardar el valor real (hay bases con más de 2 decimales, ej. Arroba $8,5875); redondear solo al
  MOSTRAR, no al guardar.
- No mezclar unidades: costo/base son por presentación, cada una con su `equiv_qq`.
- Al fusionar en Sistema Web, no romper la edición en bloque/replicar ni el histórico existentes.
