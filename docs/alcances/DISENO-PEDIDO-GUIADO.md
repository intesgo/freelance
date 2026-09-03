# Alcance · DISENO_PEDIDO_GUIADO — el armador de pedidos guía paso a paso

> Archivo: `sistema-web.html` · componente `PedidosWeb`, vista «armar».
> Solo PRESENTACIÓN. No se toca precio, cupo, comisión, P5, promociones,
> autorización ni permisos. Supabase no se toca.

## Qué se cambia y por qué

El armador de pedidos del Sistema Web era una pantalla plana: campos con textos
grises («Elige un cliente arriba») y sin un hilo que dijera «vas por aquí».
Ahora acompaña al usuario paso a paso, como un instructivo:

- **Barra de pasos** arriba (Cliente → Proveedor → Producto → Cantidad y precio →
  Subir), con numeritos; el paso ya hecho se marca con ✓, el actual lleva un aro.
- **Recuadros-guía** en lugar del texto gris: «Empieza por el cliente», «Ahora el
  proveedor», etc. dicen qué hacer en cada momento.
- El **campo activo se resalta** (borde y halo verde) y el **cursor salta solo**
  a Cantidad o Precio cuando toca.
- El botón **«Agregar al pedido» late** (pulso) solo cuando la línea ya es válida.
- **Tras agregar**: la línea nueva recibe un **acuse ✓** que se apaga solo a
  ~1,5 s, el rótulo pasa a «Agrega otro producto» y sale el recuadro «Agrega otro
  producto de <piladora>» con el conteo. **La piladora elegida se conserva**
  (un pedido = una piladora), y aparece el chip «Fija · un pedido = una piladora».

## Archivos y puntos

- `sistema-web.html`, `PedidosWeb`:
  - Estado nuevo cerca de `lineaEdit`: `ultimaLinea`, `refCant`, `refPrecio`,
    `acuseTimerRef`.
  - `PASOS_PED` (array de pasos) y **derivados** `pasoPed`, `idxPaso`, `cumplido`,
    `estadoPaso`, `numPaso`, `recuadroGuia` — **NO** van en `useState` (son estado
    derivado). Ancla: `DISENO_PEDIDO_GUIADO`.
  - `useEffect` de foco automático (deps `[pasoPed, prod, cant==="", precio===""]`)
    y limpieza del timer del acuse al desmontar.
  - `agregarLinea`: fija `ultimaLinea` y programa el borrado a 1500 ms; conserva
    `provSel`/`provTexto` (ancla `DISENO_PED_MANTIENE_PROV`).
  - Barra de pasos `.ped-pasos` antes de la cabecera; recuadros del campo activo
    en la fila `.ped-rowab`; acuse ✓ en la fila del carrito con `data-acuse="1"`.
  - CSS `@media(max-width:900px)`: `.ped-pasos{flex-wrap:wrap}`,
    `.ped-paso-lbl{display:none}`, `.ped-paso-linea{display:none}`.

## Qué NO se toca

- Ninguna regla de negocio: precio, cupo, comisión, P1–P6, promociones,
  autorización, permisos. El botón nunca se bloquea con `pointerEvents:"none"`;
  atenuar es solo `opacity`.
- El guardado del pedido y su payload quedan igual.
- Datos ya elegidos (cliente, piladora) **no se atenúan ni se borran** al avanzar.

## Cómo verificar

```bash
node scripts/compilar.js
node pruebas/test_pedido_guiado.js sistema-web.html
node pruebas/pruebas.js rapido
```

En el celular / navegador (`intesgo.app/home`, módulo Pedidos → Nuevo pedido):
la barra de pasos avanza a medida que eliges cliente, piladora y producto; el
cursor cae solo en Cantidad; «Agregar» late al completar; tras agregar sale el
✓ y el recuadro «Agrega otro producto», con la piladora todavía puesta.

## Trampas conocidas

- El acuse ✓ se detecta en la prueba por `span[data-acuse="1"]`: hay otros ✓ con
  `aria-hidden` en la barra de pasos, por eso el hook propio.
- Los derivados NO deben pasar a `useState` (romperían el hilo del paso actual).
- La barra no debe desbordar en angosto: por eso `flex-wrap` y ocultar rótulos
  y líneas a 900 px.
