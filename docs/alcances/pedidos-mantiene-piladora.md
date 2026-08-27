# Alcance · Sistema Web · Al agregar un producto, NO borrar la piladora

## 1. Qué se cambia y por qué (negocio)
En Pedidos del Sistema Web, al apretar «Agregar al pedido» se guardaba la línea pero también
se **borraba la piladora** elegida. Como el carrito ya tenía 1 producto, la piladora quedaba
bloqueada (regla «un pedido = una piladora») y no había forma de elegir el 2º producto: el
usuario se quedaba trabado. Ahora, como en la app del freelance: al agregar se limpia **solo el
producto** y la piladora queda fija, para seguir agregando de la misma.

## 2. Qué se cambió (un solo punto)
`sistema-web.html`, función `agregarLinea` (≈6650). Se reemplazó la llamada `resetLinea()` por
una limpieza **solo del producto** que conserva `provSel`/`provTexto`:
```js
setProd(null); setProdTexto(""); setTipo("P1"); setCant(""); setPrecio(""); setGratis("");
setCondP3("contado"); setPromoF(null); setPromoP(null); setComProp(""); setMotivo("");
```
Es exactamente lo que hacía `resetLinea` **pero sin** `setProvSel(null)` ni `setProvTexto("")`.
Ancla `DISENO_PED_MANTIENE_PROV`.

## 3. Qué NO se tocó
- **`resetLinea` NO se cambió**: la usan `abrir()` (pedido nuevo) y el cambio de cliente, donde
  la piladora SÍ debe borrarse.
- La regla «un pedido = una piladora» (la piladora sigue bloqueada con carrito > 0).
- El default de tipo sigue **P1 (Crédito)**.
- Base de datos, permisos y camino demo.

## 4. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde
  (116 ✓). `test_web_sin_fallback` ahora comprueba, manejando la pantalla de verdad, que **tras
  agregar el 1º producto se puede agregar un 2º SIN volver a elegir proveedor** (ancla
  DISENO_PED_MANTIENE_PROV).
- VERSION Sistema Web **b223** + CACHE **v333**; arneses de versión al día.
- En intesgo.app/home: cliente + piladora San Agustín → agregar Arroz Crecedor → queda en el
  carrito y el buscador de producto reaparece con la MISMA piladora fija; agregar Arroz Conejo,
  etc. Al «Subir pedido» y abrir uno nuevo, la piladora se pide de nuevo.

## 5. Trampas conocidas
- La app del freelance (freelance-completo.html) ya trabaja bien este flujo; sirve de referencia,
  no se tocó.
- Publicar VERSION + CACHE juntos o el robot no publica.
