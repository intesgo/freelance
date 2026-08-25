# Alcance · Marca exclusiva por cliente (`marca_clientes`)

Referencia de partida: `main` en commit **61ad54b** (al ejecutarse, main ya estaba en
`e764099` / v476; se parte de los números que quedaron: Comisionista 193→194,
socio-comercial 60→61, freelance-completo 476→477, sistema-web 214→215, CACHE v321→v322).

## Qué se cambia y por qué

Hay marcas que son de un cliente (marca propia). Ej. real: P-00011 «Arroz Comisariato El
Sitio». Hoy el Sistema Web deja marcarlas «Del Cliente» en el modal «Replicar en piladoras»,
pero eso solo pinta una etiqueta de color: guarda el TIPO de dueño en `productos.tipo_marca`,
no CUÁL cliente, ninguna app móvil lo lee y no filtra nada.

Se completa la idea: se dice de QUÉ cliente es, y esa marca deja de ofrecerse a los demás.

**REGLA ÚNICA:** si una marca tiene clientes en `marca_clientes`, solo aparece al tomar
pedido cuando el cliente elegido es uno de ellos. Si no tiene ninguno, se comporta como
siempre.

## La base ya existe (Code NO la toca)

Cowork creó la tabla `public.marca_clientes` el 25/08/2026 (migración
`marca_clientes_exclusividad`), con aprobación del dueño. Code solo hace SELECT / INSERT /
DELETE de filas desde la app.

```
public.marca_clientes
  prod_id text  -> productos(prod_id) ON DELETE CASCADE
  cli_id  text  -> clientes(cli_id)   ON DELETE CASCADE
  org_id  text  DEFAULT mi_org_activa()
  creado  timestamptz DEFAULT now()
  es_demo boolean DEFAULT false
  PK (prod_id, cli_id) · índices por cli_id y org_id
```

RLS activa, 4 políticas: aislamiento por org, lectura con `tiene_ficha()`, INSERT y DELETE
solo con `es_freelance()`. Los vendedores LEEN, no escriben. Nace vacía: hasta que el
freelance asigne clientes, nada cambia de comportamiento.

## PARTE A · Las tres apps que toman pedido

`Comisionista.html`, `socio-comercial.html` y `freelance-completo.html`. Mismo código en los
mismos dos sitios.

- **A.1 · Mapa de exclusividad** — justo después de `const CLI_ID_DE = {};`: se declara
  `EXCLUSIVA_DE` (`prod_id -> Set(cli_id)`) y `marcaVisibleParaCli(prodId, cliId)`
  (sin dueños → visible; con dueños → solo si el cliId está).
- **A.2 · Carga** — tras llenar `CLI_ID_DE`, un `try/catch` APARTE del `Promise.all` que lee
  `marca_clientes(prod_id,cli_id)` y llena `EXCLUSIVA_DE`. Si falla, el mapa queda vacío y
  todo se ve (el fallo seguro es «visible»).
- **A.3 · El filtro** — único punto de corte: `productosDelProv` cuela también por
  `marcaVisibleParaCli(p.prodId, cliIdPed)`, con `cliIdPed = CLI_ID_DE[(cli && cli.nombre) || cli]`.

## PARTE B · Sistema Web: decir de qué cliente es

En el modal «Replicar en piladoras» de `sistema-web.html`:

- **B.1** buscador de clientes (múltiple) con `BuscadorPredictivo cat="clientes"` cuando
  `marcaModal` incluye `"cliente"`; elegidos como fichas con «×». Estado `clientesMarca`.
- **B.2** al abrir el modal, precargar los vínculos existentes de `marca_clientes` para ese
  `prod_id`.
- **B.3** al guardar en `replicarEnBloque`: DELETE por `prod_id` + INSERT del conjunto nuevo
  (mismo patrón que `vinculos_cliente`).
- **B.4** las copias que crea el replicado en otras piladoras heredan los MISMOS clientes.
- **B.5** corte: «Del Cliente» marcado y sin cliente elegido → no se puede guardar. Al
  desmarcar «Del Cliente» se borran los vínculos.
- **B.6** en la lista del catálogo mostrar «Del Cliente · <nombre>» (o «· N clientes»).

## Qué NO se debe tocar

- La base (solo filas). `tipo_marca` sigue igual: la exclusividad la manda el vínculo, no la
  etiqueta. El catálogo maestro, Piladoras y Costos/Base siguen mostrando TODO. `vinculos_cliente`
  es otra cosa. El vendedor solo LEE. `proveedor-freelance.html` y `transportista-app.html` no
  se tocan.

## Cómo verificar

`node scripts/compilar.js` + `node pruebas/pruebas.js rapido`. Arnés nuevo
`pruebas/test_marca_exclusiva.js` (`apps:[null]`): las tres apps declaran `EXCLUSIVA_DE`,
`marcaVisibleParaCli` y el ancla; las tres lo pasan dentro del filtro de `productosDelProv`;
la lógica (sin dueños → visible; con dueño presente → visible; ausente → oculto; sin cliente
→ oculto); ninguna app del vendedor escribe en `marca_clientes` (solo `.select`).

## Trampas conocidas

- El fallo seguro es «visible» (try/catch aparte, fuera del Promise.all).
- Sin cliente elegido, las exclusivas no se ven (a propósito).
- `cli` es el NOMBRE; el id sale de `CLI_ID_DE[(cli && cli.nombre) || cli]`.
- El filtro va sobre `p.prodId`, NO `p.id` (producto+presentación).
- Cambiar las TRES apps.
- Los pedidos ya hechos no se tocan.

## Versión y caché

Comisionista, socio-comercial, freelance-completo y sistema-web suben cada una a su siguiente
número; `sw.js` CACHE al siguiente. Ajustar `test_cambios_419.js`, `test_cambios_422.js`,
`test_fe01_tarifas.js` y `test_fe03_pagos.js`.
