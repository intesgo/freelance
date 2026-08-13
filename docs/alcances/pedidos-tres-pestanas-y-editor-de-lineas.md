# Pedidos (App Freelance) · tres pestañas + editor de líneas

ESTADO: pendiente
APPS: `freelance-completo.html` (módulo Pedidos). Nada más.
BASE: no toca la base. Usa `editar_pedido_atomico`, que **ya está aplicada**.

## Qué se cambia y por qué

Dos cosas, para que el freelance vea de un golpe qué le toca hacer y pueda corregir un pedido
sin borrarlo y volverlo a crear:

1. **Tres pestañas en vez de dos**: `Pendientes` · `En camino` · `Entregados`. Hoy son dos
   ("En proceso" / "Historial") y el nombre no dice dónde está cada pedido.
2. **Editor de líneas**: desde el detalle de un pedido que todavía se puede tocar, poder
   **agregar, quitar y cambiar** productos, cantidades, precios y tipo de precio.

## Trabajo 1 · Tres pestañas

Hoy el reparto vive en el componente `Pedidos` de `freelance-completo.html` (alrededor de la
línea 10975, en el `const lista=pedidos.filter(...)`, y las pestañas alrededor de la 11117).

**Cómo queda el reparto** (por el estado que muestra la tarjeta, `p.estado`):

| Pestaña | Estados que contiene |
|---|---|
| **Pendientes** | Esperando aprobación · Enviado al proveedor |
| **En camino** | Facturado · Despachado |
| **Entregados** | Entregado · Cobrado y validado · Comisión liberada · Anulado |

Detalles:

- **`Pendientes` es la pestaña por defecto** al entrar al módulo (ya lo es hoy).
- **Los anulados van en `Entregados` pero OCULTOS por defecto**: solo aparecen si el usuario
  elige "Anulado" en el filtro de estado. Razón: un pedido anulado no se entregó, y mostrarlo
  ahí por defecto haría que el nombre de la pestaña mienta. Pero tiene que poder encontrarse.
- **El filtro de estado se muestra en las tres pestañas**, con la lista de estados que
  corresponde a cada una (hoy en "Historial" está oculto). Al cambiar de pestaña, el filtro
  vuelve a "Todos" (eso ya lo hace `cambiarPestana`).
- **Número en `Pendientes`**: la pestaña muestra cuántos hay, así: `Pendientes (3)`. Si son
  cero, no se muestra el número. Es la señal más fuerte para que un usuario nuevo sepa dónde
  está su trabajo. En las otras dos pestañas no va número.
- **La nota bajo las pestañas** (la que hoy explica la regla) se ajusta a tres textos:
  - Pendientes → "Aquí están los pedidos que todavía se pueden editar o anular."
  - En camino → "🔒 Ya facturados: van hacia el cliente. No se editan ni se anulan."
  - Entregados → "🔒 Cerrados: quedan para consulta. Si hay un problema, va por Novedad o
    Nota de crédito."

## Trabajo 2 · Editor de líneas

**Dónde se entra:** en el detalle del pedido (componente `DetallePedido` de
`freelance-completo.html`, alrededor de la línea 11340), junto al botón "✕ Anular pedido" que
ya existe. Botón nuevo: **"✏️ Editar pedido"**.

**Cuándo aparece:** con las mismas condiciones que "Anular" — solo con sesión real
(`vivo`), no en demo, y solo si el estado es "Esperando aprobación" o "Enviado al proveedor".
En cualquier otro estado **no aparece** (ya existe la variable `selladoPed` para eso).

**Qué hace:** abre el armador de pedido (`function Pedido`, alrededor de la línea 6250) en
**modo edición**, con las líneas del pedido ya cargadas en el carrito, para agregar, quitar o
cambiar. Al guardar, llama a `editar_pedido_atomico` en vez de a `registrar_pedido_atomico`.

### El contrato con la base (esto es lo que no se puede equivocar)

`editar_pedido_atomico(p_ped text, p_items jsonb, p_op_id text)` → devuelve
`(ped_id, repetido, resumen)`. La base ya valida el rol y el estado; no hay que repetirlo.

Cada línea de `p_items` va así:

```json
{
  "item_id": "PD-0011-I...",   // opcional: si va, actualiza esa línea; si no, crea una nueva
  "prod_id": "...",
  "pres_cod": "...",
  "cantidad_qq": 60,            // EN QUINTALES
  "precio_qq": 19.00,           // EN QUINTALES
  "gratis_qq": 0,               // EN QUINTALES
  "tipo_precio": "P2",
  "condicion": "credito",       // "contado" | "credito"
  "promo_id": null,
  "comision_propuesta": null    // solo cuando tipo_precio = "P5"
}
```

