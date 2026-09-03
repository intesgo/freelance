# Alcance · DISENO_PEDIDO_CONDICION — la condición del pedido, a la vista

> Archivo: `sistema-web.html` · componente `PedidosWeb`, vista «armar».
> Solo PRESENTACIÓN. No se toca la lógica de crédito/contado ni permisos.
> Supabase no se toca.

## Qué se cambia y por qué

Al armar un pedido no quedaba claro si el pedido iba a **contado**, a **crédito**
o **mixto** (líneas de las dos clases). Ahora se ve de un vistazo:

- **Chip de condición** del pedido: «Contado», «Crédito» o «Mixto», derivado del
  carrito (`condPedido`).
- Cuando es **mixto**, un pequeño explicador dice que el pedido lleva líneas a
  crédito y a contado.
- **Condición por línea** visible en cada renglón del carrito (`l.cond`).
- Renglón **«A contado (no toca el cupo)»** en la tarjeta de cupo, para separar lo
  que consume cupo de lo que no.

## Archivos y puntos

- `sistema-web.html`, `PedidosWeb` (ancla `DISENO_PEDIDO_CONDICION`):
  - Derivados: `nCredito`, `nContado`, `contadoEnCarritoWeb`, `condPedido`
    (`vacio` / `contado` / `credito` / `mixto`), `hayPorAutorizar`.
  - Chip de condición y explicador del mixto en la cabecera del carrito.
  - Condición por línea usando `l.cond` / `l.credito`.
  - Renglón «A contado» en la tarjeta de cupo (compartido con DISENO_PEDIDO_CUPO).

## Qué NO se toca

- La clase de cada línea (`credito`/`cond`) la sigue fijando el tipo de precio;
  aquí solo se **muestra**.
- Cupo, comisión, autorización y permisos quedan igual.
- Colores por tokens `COLOR.*`.

## Cómo verificar

```bash
node scripts/compilar.js
node pruebas/test_pedido_condicion.js sistema-web.html
node pruebas/pruebas.js rapido
```

En el navegador: arma una línea a crédito y otra a contado → el chip dice
«Mixto» y sale el explicador; con todas a contado dice «Contado» y no aparece el
renglón de cupo a crédito de más.

## Trampas conocidas

- `condPedido` es derivado del carrito, no un `useState`.
- El texto del recuadro mixto lleva mayúscula inicial («Se registrará…»): las
  pruebas usan regex tolerante a mayúsculas.
