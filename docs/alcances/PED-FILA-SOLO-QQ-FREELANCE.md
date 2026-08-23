# PED · Lista de Pedidos (app Freelance): la fila muestra solo quintales (sin el total en $)

Solo UI (`freelance-completo.html`). Ancla `/* PED_FILA_SOLO_QQ */`. NO se tocó ningún cálculo.

## Problema / qué se hizo
En la Lista de Pedidos (pestañas Pendientes / En camino / Entregados) el render de cada fila es
único (`visibles.map`) y sirve a las 3 pestañas. La mitad derecha mostraba `{p.cant} qq` + el total
en dólares `{money(monto)}` + la flecha `›`. Se **eliminó el span del monto**: ahora la fila muestra
solo los quintales y la flecha. Con eso el dólar desaparece en las 3 pestañas a la vez.

La variable `monto = montoDePedido(p)` se conserva (por si se usa aparte); solo se dejó de pintar en
la fila. El monto sigue disponible en el detalle del pedido.

## Qué NO se toca
- `montoDePedido(p)` ni ningún cálculo; solo se retira del render de la fila.
- Ninguna otra pantalla ni app (el mismo span solo existe en freelance-completo).

## Cómo verificar
- `node pruebas/pruebas.js rapido` en verde.
- En el celular (app Freelance): Pedidos → en Pendientes, En camino y Entregados cada fila muestra
  «N qq» y la flecha, sin el «$». Al abrir el detalle del pedido, el monto sigue estando.

## Versiones
Freelance **v470**, caché **freelance-v290**.

## Trampas conocidas
- Es un render compartido por las 3 pestañas: quitar el span una vez las afecta a las tres (lo buscado).
- `monto` queda declarada aunque ya no se muestre en la fila; no se elimina para no romper otros usos.
