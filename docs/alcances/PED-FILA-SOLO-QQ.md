# PED · «Pedidos por facturar»: la fila muestra solo fecha + quintales (sin el total en $)

Solo UI (`proveedor-freelance.html`, componente `FACTURAR`). Ancla `/* PED_FILA_SOLO_QQ */`. NO se
tocó ningún cálculo ni lógica.

## Qué se hizo
En la lista «Pedidos por facturar», la segunda línea de cada fila mostraba `{p.fecha} · {money(p.monto)}`.
Se quitó el monto en dólares: ahora la fila muestra **solo la fecha**. Los quintales siguen en la primera
línea (`p.detalle`, ej. «Arroz Flor · 120 qq · contado»), intactos.

## Qué NO se toca
- `p.detalle` ni el cálculo de `p.monto` (solo se deja de mostrar en la fila; el monto sigue disponible
  en el detalle/factura del pedido).
- Ninguna otra pantalla ni app.

## Cómo verificar
- `node pruebas/pruebas.js rapido` en verde.
- En el celular (rol proveedor/piladora): «Pedidos por facturar» → cada fila muestra fecha + quintales,
  sin el «· $x». Al abrir el detalle/factura, el monto sigue estando.

## Versiones
Proveedor **v69**, caché **freelance-v288**.

## Trampas conocidas
- Es un cambio de una sola línea; `p.monto` se conserva en el objeto de la fila para el detalle/factura.
