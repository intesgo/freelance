# Proveedor · no mostrar al facturar las líneas excluidas de la ruta (CAMBIO C)

`proveedor-freelance.html`, loader `vivoDecidir` (sección «Pedidos por facturar» /
componente FACTURAR). Ancla `/* DISENO_LOGISTICA_DESPACHO_PARCIAL */`.
Es el complemento (envío aparte) de la sub-tanda de despacho parcial en el Sistema Web.
**Code no tocó la base** — solo LEE una columna más.

## Qué se hizo
Cuando el freelance arma la ruta y deja un producto fuera de despacho, ese producto queda
en `ruta_pedidos.items_excluidos`. La base **ya rechaza** facturar lo excluido; el problema
era solo visual: la piladora seguía viendo ese producto «fantasma» al facturar.

Ahora, al cargar los pedidos por facturar:
1. Se leen los `item_id` excluidos de la **ruta ACTIVA** de esos pedidos:
   `from("ruta_pedidos").select("ped_id,items_excluidos").in("ped_id",pedIds).eq("estado_asignacion","activo")`.
   Si el pedido no está en ninguna ruta activa → `items_excluidos = []` → se muestra todo como hoy.
2. Se arma `exclPorPed = { [ped_id]: Set(item_id) }`.
3. Al construir cada pedido, las líneas cuyo `item_id` esté excluido **se sacan de `its`**
   (opción preferida: no mostrarlas). Como qq, monto, detalle y `lineas` salen de `its`, el
   producto excluido **no aparece y no cuenta en el total** — sin tocar el cálculo ni el envío.

## Qué NO se tocó
- La base ni las RPC (solo se lee `ruta_pedidos.items_excluidos`; es un SELECT).
- El cálculo de facturación, la comisión, los permisos, ni el flujo de facturar.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Guard `test_ruta_excluidos_prov.js` (registrado en la batería): confirma que el loader lee
  `ruta_pedidos.items_excluidos` de la ruta activa (`estado_asignacion=activo`), arma el índice
  por pedido y **saca** esas líneas de `its`.
- `test_despacho_parcial.js` (facturar cantidades cortas) sigue verde: el cambio no lo afecta.
- En el celular: un pedido con un producto excluido en su ruta → al facturar, ese producto no
  aparece y el total no lo incluye.

## Versiones
Proveedor **v70**, caché **freelance-v295**.

## Trampas conocidas
- Se filtra por `estado_asignacion="activo"` para no esconder líneas por una ruta ya anulada.
- Los `item_id` se comparan como String en ambos lados (por si el tipo difiere).
- La regla del Sistema Web impide dejar un pedido sin ninguna línea incluida, así que un pedido
  en ruta activa siempre conserva ≥1 producto visible.
- En las pruebas, el SB de mentira devuelve `ruta_pedidos = []` → no filtra nada (conducta de hoy).
