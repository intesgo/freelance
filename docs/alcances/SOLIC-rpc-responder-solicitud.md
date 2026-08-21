# SOLIC · Cerrar el hueco de "solicitudes": usar responder_solicitud (3 apps)

Solo frontend. La base ya tiene `responder_solicitud(p_sol_id, p_aprueba, p_motivo, p_op_id)`,
que valida rol y destino (solo quien corresponde resuelve). Hoy las apps hacían UPDATE
directo a la tabla `solicitudes` (cualquier autenticado de la org podía resolver lo que no
le tocaba). Se cambia SOLO esa escritura genérica por el RPC.

## Qué se cambia (ancla `/* SOLIC_RPC */` en cada punto)
- **freelance-completo.html** · `responderSolicitud`: el bloque final (UPDATE directo) pasa
  a `rpc("responder_solicitud", …)`. El `if` de `anular_pedido` (que rutea a
  `resolver_anulacion_pedido`) se deja igual.
- **proveedor-freelance.html** · `responderSolicitud`: el cuerpo pasa a `rpc("responder_solicitud", …)`.
  La devolución se sigue ruteando aparte (`resolverDevolucion` → `resolver_devolucion`).
- **sistema-web.html** · `decidirEnBase` (genérica): rutea por tipo — `anular_pedido` va por
  `resolver_anulacion_pedido`; el resto por `responder_solicitud`. La web solo resuelve
  solicitudes entrantes (destino freelance); las devoluciones se elevan al proveedor.

## Qué NO se toca
- Permisos ni lógica de negocio; solo cambia QUIÉN escribe (antes UPDATE directo, ahora el RPC).
- El ruteo de `anular_pedido` (`resolver_anulacion_pedido`) y el de `devolucion`
  (`resolver_devolucion`): quedan igual.
- El `.insert` de solicitudes en la web y los `.select`: se quedan.
- El rechazo sigue exigiendo motivo (el RPC lo exige).
- La base (ya la trabajó Cowork).

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arnés `pruebas/test_solic_rpc.js`: 0 UPDATE directos, cada app usa el RPC, ruteo especial intacto.
- Grep `.from("solicitudes").update` en las 3 apps = 0 resultados.
- En el celular: aprobar/rechazar una solicitud normal (precio especial, cupo, permiso) desde
  freelance, proveedor y sistema-web sigue funcionando, ahora vía RPC. `anular_pedido` sigue
  anulando; la devolución del proveedor sigue igual.

## Versiones
Freelance v463, Proveedor v68, Sistema Web b177, caché `freelance-v272`.
(Comisionista y socio no crean/resuelven estas solicitudes por esta vía: no se tocan.)

## Trampas conocidas
- La web tiene DOS payloads/escrituras de `solicitudes`: el `.insert` (alta) se queda; solo
  cambia la resolución (`decidirEnBase`).
- `decidirEnBase` es genérica (la usan aprobar y confirmarRechazo): por eso rutea por `tipo`.
