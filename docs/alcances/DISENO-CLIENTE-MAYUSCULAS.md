# DISEÑO · Columna Cliente en mayúsculas (lista de Pedidos)

Solo estilo (`sistema-web.html`). Ancla `/* DISENO_CLIENTE_MAYUSCULAS */`. NO se tocó el dato en
la base ni la función que trae el nombre.

## Problema
En Pedidos → pestaña Pedidos, la columna Cliente mostraba unos nombres en MAYÚSCULAS
(«MARIA TELLO») y otros en formato normal («Dora Diaz»), según cómo se guardaron. Se veía
desprolijo.

## Qué se hizo
Al `<span>` del nombre del cliente en la cabecera de cada fila (`PedidosWeb`, vista lista) se le
agregó `textTransform:"uppercase"`. Es solo CSS: uniforma la vista a mayúsculas sin cambiar el
nombre guardado ni la función `nombreClientePedido(p)`.

## Qué NO se toca
- `nombreClientePedido(p)` ni el dato en Supabase (no se normaliza el nombre en la base).
- El `ChipDemo` («DEMO») queda igual.
- Ninguna otra pantalla ni columna.

## Cómo verificar
- `node pruebas/pruebas.js rapido` en verde (111).
- En la lista de Pedidos: «Dora Diaz» y «Pedro Castillo» se ven «DORA DIAZ» y «PEDRO CASTILLO»,
  igual que «MARIA TELLO».

## Versiones
Sistema Web **b187**, caché **freelance-v286**.

## Trampas conocidas
- Cuando se rediseñe la lista de Pedidos a la línea ERP, CONSERVAR este `textTransform:"uppercase"`
  en la columna Cliente.
