# Alcance · FIX DISENO_LOGISTICA_QQ_RECORTADO — Orden de entrega / Despacho respetan el qq recortado

> Archivo: `sistema-web.html` · componente `TrazabilidadWeb`. **SOLO FRONT** (la base ya es correcta).

## Qué se cambia y por qué

Cuando armas una ruta y dejas un producto fuera con los casilleros, la base guarda y usa
bien lo recortado (`ruta_pedidos.qq_planificado`, `items_excluidos`; `despachar_ruta` arma la
guía con `qq_planificado`). El **bug** era que el front **no traía ese dato** y recomponía el
qq desde el pedido completo, así que «Orden de entrega» y «Despacho» mostraban la cantidad
entera (p. ej. 73) en vez de la recortada (60). Ahora el front trae lo planificado y lo usa.

## Puntos exactos

1. **`recargarRutas`** (~L2643): el sub-select de `ruta_pedidos` pasó de
   `…,estado_asignacion)` a `…,estado_asignacion,qq_planificado,items_excluidos)`.
2. **`mapRutaViva`** (~L2623): expone un mapa por pedido:
   `qqPlan: Object.fromEntries(rp.map(x => [x.ped_id, x.qq_planificado==null?null:Number(x.qq_planificado)]))`.
3. **Helper `qqRutaPed`** (junto a `qqRuta`): `const qqRutaPed = (r,p) => (r.qqPlan && r.qqPlan[p.id]!=null) ? r.qqPlan[p.id] : logQQ(p);`
   (si la ruta no lo trae —rutas viejas— se cae a `logQQ`).
4. **Usos del qq POR PEDIDO** de una ruta armada:
   - «Orden de entrega» (fila del pedido): `logQQ(p)` → `qqRutaPed(r, p)`.
   - «Detalle de ruta» (fila del pedido): `logQQ(p)` → `qqRutaPed(r, p)`.
5. **`qqRuta(r)`**: suma `qqRutaPed(r,p)` en vez de `logQQ(p)`; el fallback a `r.qq` (qq_total)
   cubre las rutas ya despachadas. Esto corrige de una: **total de la ruta, tablas de
   Despacho/Rutas, el modal de despacho y el chequeo de capacidad del vehículo** (todos pasan
   por `qqRuta`).

## Qué NO se toca

- La base, `crear_ruta`/`despachar_ruta`, permisos ni el flujo. Solo **traer el dato y usarlo**.
- El qq de «Escoger pedidos» (pedidos completos aún no en ruta) y el picker «Agregar pedido»
  (disponibles) siguen con `logQQ`/`qqPlan` de esa pantalla: ahí el pedido va entero.

## Cómo verificar

1. `node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde
   (guardas `DISENO_LOGISTICA_QQ_RECORTADO` en `test_cambios_422.js`).
2. En vivo: armar una ruta excluyendo un producto → «Orden de entrega» y «Despacho» muestran
   la cantidad recortada (60), no la completa (73), igual que «Irá a despacho».

## Trampas conocidas

- `qq_planificado` puede venir `null` en rutas viejas (antes del despacho parcial): `qqRutaPed`
  cae a `logQQ` en ese caso, y `qqRuta` cae a `r.qq` (qq_total) si la suma da 0 (ruta despachada
  cuyos pedidos ya no están en la lista local).
