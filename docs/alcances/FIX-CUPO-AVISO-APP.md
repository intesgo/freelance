# Alcance · FIX_CUPO_AVISO_APP — el aviso de cupo que se apagaba solo

> Archivo: `Comisionista.html` · componente `Pedido`.
> Solo PRESENTACIÓN del aviso de cupo. No se toca ninguna regla de negocio
> (cupo, autorización, comisión, piso P5). Supabase no se toca.

## Qué se cambia y por qué

En la app del vendedor, la caja de cupo se pintaba mirando `excedeCupo`, que exige
que la **línea que se está armando** sea a crédito. Si el carrito ya se pasó del
cupo con líneas a crédito y luego el vendedor armaba una línea a **contado**, el
aviso (sello, color y recuadro) **desaparecía**, aunque el cupo siguiera pasado.
Además el exceso se pintaba en **rojo** («Excedido», clase `bad`), como si fuera
un error, cuando pasarse **no bloquea**: el pedido se toma y queda pendiente de
autorización del freelance.

Ahora:

- La caja se muestra y se pinta con variables **solo de presentación**
  (`cupoConsumido`, `cupoSePasa`, `cupoExcesoVer`, `cupoLibre`) que suman deuda +
  crédito del carrito + la línea en curso. `cupoSePasa` **no** exige que la línea
  en curso sea a crédito, así el aviso no se apaga al pasar a contado.
- El exceso va en **ámbar** (tokens `--maize` / `--maize-deep`) con el sello
  «Se pasa · por autorizar». Nunca «Excedido» ni la clase `bad` (que queda
  reservada, con `--clay`, para los errores que **sí** bloquean).
- El botón de agregar sigue **habilitado** al pasarse.

## Archivos y puntos

- `Comisionista.html`, `Pedido`:
  - Variables nuevas (`FIX_CUPO_AVISO_APP`) tras `excesoMonto`.
  - Caja de cupo: la condición externa pasa a `(esCredito || creditoEnCarrito>0)`
    para que no se apague al armar a contado; el sello, el arco, la barra, el
    renglón «Se pasa por / Disponible» y el recuadro usan `cupoSePasa` /
    `cupoConsumido` / `cupoExcesoVer` / `cupoLibre`; el sello es siempre `warn`.
  - CSS: `.cupo-box.cupo-excede` y `.cupo-excede .cupo-fill` pasan a `--maize` /
    `--maize-deep` (modo claro y oscuro).

## Qué NO se toca

- `excedeCupo`, `excesoMonto`, `requiereAutorizacion`: son NEGOCIO. Siguen
  alimentando `requiere` / `motivoAuth` de cada línea y el «con autorización» del
  botón. Quedan idénticos.
- `valido` (pasarse del cupo no bloquea), `esCredito`, `creditoEnCarrito`,
  `montoLinea`, `expuestoTotal`, `construirItem` y el payload de
  `registrar_pedido_atomico`.
- El texto del recuadro explicativo. El Sistema Web y las demás apps.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- `node pruebas/test_cupo_aviso_app.js Comisionista.html` (13 comprobaciones).
- `node pruebas/test_paridad_cupo_app.js` y `test_paridad_cupo_web.js`: la
  autorización no cambió.
- En el celular (claro y oscuro, 360–412 px): armar un pedido a crédito que se
  pase → sello ámbar «Se pasa · por autorizar»; agregarlo y armar una línea a
  contado → el aviso **sigue** visible.

## Trampas conocidas

- No «simplificar» borrando `excedeCupo` y usando `cupoSePasa` en todo:
  cambiaría qué líneas quedan por autorizar y rompería `test_paridad_cupo_app`.
  Son dos variables a propósito: una **decide**, la otra **pinta**.
- `montoLinea` ya vale 0 si la línea en curso no es a crédito: no volver a
  preguntar por `esCredito` al sumarlo.
- Colores solo con tokens: el archivo tiene modo claro y modo oscuro.
