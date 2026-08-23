# PED · Nombre de persona (MAYÚSCULAS) en la lista de Pedidos de las apps móviles

`freelance-completo.html`, `Comisionista.html`, `socio-comercial.html`. Ancla `/* PED_NOMBRE_PERSONA */`.
Es presentación + traer 2 columnas más del cliente. No se toca la base ni la lógica de negocio.

## Qué se hizo
En la lista de Pedidos de las tres apps, el cliente se mostraba con su nombre comercial crudo
(`p.cli`, p. ej. «Supermercado Castillo»). Ahora se muestra el **nombre de persona en MAYÚSCULAS**
(«PEDRO CASTILLO»), con el mismo criterio del Sistema Web:
- **jurídica** → razón social; **natural** → primer nombre + apellido.

Para eso, en cada app:
1. El loader `vivoPedidos()` trae ahora `razon_social` y `tipo` del cliente (antes solo `nombre`).
2. Cada pedido expone `razon` y `tipoCli` además de `cli` (respaldo).
3. Se agregó el helper de módulo `nombreClientePedido(p)` (misma lógica que el Sistema Web).
4. La fila de la lista usa `nombreClientePedido(p)` con `textTransform:"uppercase"`.

## Sobre el «$» de la fila (aviso · §9)
- En **Freelance** la fila ya mostraba solo quintales (el total en $ se quitó en v470); aquí solo
  cambió el nombre.
- En **Comisionista** y **Socio** el «$» de la fila **NO es el total del pedido: es la COMISIÓN del
  vendedor** («tu comisión»). Quitarla rompe la prueba `test_pedidos_lista` («cada pedido muestra
  cliente, comisión y estado») y es una función central de esas apps. Por eso **se conservó la
  comisión**: solo se corrigió el nombre. Si se quiere quitar igual, es otra decisión (habría que
  actualizar esa prueba).

## Qué NO se toca
- La base ni las RPC (solo se leen 2 columnas más). Filtros, orden, estados, permisos: igual.
- Los cálculos de qq/importe/comisión.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (112).
- Guards `PED_NOMBRE_PERSONA` en `test_cambios_422.js`: las 3 apps definen `nombreClientePedido`,
  el select trae `razon_social,tipo`, la fila usa el helper en mayúsculas, y la comisión se conserva
  en comisionista/socio. `test_pedidos_lista`/`test_cabecera_pedido` (Comisionista) siguen verdes.
- En el celular: Pedidos → el cliente sale como «PEDRO CASTILLO» (nombre de persona, mayúsculas).

## Versiones
Freelance **v471**, Comisionista **v191**, Socio **v58**, caché **freelance-v291**.

## Trampas conocidas
- `nombreClientePedido` lee `p.razon`/`p.tipoCli`/`p.cli`: por eso el loader ahora expone `razon` y
  `tipoCli`. En modo demo (sin razon/tipo) el nombre degrada al `cli` acortado (cosmético); en vivo
  usa la razón social real. Mismo comportamiento que el Sistema Web.
- Añadir `razon_social,tipo` al select es seguro: esas columnas ya existen (el Sistema Web las usa).
