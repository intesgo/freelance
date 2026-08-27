# Alcance · Una sola sesión activa por cuenta (un dispositivo a la vez), salvo el dueño

## 1. Qué se cambia y por qué (una línea, negocio)
Cada cuenta se usa en **un solo equipo a la vez**. Si la misma cuenta entra en otro
teléfono/computadora, la sesión anterior **se cierra sola** con un aviso claro. Regla:
**«gana el último»**. **El freelance/admin queda exento**: puede usar varios equipos.

## 2. Reparto Cowork / Code
- **Parte A · base de datos (Cowork, NO Code):** columna `usuarios.sesion_id`, función
  `reclamar_sesion()` (devuelve un id nuevo y hace el `UPDATE`; devuelve **NULL** para
  freelance/admin), política de lectura de la propia fila, y Realtime activo en `usuarios`.
  A la fecha de este cambio **puede no estar aplicada todavía** → el front se construyó
  **defensivo** (ver §5).
- **Parte B · front (Code, este cambio):** llamar `reclamar_sesion` tras autenticar,
  guardar el id por app, vigilar y cerrar si cambia.

## 3. Archivos y puntos exactos (Parte B)
Helper (defensivo) + enganche tras autenticar, en cada app:

| App | Clave localStorage | Cliente | Enganche |
|---|---|---|---|
| `proveedor-freelance.html` (v75) | `sesion_id_prov` | `window.SB` | `verificarSesion`, tras `onAutenticado(...)` |
| `Comisionista.html` (v196) | `sesion_id_comi` | `window.SB` | efecto de `PuertaPortal`, tras `onAutenticado(...)` |
| `socio-comercial.html` (v63) | `sesion_id_socio` | `window.SB` | efecto de `PuertaPortal`, tras `onAutenticado(...)` |
| `transportista-app.html` (v38) | `sesion_id_transp` | `window.SB` | efecto de `PuertaPortal`, tras `onEntrar(...)` |
| `sistema-web.html` (b217) | `sesion_id_web` | `window.supa` | `App.acceder(...)` (real) **y** auto-restaurar sesión |

Cada helper trae tres piezas:
- `iniciarSesionUnica()` — `rpc("reclamar_sesion")`; si NULL/err → no guarda nada, sin
  control (dueño o base sin aplicar). Si id → lo guarda y **suscribe Realtime** a la propia
  fila (`UPDATE` con `filter: auth_uid=eq.<uid>`) + registra respaldo en `visibilitychange`.
- `chequearSesionUnica()` — respaldo: lee `usuarios.sesion_id` de la base y compara con el
  guardado; si difiere, cierra.
- `cerrarPorOtroDispositivo()` — borra la clave, quita el canal, avisa
  («Tu cuenta se abrió en otro dispositivo. Esta sesión se cerró.»), `signOut()` y recarga.

`sw.js`: `CACHE` → `freelance-v327`.

## 4. Qué NO se debe tocar
- **freelance-completo.html**: el dueño NO tiene control. No se le agregó el enganche
  (además la base devuelve NULL para él). Queda en **v479**, sin cambios.
- Permisos, roles, reglas de negocio, camino demo.
- El login propio del proveedor (Alcance 3): el enganche va **después** de autenticar,
  no cambia el formulario ni el flujo de ingreso.
- La regla de `version.json` siempre-de-red en `sw.js`.

## 5. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde
  (116 ✓). Arneses de versión ajustados: `test_cambios_419`, `test_cambios_422`,
  `test_fe01_tarifas`, `test_fe03_pagos` (CACHE v327 + versiones nuevas).
- En el celular (cuando la Parte A esté aplicada): entrar con la misma cuenta en dos
  equipos; el primero debe cerrarse solo con el aviso. Con el dueño (freelance), ambos
  equipos siguen abiertos.

## 6. Trampas conocidas
- **Depende de la Parte A (Cowork).** Sin la función/columna/Realtime, el control **no
  actúa todavía** — pero por diseño defensivo la app **entra igual que siempre**, nadie
  queda afuera. Cuando Cowork aplique la Parte A, el control empieza a funcionar sin tocar
  el front.
- **Realtime puede no estar activo** en `usuarios`: por eso el respaldo por
  `visibilitychange` y por chequeo al abrir es **obligatorio** (ya incluido).
- **Clave por app**: cada app usa su propia clave de localStorage para no pisarse con otra
  app abierta en el mismo navegador.
- Publicar **VERSION + CACHE juntos** y ajustar los arneses atados a versión (hecho).
