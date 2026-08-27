# Alcance · Front del flujo de "excepción de crédito" (P0-c)

La base ya tiene el P0-c aplicado (migración `ped_p0c_controles_credito_ingreso_y_aprobacion`).
**Code no toca la base:** solo el front.

## Qué hace la base (contexto)

Al ingresar un pedido: (a) **rechaza** si el cliente tiene facturas vencidas (regla dura,
error con mensaje claro); (b) por cupo / máx. facturas / cheque protestado deja el pedido en
`esperando_aprobacion` y crea una **solicitud** `tipo='excepcion_credito'`, `destino='proveedor'`,
ligada al `ped_id`; al aprobarla el proveedor, `responder_solicitud` mueve el pedido solo
(→ `enviado_proveedor`, o → `ingresado` si tiene P5 / la piladora no tiene pago habitual).

## Qué se cambia en el front

### `proveedor-freelance.html`
- **a)** Etiqueta del tipo nuevo en `TIPO_SOL_PROV`: `excepcion_credito:"🔐 Autorización de crédito"`.
- **b)** `aprobarSol` / `confirmarRechazo`: para lo que no es devolución, **esperar el resultado REAL**
  del RPC antes de pintar (patrón que ya usa la devolución): `setRespondiendo` → `await
  responderSolicitud(...)` → si falla, avisar y no pintar; si sale bien, recién pintar. En demo se
  pinta optimista. Importa porque al aprobar una `excepcion_credito` la base mueve el pedido.
- **c)** Texto del botón: para `excepcion_credito` dice **"Autorizar crédito ✓"**.

### Apps de venta (`Comisionista.html`, `socio-comercial.html`, `freelance-completo.html`)
Cuando `registrar_pedido_atomico` rechaza por vencidas, llega como error del RPC
(`guardarPedidoEnBase → {ok:false, motivo}`). Ahora `guardarPedidoEnBase` marca `reglaNegocio:true`
cuando el mensaje trae "vencid…". El front, ante ese bloqueo duro: **muestra el motivo claro** y
**NO lo deja encolado/guardado** (nunca subiría):
- Comisionista: quita la tarjeta optimista (`nuevos`) y avisa `⛔ <motivo>`.
- socio: espera el RPC; si es regla de negocio, avisa y **no encola** (`colaAgregar`) ni cierra como
  "guardado".
- freelance: rama nueva que quita la tarjeta optimista (`offlineId`), avisa claro y **no encola**.

## Qué NO se toca
La base ni permisos ni RLS. El flujo de devolución (ya correcto) ni las demás solicitudes. El camino
demo. La app del proveedor sigue filtrando por `destino='proveedor'` y su `prov_cod`.

## Versión y caché
proveedor 72→73, Comisionista 194→195, socio 61→62, freelance 478→479, `sw.js` CACHE v324→v325.
Arneses de versión ajustados (`test_cambios_419`, `test_cambios_422` —valida las 4 apps—,
`test_fe01_tarifas`, `test_fe03_pagos`). `test_solic_rpc` sigue en verde (se mantiene el RPC
`responder_solicitud` y `resolver_devolucion`).

## Cómo verificar
`node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde. En el celular: con el proveedor
de San Agustín, crear desde el freelance un pedido que pase el cupo → queda "esperando aprobación" y le
llega al proveedor "🔐 Autorización de crédito"; al Autorizar, el pedido avanza. Un cliente con factura
vencida → el vendedor recibe el aviso claro y el pedido no se crea.

## Trampas conocidas
El pedido bloqueado por vencidas NO existe en la base: el front no debe mostrarlo como "guardado" (por
eso se quita la tarjeta optimista y no se encola). Publicar VERSION + CACHE juntos y arneses al día.
