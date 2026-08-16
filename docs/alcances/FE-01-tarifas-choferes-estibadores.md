# FE-01 · Tarifas, Chóferes y Estibadores (lo arma el freelance)

ESTADO: publicado (Sistema Web · b162). La App Freelance quedó para una segunda entrega.
APPS: `sistema-web.html` (Sistema Web). La App Freelance (`freelance-completo.html`) no se tocó en esta entrega.
BASE: no crea tabla nueva. Escribe en la tabla existente `tarifas_fe` (y en `usuarios` /
`estibadores` según el módulo). El freelance ya tiene permiso de escritura por ficha (RLS
abierta a ficha). **No cambiar permisos.**

## Qué se cambia y por qué

El freelance arma desde su lado las **tarifas de logística**: cuánto se cobra al cliente
por zona (flete y estibada), y cuánto cuesta cada chofer y cada estibador. Es lo que la
Fase 2 del pedido consume para calcular la logística.

## Versionado de tarifas (aplica a las TRES pantallas)

Al editar una tarifa **NO se sobreescribe**:

- Si la fila vigente tiene `vigente_desde = hoy`, se **actualiza en sitio** (evita el
  choque de misma fecha).
- Si la fila vigente es de **otro día**, se **cierra** (`vigente_hasta = hoy`) y se
  **inserta** una nueva con `vigente_desde = hoy`.
- Siempre queda historial.

## Dónde

### 1) Tarifas por zona (cobro al cliente) — ancla `/* FE01_TARIFAS_ZONA */`
Lista de zonas (tabla `zonas`), cada una con **Flete** y **Estibada** en `$/qq`, con
**Editar** e **Historial**.
Guarda: `concepto ('flete'|'estibada')`, `ambito='zona'`, `zona_id`, `valor_qq`.

### 2) Módulo Chóferes — ancla `/* FE01_CHOFERES */`
Lista de choferes (`usuarios` con `rol='transportista'`) con **placa**, **capacidad** y su
**tarifa de flete por zona**.
- **Agregar chofer:** nombre, cédula, teléfono, correo (para su acceso), placa, capacidad.
  **Reusar el alta de usuarios** que ya tiene el sistema (crea el usuario transportista con
  acceso a la app; NO inventar un alta nuevo). En la base los choferes son usuarios (traen
  `placa` y `capacidad_qq`).
- **Tarifa por zona:** filas zona → `$/qq`. Guarda `concepto='flete'`, `ambito='persona'`,
  `persona_id = usr_id` del chofer, `zona_id`, `valor_qq`. Cada chofer con la suya (no es
  igual para todos).
- **Ocultar/reactivar** con `usuarios.activo` (mismo patrón que piladoras), sin borrar.

### 3) Módulo Estibadores — ancla `/* FE01_ESTIBADORES */`
Lista de estibadores (tabla `estibadores`) con su **tarifa única**.
- **Agregar estibador:** nombre, cédula, teléfono → inserta en `estibadores` (`activo=true`).
  **Sin login.**
- **Tarifa única (general):** un solo valor, igual para todas las zonas. Guarda
  `concepto='estibada'`, `ambito='persona'`, `persona_id = est_id`, `zona_id = NULL`,
  `valor_qq`.
- **Ocultar/reactivar** con `estibadores.activo`.

## Qué NO se debe tocar

- Nada de permisos/RLS.
- Otros roles y otras apps (Comisionista, socio, proveedor, transportista).
- El camino demo.
- La Fase 2 del pedido: esta pantalla **produce** las tarifas que ella lee; no se toca su
  lógica de cálculo.

## Cómo verificar

- `node scripts/compilar.js` (las 6 apps compilan) y `node pruebas/pruebas.js rapido` en verde.
- Subir `VERSION` de `sistema-web.html` y de `freelance-completo.html`, y `CACHE` en `sw.js`,
  en el mismo cambio; ajustar los arneses atados a versión.
- En el celular / web: abrir el módulo, editar una tarifa dos veces el mismo día (debe
  quedar una sola fila vigente), agregar un chofer y un estibador, ocultar y reactivar.

## Trampas conocidas

- **Escritura nueva a `usuarios` y `estibadores`:** hasta ahora la app las leía. El alta de
  usuarios debe **reusar** el flujo existente del sistema, no inventar uno.
- **Versionado:** el choque de "misma fecha" es real — por eso la regla de actualizar en
  sitio cuando `vigente_desde = hoy`.
- **`ambito`/`persona_id`/`zona_id`:** la estibada por persona va con `zona_id = NULL`; el
  flete por chofer va con `zona_id` por fila.
- Arneses de versión/diseño atados a la pantalla tocada: revisar y ajustar en el mismo cambio.
