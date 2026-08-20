# PEDIDOS P0-1 · Edición web: convertir presentaciones a quintales (crítico)

Archivo: sistema-web.html · función guardarCambiosPedido (~L5864-5876) y agregarLinea (~L5757-5760).

Problema: al editar un pedido y agregar/cambiar un producto en arrobas/sacos, la web manda cantidad_qq:Number(l.cant) y precio_qq:Number(l.precio) CRUDOS al RPC editar_pedido_atomico, sin aplicar la equivalencia. Guarda quintales inflados (ej. 50 qq en vez de 12,5) y precio/qq mal. La app SÍ convierte (freelance-completo.html ~L25675-25677).

Cambio: replicar la conversión del aplicativo. Cada línea del carrito de edición debe conservar su equiv real (equiv_qq de la presentación, de PRODS_PED / o.equiv_qq), no 1. Al armar el payload de editar_pedido_atomico:
- cantidad_qq = cant × equiv
- precio_qq = precio / equiv
- gratis_qq = gratis × equiv
Las líneas existentes que se cargan ya en qq (construirLineaDesdeItem, unidad "qq", equiv 1) siguen igual; el fix aplica a las que están en presentación distinta de Quintal.

Criterio de aceptación: editar agregando 50 arrobas a $10/arroba (equiv 0,25) guarda 12,5 qq y $40/qq — idéntico a la app.

Deja ancla /* PED_FIX_CONV_WEB */. Valida, publica (VERSION + CACHE del sw), verifica deploy y avísame para probar en el celular.
