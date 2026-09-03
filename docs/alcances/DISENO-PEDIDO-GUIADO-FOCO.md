# DISENO_PEDIDO_GUIADO (ajuste) · El resaltado va en el buscador, no en un recuadro

**Ancla:** `DISENO_PEDIDO_GUIADO`
**Archivo:** `sistema-web.html` · componente `PedidosWeb`, vista «armar» (Nuevo pedido)
**Versión:** b241 · CACHE `freelance-v353`

## 1. Qué se cambia y por qué

Los recuadros grandes con borde discontinuo («Empieza por el cliente», «Ahora el
proveedor», «Agrega otro producto de …») ocupaban media pantalla para repetir lo que la
barra de pasos ya dice, y señalaban hacia arriba en vez del sitio exacto de la acción.
**Se eliminan.** El resaltado se muda **al propio buscador del paso activo**: el campo
donde toca escribir (cliente, proveedor o producto) se enciende en verde con su halo. El
ojo va directo al lugar de la acción.

## 2. Cómo quedó

- `BuscadorPredictivo` gana un parámetro opcional `activo` (apagado por defecto). Cuando
  está encendido, el `<input>` lleva borde de 2px en `COLOR.teal` y un halo
  (`boxShadow` de 4px). Fórmula del borde: `(activo||abierto) ? 2 : 1` — así al abrir y
  escribir no parpadea.
- En el armador, cada buscador se enciende según el paso: `activo={pasoPed === "cliente"}`,
  `"proveedor"`, `"producto"`. Un solo buscador encendido a la vez (lo garantiza `pasoPed`).
- La columna izquierda queda **vacía** mientras falte cliente o proveedor (ni recuadro, ni
  texto). La barra de pasos y la lista de verificación de la derecha ya dicen en qué paso va.
- El conteo del carrito pasó al **rótulo** del paso producto: «Agrega otro producto · N en
  el pedido» (texto secundario, sin panel). La tarjeta que envuelve al buscador de producto
  adelgazó su `padding` de 22 a `16px 18px`.

## 3. Qué NO se tocó

- La barra de pasos, `pasoPed`, `numPaso` y los estados hecho/actual/disponible.
- El resaltado de los campos **Cantidad** y **Precio** (paso 4): ya usaba borde + halo sobre
  el campo mismo; intacto.
- Las **otras pantallas** que usan `BuscadorPredictivo`: como `activo` llega `undefined`,
  quedan exactamente igual (borde de 1px).
- La lista de verificación, la tarjeta de cupo, la condición del pedido y el chip de
  piladora fija. `valido`, precios, cupo, comisiones, autorización y el guardado.
- La base de datos (Supabase): nada.

## 4. Cómo verificar

- Local: `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arneses clave: `test_pedido_guiado.js` (28 casos, reescrito para el nuevo resaltado),
  `test_pedido_cupo`, `test_pedido_condicion`, `test_paridad_cupo_web`,
  `test_paridad_conv_web`, `test_cambios_422`, `ARNES_SECCIONES_WEB PedidosWeb`.
- En pantalla, en **Pedidos → Nuevo pedido**: sin cliente, el buscador de cliente está
  resaltado en verde y no hay recuadros; al elegir cliente, se resalta el de proveedor y la
  columna izquierda queda vacía; al elegir proveedor, se resalta el de producto. Con carrito
  lleno, el rótulo dice «Agrega otro producto · N en el pedido».

## 5. Trampas conocidas

- El halo va con `boxShadow`, **no** con `outline` (el outline es el foco de teclado del
  navegador, no se pisa).
- La fórmula del borde usa `(activo||abierto)` a propósito: si `activo` quedara fuera, al
  escribir el borde saltaría de 2px a 1px y parpadearía.
- `recuadroGuia` se borró por completo (uso **y** definición): no dejar la función huérfana.
- La columna izquierda vacía no colapsa la rejilla: `gridTemplateColumns` sigue en
  «1fr 420px» y el `<div minWidth:0>` de la izquierda se mantiene aunque su contenido sea null.
- Cliente bloqueado conserva su aviso rojo arriba; la izquierda queda vacía igual.
