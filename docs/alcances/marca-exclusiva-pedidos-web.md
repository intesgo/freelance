# Alcance · Sistema Web · Pedidos respeta la marca exclusiva por cliente

## 1. Qué se cambia y por qué (una línea, negocio)
En el Sistema Web, el módulo **Pedidos** armaba la lista de productos filtrando **solo por
proveedor**: nunca consultaba `marca_clientes`, así que ofrecía marcas exclusivas de un
cliente a cualquier otro (p. ej. Arroz Crecedor —exclusivo de CLI-036 Pedro/Supermercado
Castillo— aparecía para Abad Mendieta). Las apps móviles ya lo aplican; el web quedó sin
el filtro. **Prioridad ALTA** (deja vender una marca propia a otro cliente).

## 2. Regla (ya vigente)
La exclusividad la manda el vínculo en `marca_clientes`: si un `prod_id` está ahí, **solo**
es visible para esos `cli_id`; si no está, es normal (visible para todos).

## 3. Qué se cambió (sistema-web.html, módulo Pedidos)
- **Helper y mapa** (antes de `function PedidosWeb`, mismo criterio que Comisionista ≈4821):
  `const EXCLUSIVA_DE = {}` + `marcaVisibleParaCli(prodId, cliId)` (sin dueños → visible;
  con dueños → solo si es su cliente).
- **Carga del mapa** junto al catálogo de Pedidos: se agregó
  `window.supa.from("marca_clientes").select("prod_id,cli_id")` al `Promise.all` del efecto
  que arma el catálogo, y se reconstruye `EXCLUSIVA_DE` (prod_id → Set de cli_id) en cada
  carga. **Defensivo:** si la consulta falla (`mc` null), el mapa queda **vacío** y todo se
  comporta normal (nadie pierde una venta por un fallo de red).
- **Filtro** en `productosDelProv` (≈6496): además del proveedor, se cuela por el **cliente
  elegido** (`cli`): `PRODS_PED.filter(p => p.prov===provSel && marcaVisibleParaCli(p.prodId, cli && cli.id))`.
  El `BuscadorPredictivo` y los «favoritos» usan `productosDelProv`, así que con filtrar ahí
  quedan cubiertos. Ancla: `MARCA_EXCLUSIVA_WEB`.

## 4. Qué NO se tocó
- La base ni la pantalla de administrar **Marcas** (esa ya escribe bien `marca_clientes`; el
  segundo `productosDelProv` ≈7901 es de esa pantalla de admin y **no** se tocó).
- El filtro por proveedor ni el camino demo (en demo no hay `marca_clientes` real; el mapa
  queda vacío y no oculta nada, a propósito).
- No hay módulo de Cotización en el Sistema Web (esa función es del móvil); Pedidos es la
  única pantalla web que ofrece productos a un cliente concreto.

## 5. Cómo verificar (en modo REAL, con sesión, NO demo)
- Cliente Abad Mendieta (u otro) → Arroz Crecedor **NO** debe aparecer.
- Cliente Supermercado Castillo (CLI-036) → Arroz Crecedor **SÍ** aparece.
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde
  (116 ✓). `test_marca_exclusiva.js` ahora cubre también el Sistema Web (declara EXCLUSIVA_DE
  + helper, carga con `.select`, filtra por `cli && cli.id`, y corre la lógica con mutante).
- VERSION Sistema Web **b219** + CACHE **v329**; arneses de versión al día
  (test_cambios_419/422, test_fe01, test_fe03).

## 6. Trampas conocidas
- Probar en **modo REAL**: en «Modo demostración» el catálogo es de mentira y no refleja
  `marca_clientes`; ahí el filtro no oculta nada, a propósito.
- El Sistema Web **sí** escribe `marca_clientes` (pantalla Marcas), así que el chequeo de
  «solo lee» del arnés se mantiene **solo para las apps del vendedor**, no para el web.
- El filtro va sobre `p.prodId` (el producto), no `p.id` (producto+presentación), para
  esconder todas las presentaciones de la marca exclusiva.
