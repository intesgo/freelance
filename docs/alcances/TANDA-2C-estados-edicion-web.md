# TANDA 2C · Editar pedido en la web con los mismos estados que la app

Solo frontend (`sistema-web.html`). NO tocar base/RPC/RLS. Ancla `/* PED_ESTADOS_PARIDAD */`.
Preservar las correcciones previas (incluidas PED_SIN_FALLBACK_DEMO y PED_CUPO_VIVO_PARIDAD).

## Problema (divergencia real entre canales)
El RPC `editar_pedido_atomico` permite editar en `ingresado`, `esperando_aprobacion` y
`enviado_proveedor`. La app también (su lista de EDITABLES incluye "Enviado al proveedor").
La web NO: su función `editable` (L~5281) solo aceptaba `["ingresado","esperando_aprobacion"]`,
así que un pedido ya enviado al proveedor no se podía corregir desde la oficina aunque la
base sí lo permitía.

## Cambios
1. **Estados editables de la web** (L~5281): se agregó `enviado_proveedor` →
   `["ingresado","esperando_aprobacion","enviado_proveedor"].includes(pd.estado_comercial || pd.estado)`.
   A partir de `facturado` (y posteriores) sigue sin poder editarse, igual que hoy.
2. **Recarga tras editar / sin éxito falso:** `guardarCambiosPedido` ya se comportaba bien y
   se mantiene: en ÉXITO limpia el carrito, vuelve a la lista y hace `await cargarPedidosVivos()`
   (recarga desde Supabase, no se queda con la representación optimista). En FALLO del RPC lanza
   el error y muestra "No se pudo guardar…" sin pintar éxito ni modificar el pedido.
3. **Acciones por su RPC:** la web edita únicamente vía `editar_pedido_atomico`; no hay UPDATE
   directo a `pedidos` ni botones de aprobar/anular/revivir en la lista de pedidos de la web
   (las solicitudes ya se resuelven por `responder_solicitud`/`resolver_anulacion_pedido`, ver
   SOLIC_RPC). No se agregó ninguna acción nueva.

## Qué NO se toca
Base/RPC/RLS. La lógica de `guardarCambiosPedido` (ya recargaba y ya no confía en el optimista).
El resto de estados/vistas.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- `pruebas/test_estados_paridad_web.js` (nuevo, JSDOM): un pedido `enviado_proveedor` muestra el
  botón "Editar pedido"; un `facturado` no; tras un guardado exitoso la lista se recarga desde la
  fuente; si el RPC falla el pedido no cambia. Mutantes que caen: quitar `enviado_proveedor` de
  editables; dejar la edición en `facturado`; confiar en el optimista sin recargar.
- El guard de fuente en `test_cambios_422.js` confirma el ancla y el arreglo del `editable`.
- En el celular / la web: abrir un pedido en "Enviado al proveedor" y comprobar que ya se puede
  entrar a editar; un pedido "Facturado" no ofrece editar.

## Versiones
Sistema Web b180, caché `freelance-v275`.

## Trampas conocidas
- La lista solo muestra el botón "Editar pedido" cuando `p.editable && p.pedId && !p.demo`
  (L~6080): el arnés cruza la fila del cliente con la presencia del botón.
- `cargarPedidosVivos` deja la lista vacía si no hay pedidos O no hay `pedido_items`: al sembrar
  para pruebas hay que poblar ambas tablas con `ped_id` coincidente.
