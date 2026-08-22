# DISEÑO · Cierre de la Portada + Resumen del día a la línea ERP

Solo estilo + quitar una pestaña (`sistema-web.html`), sobre la base `/* DISENO_BASE_ERP */`.
Ancla `/* DISENO_DASHBOARD_CIERRE */`. NO se tocó lógica, datos, permisos ni cálculos.
Componentes: `PortadaWeb` (selector de pestañas) y `ResumenDiaWeb` (rediseño).

## Qué se hizo

### CAMBIO 1 — Se retira la pestaña «Indicadores»
- La Portada queda con **dos pestañas**: Tablero y Resumen del día.
- El selector ya no incluye `["indicadores", …]` y la Portada **ya no renderiza** la función
  `Dashboard` vieja. La función `Dashboard` **NO se borró**: queda definida, sin ruta de
  acceso, para reaprovechar sus 3 gráficos (flujo de caja, cartera por antigüedad,
  comisiones) dentro del Tablero **más adelante**, cuando haya datos reales.
- Las dos pestañas que quedan estrenan icono vectorial `<Ico>` (home / calendar) en vez de
  emoji (🏠 / 📅).

### CAMBIO 2 — «Resumen del día» a la línea ERP (solo apariencia)
Se conservan **todos los bloques y todas las fuentes de datos**; solo cambió el envoltorio:
- **4 tarjetas de plata** en grid 2×2, con chip de icono arriba y número grande que manda
  (banknote / clock / alert / shield). Mismos montos, mismo destino al tocar.
- **«Esperando tu acción»**: lista con icono en cuadrito, título + subtítulo y chevron a la
  derecha; el color por urgencia (warn/bad) es el mismo criterio de antes. **La navegación
  al tocar cada ítem es idéntica** (mismo `navegar(a.key)`).
- **Alertas de patrón**: banda ámbar con icono (factory / scale) y chevron; misma lógica de
  detección (mismo proveedor con 2+ novedades, misma persona/motivo con 2+ anulaciones).
- **Movimiento de hoy**: se mantiene tal cual (ya era una lista con hora tabular +
  descripción).
- Emojis → `<Ico>` en todos los bloques. El sello de fuente 🟢/⚪ pasó a un punto de color
  CSS (verde = números vivos, gris = demo); misma semántica.

## Qué NO se toca
- `TableroPrincipal` (pestaña Tablero) queda igual.
- Nada de permisos ni roles.
- Ningún cálculo de montos, cupos ni orígenes de datos (comisiones, cartera+cobros,
  custodia, cheques, solicitudes; con sesión = vivos, sin sesión = demo).
- La función `Dashboard` se conserva completa (sus 3 gráficos se integrarán después).

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (111).
- Guards en `test_cambios_422.js` (ancla `DISENO_DASHBOARD_CIERRE`):
  - la Portada deja solo `[["tablero","home","Tablero"],["resumen","calendar","Resumen del día"]]`;
  - no queda `pTab==="indicadores"` ni el render `{pTab==="indicadores" && <Dashboard …}`;
  - `function Dashboard({ navegar })` sigue definida;
  - `ResumenDiaWeb` no tiene emojis renderizados (usa `<Ico>`), y las tarjetas + pendientes
    usan iconos vectoriales del molde (`name={ic}` / `name={a.ic}` / `chevronRight`).
- En el celular: Portada → solo Tablero y Resumen del día. Entra a Resumen del día: mismas
  4 cifras, mismos pendientes que llevan a los mismos módulos al tocar.

## Versiones
Sistema Web **b185**, caché **freelance-v282**.

## Trampas conocidas
- Hay **otro** `<Dashboard navegar={navegar} />` legítimo en `DashboardCliente` (historial
  del cliente). El guard apunta al render de la Portada (`{pTab==="indicadores" && <Dashboard`)
  para no confundirlos.
- El detector de emojis del guard **excluye** el bloque de flechas (`←`–`⇿`): los subtítulos
  usan `→` legítimo («Logística → Novedades»), que no es un emoji a convertir. Además ahora
  ignora comentarios `//` (las cenefas `──` viven ahí y caían en el rango de símbolos).
