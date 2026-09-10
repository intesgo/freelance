# DISENO_BASE_CALCULO_2COL · Precios: contado/crédito separados, campos angostos, % por columna

**Ancla:** `DISENO_BASE_CALCULO_2COL`
**Archivos:** `sistema-web.html` (PiladorasWeb) y `freelance-completo.html` (Piladoras)
**Versiones:** Sistema Web b250 · Freelance app v487 · CACHE `freelance-v364`

## 1. Qué se cambia y por qué

El editor de precios por marca se veía apretado y los campos muy anchos; el atajo «Base =
Costo + %» era un solo botón con un porcentaje fijo (12), igual para contado y crédito.
Este cambio es **solo diseño**:

1. **Separa CONTADO y CRÉDITO** con encabezados de columna (mayúsculas, como ya se ve en el
   resultado calculado de abajo). El bloque «base de cálculo» pasa a una rejilla con etiquetas
   de fila (Costo / Base) y dos columnas (Contado / Crédito).
2. **Angosta todos los campos de llenar** (máx. ~140 px, número alineado a la derecha): los 4
   de la base de cálculo, los dos de % y los dos «Adicional ($/quintal)» de las demás
   presentaciones. En el celular siguen cayendo en columnas sin desbordarse.
3. **Dos «Base = Costo + %» editables**, uno por columna: cada uno con su propio porcentaje
   (arrancan en 12) y su botón «Aplicar». Cambiar el % de contado NO cambia el de crédito;
   al aplicar, solo recalcula la Base de esa columna desde su Costo y su %.

## 2. Qué NO se tocó

- La lógica de guardado (escritura a `ofertas_piladora` / `versionarOfertaWeb`), el cálculo
  de «Arroba» y demás presentaciones (adicional al costo / a la base), el «ANTES → AHORA» ni
  la propagación por diferencia.
- `BASE_PCT_SOBRE_COSTO` (=12) se conserva como valor inicial de ambos %.
- Los `data-q` de los 4 campos (costoCont, costoCred, baseCont, baseCred) y el estado `form`.
- La base de datos.

## 3. Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arneses: `test_precio_adicional` (el atajo % ahora se aplica por columna, botón
  `data-basepct="cred"`), `test_base_pct`, `test_piladoras_costos`, `test_piladoras_web`.
- En pantalla (Sistema Web y app del dueño): contado y crédito quedan separados con sus
  encabezados; los campos se ven angostos; hay dos % editables y cambiar uno recalcula solo
  su Base sin afectar al otro.

## 4. Trampas conocidas

- El editor existe en las DOS apps (Sistema Web y freelance-completo) con estructuras
  distintas (single-editor con «adicional» vs. per-presentación), pero los 4 campos y el
  atajo % son iguales: el cambio se aplicó en ambas.
- Sólo se edita una marca/oferta a la vez (`edit`), así que un solo par de estados
  `pctCont`/`pctCred` a nivel de componente basta; se reinician a 12 al abrir cada editor.
- Los botones llevan `data-basepct="cont"`/`"cred"` (Sistema Web) para que el arnés distinga
  la columna; no quitar ese hook.
