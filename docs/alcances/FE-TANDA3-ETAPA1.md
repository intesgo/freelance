# Alcance · FE_TANDA3 · Etapa 1 — Estibadores tarifa por ZONA + tarifas solo-lectura

> `sistema-web.html` · `TarifasFEWeb`. **Solo front, solo consume la base** (la migración
> `fe_rediseno_tanda2_multizona_convenio` ya está aplicada por Cowork). No toca la base.
> El modal de despacho rediseñado (parte C) es la **Etapa 2** (envío aparte).

## Qué se cambió (Etapa 1)

### A) Estibadores · tarifa POR ZONA (como Chóferes)
- Antes el estibador guardaba **una sola** tarifa de estibada (`zona_id` nula). Ahora guarda una tarifa
  **por zona**, igual que el flete del chofer: combo `{concepto:"estibada", ambito:"persona",
  persona_id:est_id, zona_id:z.zona_id}`, con el **mismo versionado** (`guardarFila`/`guardarTarifa`:
  si la vigente es de hoy, actualiza; si no, cierra e inserta).
- `cargarEstibadores` ahora lee `tarifas_fe` **sin** `.is("zona_id",null)` y arma
  `tarEst = { est_id: { zona_id: valor } }`.
- La tarjeta del estibador es igual a la del chofer: botón «Tarifa por zona» que despliega la lista de
  zonas activas, cada una con su estibada $/qq (Editar / Guardar / Historial por zona).
- **Mejora de criterio (§9):** el panel `abierto` ahora se mantiene abierto también **mientras se edita
  una zona** (antes el estado `editando` de la zona cerraba el panel). Se aplicó la misma corrección al
  panel de **Chóferes** para que ambos se comporten igual y la edición por zona sea usable.

### B) Tarifas en SOLO LECTURA para quien no es freelance
- La base ya bloquea el insert/update de `tarifas_fe` a quien no sea freelance (RLS
  `p_tarifas_leer/ins/upd/del`). En el front, si `usuario.rol` no es freelance (comparación
  insensible a mayúsculas), el módulo entra en **modo solo lectura**: se ocultan «Agregar chofer /
  estibador», «Ocultar/Reactivar» y «Editar»; se conservan los valores y el **Historial**. Un aviso
  «👁 Solo lectura» lo explica. Así logística ve las tarifas sin toparse con el error de permiso.

## Qué NO se tocó
La base, el versionado FE-01, las pestañas Chóferes/Estibadores en lo demás, el alta de chofer
(cuentas-equipo) y de estibador, el módulo de despacho (Etapa 2), los pagos del viaje, permisos ni
reglas de negocio.

## Cómo verificar
1. `node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde.
2. En el celular: en «Tarifas de logística», un estibador tiene «Tarifa por zona» (como el chofer) y se
   puede fijar su estibada $/qq por cada zona. Con rol logística, las tarifas se **ven** (valores +
   historial) pero **no** hay botones de editar; sale el aviso de solo lectura.

## Trampas conocidas
- `soloLectura` es una barrera de UI para no chocar con RLS; la base es la que realmente protege la
  escritura. No cambia permisos.
- Sin tarifas por zona cargadas, el estibador muestra «Sin tarifa por zona» y las zonas en «—»; es lo
  esperado hasta que el freelance las cargue (esto es lo que esta Etapa 1 habilita, y lo que el despacho
  de la Etapa 2 necesitará para no calcular 0 = `pendiente_tarifa`).

## Pendiente (Etapa 2 · el modal de despacho)
Reescribir el modal «Despachar» con dos botones (Transportista / Estibador(es)), chips de zona con qq,
flete por tramos, 1 ó 2 estibadores, ajuste por convenio («por autorizar»), resumen y el nuevo
`p_asignacion` (jsonb) a `despachar_ruta` (7º parámetro), quitando la llamada previa a
`asignar_estibador_ruta`. Antes de construirlo hay que verificar de punta a punta que la ruta trae
ciudad/qq por pedido (o cargarlos de `pedidos`+`ruta_pedidos`) y las lecturas de zona/tarifa; si falta
un dato en la base, PARAR y avisar (§9).
