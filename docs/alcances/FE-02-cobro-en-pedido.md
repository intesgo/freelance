# FE-02 · Cobro del flete/estibada en el pedido (arregla el retiro)

ESTADO: publicado
APPS: `freelance-completo.html`, `Comisionista.html`, `socio-comercial.html`, `sistema-web.html`
  (toma de pedidos en las cuatro).
BASE: ya aplicada por Cowork (migración `fe02_cobro_flete_estibada_en_pedido`). **Code no toca la base.**
  Columnas nuevas `pedidos.flete_cobro_qq` y `pedidos.estibada_cobro_qq`; el RPC
  `registrar_pedido_atomico` ya los recibe en el payload. La comisión NO cambió (va sobre el base;
  el flete es aparte).

## Qué se cambia y por qué

Arregla el **retiro en piladora**: hoy no deja tomar pedido en retiro por no tener precios de flete.
Ahora el pedido cobra el flete y la estibada al cliente ($/qq), tomados de las tarifas que arma el
freelance (FE-01), y en retiro esos valores van en 0.

## Comportamiento (ancla `/* FE02_COBRO_PEDIDO */` en cada app)

1. **Cliente a domicilio:** buscar su **zona** (la ciudad del cliente cae dentro de `zonas.ciudades`)
   y leer la `tarifas_fe` vigente `ambito='zona'` de esa zona: **flete** y **estibada** en $/qq.
   Se pueden **ajustar** esos valores en el pedido.
2. **Retiro en piladora (`retiro_bodega=true`):** flete y estibada en **0** (deshabilitados).
3. **Payload:** mandar en `registrar_pedido_atomico` los campos **`flete_cobro_qq`** y
   **`estibada_cobro_qq`** ($/qq; 0 en retiro). (Y en `editar_pedido_atomico` si la app edita.)
4. **Desglose:** mostrar **Base + Flete + Estibada = Total**. El total de flete = `$/qq × quintales`
   (igual la estibada).
5. **La comisión no cambia** (sigue sobre el base).

## Qué NO se debe tocar

- La base ni el RPC (ya reciben los campos). No cambiar el cálculo de la comisión.
- La lógica de permisos, otros roles, el camino demo.
- El piso del precio especial (P5) del Sistema Web: ya lee `tarifas_fe` `ambito='general'` para su
  cálculo; FE-02 agrega el cobro al cliente, no toca ese piso.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Subir `VERSION` de las apps tocadas + `CACHE` del `sw.js`, y ajustar los arneses de versión.
- En el celular / web: tomar un pedido **a domicilio** (aparecen flete y estibada de la zona, se pueden
  ajustar, el total suma Base+Flete+Estibada) y uno **en retiro** (flete/estibada en 0, deshabilitados,
  y el pedido se puede registrar).

## Trampas conocidas

- **Zona por ciudad:** el cliente trae `ciudad` (texto); la zona se resuelve porque esa ciudad está en
  `zonas.ciudades` (arreglo). Ojo con mayúsculas/acentos al comparar.
- **$/qq vs total:** los campos del payload son **$/qq** (no el total). El total mostrado es
  `$/qq × quintales`.
- **Cuatro apps:** el mismo comportamiento en las cuatro tomas de pedido; cada una con su `VERSION`.
- Arneses atados a versión/diseño del pedido: ajustarlos en el mismo cambio.
