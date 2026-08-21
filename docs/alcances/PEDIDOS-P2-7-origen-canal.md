# PEDIDOS P2-7 · Mandar origen_canal al crear el pedido (4 apps)

Solo frontend. La base ya tiene `pedidos.origen_canal` y `registrar_pedido_atomico`
ya lee `p_payload->>'origen_canal'`. Falta que cada app lo envíe.

## Qué se cambia
En el objeto `payload` que va a `registrar_pedido_atomico`, agregar la clave
`origen_canal` justo después de `condicion`, con valor fijo por app:

| App | Función | Valor |
|---|---|---|
| `freelance-completo.html` | `guardarPedidoEnBase` | `"freelance"` |
| `Comisionista.html` | `guardarPedidoEnBase` | `"comisionista"` |
| `socio-comercial.html` | `guardarPedidoEnBase` | `"socio"` |
| `sistema-web.html` | `guardarPedidoOficina` | `"web"` |

Ancla `/* PED_ORIGEN_CANAL */` en cada una.

## Qué NO se toca
- Nada más del payload ni del flujo.
- `proveedor-freelance.html` NO crea pedidos: no se toca.
- La base (ya la trabajó Cowork).

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arnés `pruebas/test_origen_canal.js`: cada app manda su valor, junto a `condicion`.
- En el celular: crear un pedido desde cada app deja `pedidos.origen_canal` con el
  valor de esa app (freelance/comisionista/socio/web), no `'desconocido'`.

## Versiones
Freelance v462, Comisionista v187, Socio v55, Sistema Web b176, caché `freelance-v271`.

## Trampas conocidas
- Son cuatro payloads con formato distinto (uno con espacios, otros compactos); el
  cambio se inserta pegado a `condicion,` en cada uno, respetando su estilo.
- `sistema-web` tiene otro `payload` (edición: `editar_pedido_atomico`) que NO se toca:
  el origen se manda solo en la CREACIÓN (`registrar_pedido_atomico`).
