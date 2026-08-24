# Alcance · PED_FE_002 (Tanda 2) — Pedidos (Sistema Web) dice la verdad de la carga

> `sistema-web.html` · componente `PedidosWeb` · `cargarPedidosVivos`. **Solo front, solo lectura.**
> No toca base, permisos ni RPC.

## Qué se cambió

1. **Estados de carga / error / sesión / vacío + «Reintentar».**
   - Estados nuevos: `cargandoPed`, `errorPed ({tipo,msg}|null)`, `cargandoMas`, `hayMasPed`,
     `conteosPed`, `actualizadoPed`.
   - Sin sesión (en vivo): ya **no** hay `return` en silencio → `errorPed={tipo:'sesion'}`.
   - `catch`: se conserva `registrarErrorWeb` (auditoría) **y** se marca `errorPed` (conexión).
   - El cuerpo de la lista tiene estados **excluyentes**: «Cargando pedidos…» · error + «Reintentar» ·
     vacío («No hay pedidos con estos filtros» / «Aún no hay pedidos») · la lista. Un fallo de
     conexión/permiso/sesión **no** se muestra como un falso «0 pedidos».

2. **FIX del vaciado.** Se quitó la condición `!it.length`: un pedido **sin líneas** sigue siendo un
   pedido y se muestra. La lista depende solo de que haya pedidos, no de que traiga ítems.

3. **`pedido_items` por `ped_id`.** Las líneas se traen con `.in("ped_id", <ped_ids de la página>)`
   en vez de un `.limit(1000)` suelto: el detalle siempre completo para lo que se muestra.

4. **Conteos reales por pestaña.** Consulta liviana aparte
   (`select("ped_id,estado,estado_logistico,es_demo")`, sin joins ni items), clasificada con la
   **misma** lógica canónica de la lista (`clasificarTabPed`, compartida con `tabDePed`). Los números
   de pestaña reflejan el TOTAL real, no lo cargado. (Tope de seguridad 5000; a gran escala real sería
   una vista/RPC de conteo en base — Cowork, no Code.)

5. **«Ver más» de servidor (paginación real con `.range`).** Se lee de a página (`PAG_PED_WEB = 100`)
   con `.order("creado",{ascending:false}).range(desde,hasta)`. «Ver más» pide la siguiente página al
   servidor y la **agrega** (sin duplicar por `ped_id`); el indicador «hay más» sale si la página vino
   llena. Cada página trae sus ítems por `ped_id`. No se descarga toda la base. (La búsqueda filtrada
   de servidor es PED-FE-003.)

6. **«Actualizar» + «Actualizado a las HH:MM» (hora EC) + recarga por visibilidad.** Botón «Actualizar»
   que recarga lista + conteos (`refrescarPedidos`), con la hora de la última carga (`horaECWeb`). Al
   recuperar la pestaña del navegador (`visibilitychange`) se recarga solo. Realtime **no** en esta tanda.

## Qué NO se tocó (bloque «no rehacer»)

El modal de solo lectura, la edición (RPC `editar_pedido_atomico`), «sin fallback demo», la
clasificación por código de la Tanda 1 (`tabDePed`/`colorEstado`/pestañas), una fila por pedido, el
nombre en MAYÚSCULAS, permisos, negocio, base ni RPC. El ordenamiento es sobre lo ya cargado
(client-side) y ya no reinicia paginación.

## Cómo verificar

1. `node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde.
2. Negativos en `test_pedidos_carga_web.js` (PED_FE_002): error de conexión → aviso + «Reintentar»
   (no un falso «0 pedidos»); un pedido sin líneas se muestra; el conteo de la pestaña es el total real
   (150, no lo cargado 100); «Ver más» trae la siguiente página del servidor. Arneses de la pantalla
   ajustados en el mismo cambio: `test_estados_paridad_web` (montaje lee «pedidos» dos veces: lista +
   conteos; mutante de recarga usa `refrescarPedidos`), `test_cambios_422` (rótulo del contador admite
   el «de N» del total), y versión/caché (b202 / v306) en los cinco arneses atados a versión.
3. En vivo: al abrir Pedidos sale «Cargando…»; con la base caída sale el aviso + «Reintentar»; los
   números de pestaña cuadran con el total; «Ver más» agrega otra tanda; «Actualizar» refresca y
   muestra la hora.

## Trampas conocidas

- La consulta de **conteo** y la de **display** usan los MISMOS filtros base (hoy: ninguno más allá del
  orden), para que los números cuadren con las filas.
- El conteo a gran escala sin traer filas es tarea de **base** (vista/RPC · Cowork), no de Code; aquí se
  lee liviano con tope 5000.
- Cada página trae SUS ítems por `ped_id` (`.in`), no un `.limit` suelto.
- Con paginación de servidor, una pestaña puede tener conteo > 0 y 0 filas cargadas: se avisa «hay N que
  aún no se han cargado» + «Ver más», nunca un falso «no hay pedidos con estos filtros».
- El encabezado (contador + «Actualizar» + «Nuevo pedido») es chrome siempre visible; los estados
  excluyentes (cargando/error/vacío/lista) viven en el **cuerpo** de la lista.
