# PEDIDOS P2-6 · Arreglos del aplicativo (freelance-completo.html)

Solo frontend (`freelance-completo.html`); la base NO se toca. Al publicar: subir
`VERSION` (app) + `CACHE` (`sw.js`) y verificar el deploy.

Nota: las líneas de referencia son del commit de auditoría (fe730c8, v456) y el
código ya avanzó a v460+. Ubicar cada punto por su patrón/ancla, no por el número.
Verificar si alguno ya quedó resuelto por el canon P1/P2 o el P5; si ya está, marcar y seguir.

## 1) Estado optimista con varias filas del mismo pedido (H6)
- Al guardar un pedido con varias líneas, el push optimista crea una entrada por
  producto con el mismo `ped_id` (`guardarPedido` / `offlineId` / `r.pedId`, ~L25712-25743).
  Quedan tarjetas repetidas hasta el próximo refresco.
- Arreglo: UNA sola entrada por pedido (agrupada, como `vivoPedidos`) y llamar a
  `recargarPedidos` al confirmar el guardado. La base ya queda bien; esto es solo el estado local.
- Ancla `/* PED_OPTIMISTA */`.

## 2) Detalle muestra 1er producto + total + promedio (H7)
- El detalle pinta una sola línea con el primer producto, la cantidad total y un
  precio promedio (render del detalle del pedido, ~L11958-11963). El desglose real
  ya existe en `p.lineas` (~L18841).
- Arreglo: iterar `p.lineas` y mostrar TODAS las líneas (producto, presentación, cantidad, precio).
- Ancla `/* PED_DETALLE_LINEAS */`.

## 3) Condición local derivada del nombre, no del valor (H8)
- En el push optimista se hace `const credito = /créd/i.test(it.tipoNombre)` (~L25713).
  En una línea a crédito por promo (P3/P4) la etiqueta local puede salir "Contado".
- Arreglo: derivar la condición del valor real (`it.credito`), no del texto del nombre.
  No cambia el payload ni lo que se guarda; solo la etiqueta local.
- Ancla `/* PED_COND_REAL */`.

## 4) Búsqueda por proveedor no tokeniza (H9)
- El filtro de pedidos tokeniza el cliente y hace AND, pero el proveedor usa
  `norm(p.prov).includes(t)` con la cadena completa (~L11302). "molinos litoral"
  no encuentra "Molinos del Litoral".
- Arreglo: tokenizar y hacer AND igual que con cliente:
  `t.split(/\s+/).filter(Boolean).every(w => norm(p.prov).includes(w))`.
- Ancla `/* PED_BUSCA_PROV */`.

## NO tocar
Precio/comisión, `registrar/editar_pedido_atomico`, ni la lógica de permisos.

## Criterio de aceptación
- Guardar un pedido de 3 productos muestra 1 sola tarjeta (no 3) sin refrescar.
- El detalle de ese pedido muestra las 3 líneas con sus cantidades y precios.
- Un pedido a crédito por promo muestra "Crédito" en la lista local.
- Buscar "molinos litoral" encuentra "Molinos del Litoral".

## Entrega
Dejar las anclas indicadas. Ajustar/añadir pruebas de comportamiento donde aplique.
Validar, publicar (VERSION + CACHE), verificar deploy y avisar para probar en el celular.
