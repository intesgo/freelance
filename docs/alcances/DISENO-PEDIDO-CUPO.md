# Alcance · DISENO_PEDIDO_CUPO — la tarjeta de cupo del armador (rediseño)

> Archivo: `sistema-web.html` · componente `PedidosWeb`, vista «armar».
> Solo PRESENTACIÓN del cupo. No se toca la regla de negocio (`excedeCupo`,
> `requiereAutorizacion`). Supabase no se toca.

## Qué se cambia y por qué

La tarjeta de crédito/cupo del armador mostraba cifras que no cuadraban con el
chip del encabezado y podía apagarse o pintar en rojo un simple «te pasas». Se
rediseña para que:

- **Cuente solo el crédito.** Lo que la línea o el carrito lleven a **contado**
  NO consume cupo (`cupoEstePedido = creditoEnCarritoWeb + exponeCupo`,
  **sin** `totalCarrito`).
- **Siga visible** aunque la línea en curso sea a contado, mientras el cliente
  tenga cupo (`cupoTotal>0`).
- **Una sola cifra disponible**, la misma que el chip del encabezado
  (`disponibleCupo = max(0, cupoTotal − cupoUsado − cupoEstePedido)`).
- El **exceso** se muestra en **ámbar** («Se pasa del cupo por …», estado
  `excedido`), **no en rojo**: pasarse **no bloquea**, va a autorización.
- Se conserva la marca **«POR AUTORIZAR»** aunque la comisión sea 0.
- El botón **«Subir»** avisa (no bloquea) cuando hay exceso.

## Archivos y puntos

- `sistema-web.html`, `PedidosWeb`:
  - Bloque centralizado (ancla `DISENO_PEDIDO_CUPO`): `cupoTotal`, `cupoUsado`,
    `cupoEstePedido`, `disponibleCupo`, `cupoExceso`, `cupoEstado`
    (`sincupo` / `holgado` / `ajustado` / `excedido`). Reemplaza el `disponibleCupo`
    muerto anterior.
  - Tarjeta de cupo reescrita como barra segmentada que lee esas variables; el
    sello del exceso en ámbar; renglón «A contado (no toca el cupo)» con
    `contadoEnCarritoWeb`.
  - `cupoExceso>0` (lo que se **muestra**) es a propósito más amplio que
    `excedeCupo` (autorización por línea): esa divergencia ES el arreglo del
    defecto.

## Qué NO se toca

- `excedeCupo` y `requiereAutorizacion` (negocio) quedan igual: solo se cambia
  cómo se ve el cupo.
- No se bloquea nunca por pasarse; el botón sigue habilitado.
- Colores: se usan tokens `COLOR.*` (nada de hex a mano; el guard de
  `test_cambios_422.js` rechaza literales).

## Cómo verificar

```bash
node scripts/compilar.js
node pruebas/test_pedido_cupo.js sistema-web.html
node pruebas/test_paridad_cupo_web.js sistema-web.html
node pruebas/pruebas.js rapido
```

En el navegador: arma una línea a crédito que pase el cupo → la tarjeta queda en
ámbar «Se pasa del cupo por …», el disponible coincide con el chip de arriba, y
al pasar la línea a contado la tarjeta **no se apaga**. «Subir» avisa pero deja.

## Trampas conocidas

- El contado NO debe entrar en `cupoEstePedido` (si entra, vuelve el defecto).
- El disponible de la tarjeta y el del chip del encabezado deben ser la misma
  fórmula (una sola verdad).
- `cupoExceso` (display) ≠ `excedeCupo` (autorización): no unificarlos.
