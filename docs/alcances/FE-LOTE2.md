# Alcance · LOTE-2 — Bug chóferes + pestaña «Retiros» + ventana de fecha (sistema-web.html)

> Tres cambios de FRONT en `sistema-web.html`. No toca la base. Flujo §6.

## 1) Bug · Tarifas de logística → Chóferes (tarifa por zona)
- **Hallazgo (§9):** el arreglo que pedía el alcance (que `abierto` siga verdadero mientras se edita
  una zona del chofer) **ya estaba en `main`** desde la Tanda 3 · Etapa 1 (misma condición, equivalente).
  El bug de «no deja ingresar/guardar» ya no ocurría.
- **Lo que faltaba para cumplir la verificación** («queda 1,20 y el panel sigue abierto; repetir
  Norte/Sur»): al **guardar** una zona, `guardarFila` ponía `editando=""` y el panel se cerraba. Ahora, en
  el botón «Guardar» del chofer, tras guardar se reabre el panel de ESE chofer (`setEditando("ch-"+usr_id)`)
  para seguir con las otras zonas. Estibadores no se tocó.

## 2) Retiros en piladora · fuera de Logística, con pestaña propia en Pedidos
- **Logística → Escoger pedidos:** se quitó el bloque «🏭 Retiros en bodega» y el `const retirosBodega`
  (quedó sin uso). Los retiros ya se excluían de la ruta (`disponibles` filtra `!retiroBodega`); ahora
  tampoco se listan ahí.
- **Pedidos → pestaña «🏭 Retiros»:**
  - `clasificarTabPed(cod, log, retiro)` gana el parámetro `retiro`. Precedencia **después de anulados**:
    `if (retiro) return "retiros"`. Así todo retiro no anulado vive en «Retiros» (facturado / por cobrar /
    pagado) y **sale** de Por despachar, Pendientes y En ruta.
  - `tabDePed` pasa `p.retiroBodega`. `PTABS` suma `["retiros","🏭 Retiros"]` tras «En ruta».
  - `cargarConteos` trae `retiro_bodega` en el SELECT y clasifica con él (para que el conteo cuadre).
  - Marca visible **«🏭 Retiro»** en la fila (móvil y escritorio).
- **Sub-decisión asumida (confirmar con el PO):** el retiro **PAGADO** se queda en «Retiros» con su
  sub-estado (la marca de retiro gana sobre entregados). Si se prefiere que pase a «Entregados», es un
  ajuste de una línea (mover la regla `if (retiro)` después de la de entregados/cliente_pago).

## 3) Pedidos · ventana de fecha por defecto (que la lista no crezca sin fin)
- Constante `PED_VENTANA_DIAS = 60`. Al abrir Pedidos, las pestañas que **acumulan** (Todos, Entregados,
  Anulados, Retiros) muestran solo los últimos 60 días, con el aviso «Mostrando los últimos 60 días — usa
  el buscador o el filtro de fecha para ver más». **Se ignora `fDesde`/`fHasta` literales:** la ventana es
  un filtro por defecto en el front, no un valor en el filtro de fecha (así el filtro manual sigue libre).
- **CUIDADO 1 · no esconde trabajo:** la ventana aplica SOLO a las pestañas que acumulan
  (`esTabAcumPed`). Las de trabajo (Pendientes, Por despachar, En ruta) muestran **todo** sin límite: un
  pendiente de hace 90 días sigue en «Pendientes».
- **CUIDADO 2 · buscar/filtrar la ignora:** si hay búsqueda o filtro de fecha manual
  (`fDesde`/`fHasta`), `ventanaDefaultActiva=false` → sin ventana, se busca en todo el histórico.
- **Conteos cuadran (PED_FE_002):** `cargarConteos` aplica el MISMO criterio: cuenta las de trabajo sin
  ventana y las que acumulan (y «Todos») dentro de la ventana, salvo búsqueda/filtro manual. La lista y el
  conteo usan el mismo corte, así filas y números cuadran.
- **«Ver más» acotado:** en una pestaña que acumula con ventana, si lo cargado ya alcanza más atrás del
  corte, se oculta «Ver más» (las páginas siguientes son más viejas que la ventana).
- Nota de diseño: se hace **client-side** (filtrar lo cargado + acotar «Ver más» + conteo por categoría),
  sin cambiar la consulta de servidor ni recargar al cambiar de pestaña, para no romper la paginación ni
  los arneses de comportamiento.

## Qué NO se tocó
La base, el cierre por pago (`marcar_cliente_pago`/`confirmar_pago`), el versionado FE-01, la edición de
pedidos, los permisos ni las reglas de negocio. La app del chofer y los demás módulos siguen igual.

## Cómo verificar
1. `node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde.
2. Celular: (1) chofer → guardar tarifa por zona y que el panel siga abierto; (2) un retiro facturado NO
   aparece en «Por despachar» ni en Logística, sale en «🏭 Retiros» con su marca; (3) «Todos»/«Entregados»
   abren mostrando lo reciente con el aviso, un pendiente viejo sigue en «Pendientes», y al buscar un
   pedido antiguo aparece aunque esté fuera de la ventana; los contadores cuadran con las filas.

## Trampas conocidas
- La ventana usa `creado` (fecha del pedido). El corte se calcula con la fecha de Ecuador (`hoyECWeb`).
- «Todos» es una pestaña que acumula → windowed: puede mostrar MENOS que «Pendientes» (un pendiente de 90
  días está en Pendientes pero no en Todos). Es a propósito.
- Los conteos siguen con su tope de seguridad de 5000 filas (apoyo); a gran escala eso debería ser una
  vista/RPC de conteo en base (Cowork).
