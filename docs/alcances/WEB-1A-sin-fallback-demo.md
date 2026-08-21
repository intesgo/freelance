# TANDA 1A · sistema-web.html · sin fallback demo, sin pedido fantasma, fecha real

Solo frontend (`sistema-web.html`). NO tocar base/RPC/RLS. Preservar: conversión qq,
canon P1/P2, piso P5, origen_canal, editor único, uso de `responder_solicitud`/RPC.
Ancla `/* PED_SIN_FALLBACK_DEMO */`.

## 1) Fecha real (no fija)
En `subirPedido` el pedido local llevaba `fecha:"2026-06-13"`. Ahora usa `hoyECWeb()`
(zona America/Guayaquil) y, tras un guardado exitoso, se recarga (`cargarPedidosVivos`)
para que la fecha salga del pedido real devuelto por el RPC. No queda ninguna fecha fija
en la creación.

## 2) Sin fallback demo en vivo
`CLIENTES` y `PRODS_PED` en modo VIVO (sin `?demo=1`) salen SOLO de la base. Si la carga
real falla o viene vacía:
- se marca el error (`errClientes` / `errProds`) indicando cuál fuente falló,
- se muestra un banner con botón «Reintentar» (`reintentarFuentes`),
- el botón «Subir pedido» queda deshabilitado (`fuentesConError`),
- NO se usan `CLIENTES_WEB` / `PRODUCTOS_WEB`.
Los arreglos demo solo se usan si `MODO_DEMO_WEB` (`?demo=1`).

## 3) Sin pedido fantasma
En `subirPedido` la lista blanca dejaba pasar `sin_sesion`/`sin_conexion` y pintaba la
tarjeta como guardada. Ahora, en vivo, la tarjeta SOLO se pinta si el RPC confirmó éxito.
Si vino `sin_sesion`/`sin_conexion` (u otro error), NO se agrega la tarjeta y se muestra
«No se guardó» explicando que la web no tiene cola offline (a diferencia de la app).

## 4) Tras éxito
Se recarga el pedido real y se muestra el `ped_id` devuelto por el RPC.

## Qué NO se toca
Base/RPC/RLS; conversión qq; canon P1/P2; piso P5; origen_canal; editor único;
`responder_solicitud`. El camino demo (`?demo=1`) sigue funcionando como simulación local.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arnés `pruebas/test_web_sin_fallback.js` (JSDOM + Supabase simulado): (a) sin sesión/conexión
  no aparece pedido; (b) en vivo, si falla la carga real, no salen clientes/productos demo y
  Guardar queda deshabilitado; (c) no queda fecha fija. Cada mutante debe caer.
- En el celular/oficina: crear un pedido real deja la fecha de hoy y el número real; sin
  conexión no aparece un pedido «fantasma».

## Versiones
Sistema Web b178, caché `freelance-v273`.

## Trampas conocidas
- `MODO_DEMO_WEB` distingue vivo de demo; toda la lógica nueva se apaga en demo.
- `cargarPedidosVivos` re-lee los pedidos tras el éxito: la tarjeta optimista se reemplaza
  por la real (con su fecha de base).