`p_op_id`: identificador único de la operación, mínimo 8 caracteres
(`crypto.randomUUID()` sirve). Uno por intento de guardado, no por reintento del usuario.

### Trampas conocidas (verificadas leyendo la función)

1. **La función trabaja en QUINTALES; el armador trabaja en PRESENTACIONES.** Hay que
   convertir en los dos sentidos, usando el `equiv` del producto del catálogo:
   - Al **cargar** el pedido en el armador: `cant = cantidad_qq / equiv` y
     `precio = precio_usd × equiv`.
   - Al **guardar**: `cantidad_qq = cant × equiv` y `precio_qq = precio / equiv`.
   Si esto se salta, las cantidades y los precios salen mal por un factor, y el pedido queda
   con cifras equivocadas. **Es el error más caro de este trabajo.**
2. **Las líneas que no se manden, se BORRAN.** El guardado tiene que enviar todas las líneas
   que deben quedar, no solo las que se cambiaron. Así es como funciona "quitar producto".
3. **No se puede dejar el pedido sin líneas** (la base lo rechaza). Si el usuario quita todas,
   la pantalla debe decir que para eso está "Anular pedido", no dejarlo guardar.
4. **La cabecera NO se puede editar.** Esta función solo reemplaza líneas: no cambia cliente,
   proveedor, fecha de entrega ni nota para el chofer. Verificado: ninguna función de base
   toca esos campos y la tabla es de solo lectura desde la app. Por eso, en modo edición el
   **cliente y el proveedor se muestran fijos, no elegibles**, y conviene una línea que diga:
   "Aquí se cambian los productos del pedido. El cliente y el proveedor no se cambian."
5. **Emparejar cada línea del pedido con el producto del catálogo por `prod_id` + `pres_cod`**
   (en el catálogo la clave es `prodId + "-" + presCod`, y ahí viene `equiv`). Si un producto
   ya no está en el catálogo vigente, no romper: mostrar la línea con su descripción guardada
   y avisar que no se puede cambiar esa línea.
6. **Las líneas se leen de `pedido_items`**: `item_id, prod_id, pres_cod, descripcion,
   cantidad_qq, precio_usd, tipo_precio, condicion, gratis_qq, promo_id`.
7. **Mensajes de error claros.** La base contesta con frases, no con códigos; mostrarlas tal
   cual está bien, pero si dice "El pedido ya no se puede editar en estado X", traducir a
   algo como: "Este pedido ya se facturó: ya no se puede editar."

## Qué NO se debe tocar

- **La base de datos.** Nada. Si algo parece necesitarlo, para y avisa.
- **El camino demo** (sin sesión): sigue funcionando como hoy, sin botón de editar.
- **`registrar_pedido_atomico`** y el flujo de crear un pedido nuevo: intactos.
- **Las otras apps** (`Comisionista.html`, `sistema-web.html`, etc.): este trabajo es solo de
  `freelance-completo.html`.
- **La lógica de permisos y de roles.** El comisionista no gana nada con este cambio.
- **El botón "Anular pedido"** y el candado del pedido sellado que ya existen.
- **El panel del embudo** de arriba: sigue mostrando todas las etapas. Ojo: usa `enCurso` e
  `irAEstado`; al pasar a tres pestañas, `irAEstado` tiene que mandar cada estado a la
  pestaña que le toca según la tabla de arriba.

## Cómo verificar

Antes de publicar:

```
node scripts/compilar.js
node pruebas/pruebas.js rapido
```

Y en el celular, después de publicar (que salga la barra "Actualizar" y cambie el número de
versión):

1. Las tres pestañas existen y **Pendientes** trae el número. Un pedido facturado aparece en
   **En camino**, no en Pendientes.
2. El filtro de estado funciona en las tres.
3. Un pedido anulado **no** se ve en Entregados hasta elegir "Anulado" en el filtro.
4. En un pedido "Esperando aprobación": el botón **Editar** aparece; se abre con las líneas
   cargadas; **las cantidades y los precios coinciden con los del pedido** (esta es la
   comprobación clave de la trampa 1).
5. Cambiar una cantidad y guardar → el detalle muestra el número nuevo y el total cuadra.
6. Quitar un producto y guardar → desaparece del pedido.
7. En un pedido facturado: **no** aparece el botón Editar.

Sube la versión de la app (`VERSION`) y la caché (`CACHE` en `sw.js`) juntas, y actualiza los
arneses atados a versión si corresponde (`CLAUDE.md` §4).
