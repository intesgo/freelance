# Pedidos (App Freelance) · dos pantallas (lista y Resumen)

ESTADO: pendiente
APPS: `freelance-completo.html` (componente `Pedidos`, ~línea 11003). Nada más.
BASE: no toca la base. Solo diseño y organización.

## Qué se cambia y por qué

La pantalla de Pedidos llega cargada: 4 tarjetas KPI + botón "Ver resumen" + buscador + fila de
filtros + panel de fechas, todo antes de la lista. Se divide en DOS pantallas:

- **PANTALLA 1 (Pedidos):** solo lo de trabajar → pestañas, buscador, chip "⚙ Filtros"
  (Estado/Fecha ocultos), "Ordenar", y la LISTA. Arriba, un enlace fino "📊 Ver resumen".
- **PANTALLA 2 (Resumen):** los 4 números (TOCABLES) + el panorama "Dónde están" / "Por
  proveedor".

Solo diseño/organización: NO toca datos, permisos ni la lógica de pestañas/estados.

## Estado actual útil (ya existe, reutilízalo)

- Ya hay estado `vistaResumen` (~11018) y una sub-vista de resumen (~11146) que HOY muestra las
  dos tarjetas de panorama. Ya hay botón "Ver resumen" (~11135) y el bloque de 4 KPI `mini-kpi`
  (~11116). Ya hay `verFechas` para el panel Desde/Hasta (~11259) y el `useMemo` de lista (~11060).

## Cambios

### 1. Sacar los 4 KPI de la Pantalla 1 y llevarlos a "Resumen"

- Quitar el bloque `mini-kpi` (~11116) de la vista de lista.
- En la sub-vista `vistaResumen` (~11146), mostrar ARRIBA los 4 KPI (En proceso / Por aprobar /
  En camino / En curso $), en tarjetas (2×2 va bien), y DEBAJO las dos tarjetas de panorama que
  ya viven ahí ("Dónde están" / "Por proveedor"). Encabezado de la pantalla: "‹ Pedidos" +
  título "Resumen" (ya hay "Volver").
- Los 4 KPI deben ser TOCABLES igual que hoy (`cambiarPestana` / `irAEstado`): al tocar uno,
  aplica el filtro/pestaña Y cierra el resumen (`setVistaResumen(false)`) para volver a la lista
  ya filtrada. Lo mismo las barras de panorama (ya navegan): que además cierren el resumen.

### 2. Pantalla 1 más liviana

- Dejar el enlace "📊 Ver resumen" como una fila fina (no las tarjetas) que abre la Pantalla 2.
- Buscador (input `q`, ~11237): queda VISIBLE.
- Colapsar Estado y Fecha detrás de un chip "⚙ Filtros" (nuevo estado `filtrosAbiertos`, false
  por defecto): al abrirlo se ven el selector de Estado y el panel Desde/Hasta (`verFechas`).
  "Ordenar" (`orden`) queda VISIBLE al lado del chip Filtros.
- Orden de la Pantalla 1: título → enlace Ver resumen → pestañas → ⓘ → buscador →
  [⚙ Filtros] [Ordenar] → lista.

### 3. No esconder filtros activos en silencio

- `filtrosActivos = (estado!=="Todos"?1:0) + ((desde||hasta)?1:0)`. Si >0, el chip "⚙ Filtros" se
  pinta de verde (estado "on") y muestra el número (p.ej. "Filtros (1)"), aunque esté cerrado,
  más un enlace "Limpiar" que resetea estado/desde/hasta y vuelve a pág 1.

## Qué NO se debe tocar

- Las 3 pestañas y su lógica (`TAB_ESTADOS`/`tabDe`/`SELLADOS`), la paginación (`POR_PAGINA=15`),
  el `useMemo` de lista/orden (~11060), el detalle, el editor de líneas ni permisos.
- Ninguna llamada a la base ni la forma de los datos.
- NO agregar el filtro "Recibido por": hoy el cargador `vivoPedidos` NO trae quién recibió/tomó
  el pedido (verificado), así que no filtraría nada. Queda fuera hasta que exista ese dato.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Sube `VERSION` (v432 → v433) y `CACHE` de `sw.js` (freelance-v229 → v230) juntas; actualiza los
  arneses atados a versión/diseño (`test_cambios_419` y `test_cambios_422` hoy fijan v432 / v229).
- Si algún arnés valida la estructura de Pedidos, ajústalo a la nueva disposición (KPI ya no en
  la lista; ahora en Resumen).
- Probar en el celular: al entrar a Pedidos se ve pestañas + buscador + lista casi de una; el
  enlace "Ver resumen" abre la Pantalla 2 con los 4 números y las barras; tocar un número o una
  barra vuelve a la lista filtrada; "⚙ Filtros" abre/cierra Estado+Fecha; con un filtro puesto el
  chip queda verde con su número y aparece "Limpiar"; abrir/editar/anular un pedido siguen igual.

## Trampas conocidas

- Hooks: el nuevo `useState` `filtrosAbiertos` va con los demás `useState` (~11009-11022), ANTES
  de los return tempranos (sel / vistaResumen), o React se queja del orden de hooks.
- Al mover los KPI a Resumen, revisa que las variables que usaban (enProceso/esperando/enCamino/
  montoAct y las funciones cambiarPestana/irAEstado) sigan en alcance dentro de esa sub-vista.
- No dejes filtros activos invisibles sin el indicador verde + número + "Limpiar".
- Mantén las barras de panorama (no las quites); solo se les suma arriba el bloque de KPI.
- Es solo diseño: NO cambia datos, permisos ni reglas de negocio.
