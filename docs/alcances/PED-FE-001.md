# Alcance · PED_FE_001 (Tanda 1) — Pedidos (Sistema Web) dice la verdad de los estados

> `sistema-web.html` · componente `PedidosWeb`. **Solo front.** No toca base, permisos ni RPC.

## Qué se cambió

1. **Clasificación por CÓDIGO canónico (no por la etiqueta visible).**
   - Cada pedido lleva el código crudo: `estadoCod = pd.estado` y `estadoLog = pd.estado_logistico`
     (ya venían en el `select` del listado).
   - `tabDePed(p)` con precedencia estricta y default **`'sin_clasificar'`** (NUNCA 'entregados'):
     1. `estadoCod==='anulado'` → `anulados`
     2. `estadoLog==='entregado'` o `estadoCod ∈ {entregado,cliente_pago,cerrado}` → `entregados`
     3. `estadoLog==='despachado'` o `estadoCod==='despachado'` → `en_ruta`
     4. `estadoCod==='facturado'` (log sin_despachar/parcial) → `por_despachar`
     5. `estadoCod ∈ {ingresado,esperando_aprobacion,enviado_proveedor}` → `pendientes`
     6. otro/nulo → `sin_clasificar`
   - El pedido recién creado (tarjeta optimista) nace `esperando_aprobacion` → cae en Pendientes.

2. **Pestañas:** Todos · Pendientes · Por despachar · En ruta · Entregados · Anulados
   (+ «Sin clasificar» **solo** si hay ≥1). «Todos» incluye anulados. Default: Pendientes,
   con conteo por pestaña y reinicio de paginación al cambiar. En «Por despachar», los
   pedidos en `parcial` llevan una alerta «⚠ saldo».

3. **Color de estado por código** (`colorEstado(p)`): mapa explícito con **color + icono**:
   morado=aprobación · ámbar=ingresado/enviado_proveedor · azul=facturado/despachado/ruta ·
   verde=entregado/cliente_pago/cerrado · **rojo=anulado** (ya NO azul) · gris=sin_clasificar.
   El estado se muestra como «icono + texto» (no depende solo del color).

4. **Trazabilidad fuera de Pedidos.** Se eliminó `vistaTraza`/`tzRecorrido`/`tzCandidatos` y su
   buscador demo, la pestaña «Trazabilidad» y el botón «Avisar al cliente». En su lugar, el
   `ModalPedido` tiene un enlace **«🚚 Ver en Logística»** que abre el módulo Logística
   (`setSeccion("trazabilidad")`); no empareja por nombre de cliente. El demo compartido
   (`EF_VIAJES_INI` y cía.) queda para otras pantallas que lo usan.

5. **Fechas América/Guayaquil:** `String(creado).slice(0,10)` → `hoyECWeb(new Date(creado))`.

6. **Subtítulo:** «Aprobaciones por lote» → «Gestión y seguimiento de pedidos» (no simula
   acciones masivas que no existen).

## Qué NO se tocó (bloque «no rehacer»)

Una fila por pedido, columna «Pedido N.º», clic→ModalPedido, modal solo lectura
(X/Cerrar/Escape), lápiz solo en estados editables (ingresado/esperando_aprobacion/
enviado_proveedor; bloqueado desde facturado), ordenamiento, «+ Nuevo pedido», nombre en
MAYÚSCULAS, P1 crédito/P2 contado, conversión presentación↔quintales, RPC atómicas,
«sin fallback demo». Nada de base, permisos, RLS ni RPC.

## Cómo verificar

1. `node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde.
2. Guardas y negativos en `test_cambios_422.js` (bloque `PED_FE_001`): desconocido/nulo →
   'sin_clasificar' (nunca entregados); facturado sin despachar → 'por_despachar'; despachado
   → 'en_ruta'; anulado → rojo; fecha EC; sin pestaña/recorrido demo de trazabilidad ni
   «avisar al cliente». Arneses de la pantalla actualizados en el mismo cambio
   (`test_estados_paridad_web` → clic «Por despachar»; `test_pedidos_cliente` mutante; el
   optimista con `estadoCod`).
3. En vivo: los pedidos caen en la pestaña de su estado real; «Anulado» sale rojo, no azul.

## Trampas conocidas

- Clasificar por **código**, no por texto.
- «Por despachar» = facturado **sin viaje despachado** (aunque tenga ruta armada; su
  `estado_logistico` sigue sin_despachar/parcial hasta que se despacha).
- Diferenciar entrega completa/parcial/novedad exige datos de guía que hoy **no** vienen en el
  select → tanda posterior. En Tanda 1, «Entregados» agrupa entregado/cliente_pago/cerrado sin
  subdividir.
- La fecha EC usa `hoyECWeb(new Date(creado))` con el timestamp real (`creado` es timestamptz);
  para el optimista se usa `hoyECWeb()` (hoy).
