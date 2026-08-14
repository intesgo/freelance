# Pedidos (App Freelance) · anular con confirmación clara + ver anulados + revivir

ESTADO: pendiente
APPS: `freelance-completo.html` (componentes `AnularPedidoSheet` ~11437, `Pedidos` ~11003,
helper junto a `anularPedidoEnBase` ~18523). Nada más.
BASE: no toca la base salvo LLAMAR a `revivir_pedido` (ya aplicada).

> Reemplaza a `docs/alcances/pedidos-anular-confirmacion-clara.md`: se hace todo junto.

## Qué se cambia y por qué

El dueño quiere: (1) al anular, poder CANCELAR antes de que ocurra (clic por error / pedido
equivocado); (2) una ficha/pantalla para VER los anulados; (3) poder REVIVIR un anulado.

## Contrato de base (ya aplicado)

```
revivir_pedido(p_ped text, p_op_id text) -> jsonb  { ok, ped_id, estado, repetida }
```

- Solo freelance/admin; solo si el pedido está "anulado"; lo devuelve a su estado anterior.
- `p_op_id`: idempotente, mínimo 8 caracteres (`crypto.randomUUID()`, fallback
  `"rev-"+pedId+"-"+Date.now()`). Si viene error de Supabase, muéstralo y NO pintes éxito.

## Cambios

### 1. Confirmar / Cancelar al anular — `AnularPedidoSheet` (~11437)

- Identificar bien el pedido: reemplazar el subtítulo `{p.cli} · {p.prov} · {p.cant} qq` por una
  ficha clara: Cliente en grande, y debajo Fecha (`p.fecha`) · Monto (`money(p.cant*p.precio)`) ·
  Estado (`p.estado`) · Proveedor (`p.prov`). Encabezar "Vas a anular ESTE pedido:".
- "Cancelar" grande y del mismo peso, fácil de tocar (arriba/izquierda). El botón destructivo dice
  "Sí, anular pedido" en rojo y SIGUE deshabilitado hasta escribir el motivo (como hoy).
- Mantener cerrar tocando fuera y con Atrás (`useModal`). El motivo sigue obligatorio.

### 2. Ficha / pantalla de anulados — `Pedidos` (~11003)

- Añadir una sub-vista "Anulados" (estado `vistaAnulados`, patrón igual a `vistaResumen`), con
  encabezado "‹ Pedidos" + "Anulados" y "Volver". Punto de entrada: un enlace/chip
  "Ver anulados (n)" (n = pedidos con estado "Anulado"); ubícalo en la pantalla Resumen o junto a
  las pestañas. NO lo mezcles con la lista normal.
- Cada anulado muestra: Cliente, Fecha, Monto, y un botón "Revivir pedido".
- (Los anulados ya vienen en `pedidos` con estado "Anulado"; no hace falta nueva carga.)
- Opcional (solo si `auditoria` es legible por el freelance vía RLS — verifícalo): mostrar el
  motivo y quién anuló, leyendo la última fila ANULAR_PEDIDO. Si no es directo, omítelo; con
  Cliente/Fecha/Monto basta para esta entrega.

### 3. Revivir — helper + confirmación

- Nuevo helper junto a `anularPedidoEnBase` (~18523):

```js
async function revivirPedidoEnBase(pedId){
  try{ const opId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():("rev-"+pedId+"-"+Date.now());
    const {data,error}=await window.SB.rpc("revivir_pedido",{p_ped:pedId,p_op_id:opId});
    if(error) return {ok:false,motivo:error.message||"No se pudo revivir"};
    return {ok:true,data};
  }catch(e){ return {ok:false,motivo:String((e&&e.message)||e)}; } }
```

- "Revivir pedido" abre un modal de confirmación (mismo espíritu que anular, al revés): muestra el
  pedido (Cliente/Fecha/Monto) y el texto "Volverá a su estado anterior (antes de anular)".
  Botones: "Cancelar" (grande) + "Sí, revivir". Al confirmar: `revivirPedidoEnBase` → si ok, toast
  "Pedido revivido" + refetch (`onRecargar`); si no, toast con el motivo (sin pintar éxito).
- Tras revivir, el pedido sale de Anulados y reaparece en su pestaña (Pendientes normalmente).
- Mostrar "Revivir" SOLO en pedidos con estado "Anulado".

## Qué NO se debe tocar

- Las funciones de base `anular_pedido`/`revivir_pedido`, los permisos, ni la condición de cuándo
  se muestra Anular (`sePuedeAnular`). El motivo de anular sigue obligatorio.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Sube `VERSION` de la app y `CACHE` de `sw.js` (los que correspondan) y actualiza los arneses de
  versión/diseño (`test_cambios_*`). Añade, si puedes, un arnés que confirme que existe la vista
  Anulados y que Revivir llama `rpc("revivir_pedido")`.
- En el celular: anular muestra la ficha clara y "Cancelar" no anula; "Ver anulados" lista los
  anulados; "Revivir" pide confirmación y, al aceptar, el pedido vuelve y aparece en Pendientes.

## Trampas conocidas

- Hooks: los nuevos `useState` (`vistaAnulados` y el del modal de revivir) van con los demás, antes
  de los return tempranos (sel / vistaResumen / vistaAnulados).
- Revivir SOLO aplica a estado "Anulado"; la base igual lo valida, pero no muestres el botón en
  otros.
- `op_id` de revivir: 8+ caracteres.
- Es solo app: NO cambia datos ni permisos; solo llama a la función que ya existe.
