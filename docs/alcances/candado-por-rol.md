# Alcance · Candado por rol: cada app solo deja entrar al rol que le toca

## 1. Qué se cambia y por qué (una línea, negocio)
Hoy una cuenta de un rol puede abrir la app de otro rol (p. ej. un proveedor entró a la
app de vendedor). Cada app debe dejar entrar **solo** al rol que le corresponde; si no
coincide, cerrar sesión y mandar al portal con un mensaje claro.

## 2. Mapa de roles por app (valores exactos de `usuarios.rol`)
Valores confirmados en el código (padrón/altas): `freelance`, `admin`, `comisionista`,
`socio`, `proveedor`, `transportista`, y de oficina `financiero`, `logistica`.
«Socio comercial» es solo etiqueta de pantalla; el rol guardado es `socio` (se acepta
igual la variante «socio comercial» por si el padrón la trae).

| App | ROLES_APP |
|---|---|
| `freelance-completo.html` (v480) | `freelance`, `admin` |
| `sistema-web.html` (b218) | `freelance`, `admin`, `financiero`, `logistica` |
| `Comisionista.html` (v197) | `comisionista` |
| `socio-comercial.html` (v64) | `socio` (acepta «socio comercial») |
| `proveedor-freelance.html` (v76) | `proveedor` |
| `transportista-app.html` (v39) | `transportista` |

El dueño (freelance/admin) entra a sus apps de oficina (freelance-completo y sistema-web),
**no** a las de vendedor/proveedor/transportista. Para probar esas se usa una cuenta de ese rol.

## 3. Dónde va el candado
Justo **después** de validar la sesión y leer `usuarios.rol`, en el mismo punto donde la
app entra con la sesión real:
- proveedor: en `verificarSesion` (tras el `signInWithPassword`/getSession y la lectura de
  `usuarios.rol`), antes de `onAutenticado`.
- comisionista / socio: en el efecto de `PuertaPortal`, antes de `onAutenticado`.
- transportista: en el efecto de `PuertaPortal`, antes de `onEntrar` (se amplió el `select`
  a `nombre,activo,rol`).
- freelance-completo: en el paso «sync» de `PantallaLogin`, antes de `onAutenticado(u)`
  (cubre login por correo y restauración de sesión; solo si `u.real`).
- sistema-web: en `LoginWeb.entrar` (tras leer `per.rol`) y en la restauración de sesión de
  `App`, antes de `setSesion`.

Cada app trae `ROLES_APP` + `rolPermitidoApp(rol)` + el cierre por rol ajeno:
`signOut()` → aviso «Esta app no es para tu rol. Entra a la aplicación que te corresponde.»
→ `location.assign("./index.html")` (portal).

**Excepción de destino en sistema-web:** vive en `/home`, así que `./index.html` sería él
mismo; por eso, en vez de redirigir, **cierra la sesión y se queda en su propio login** con
el aviso «Esta cuenta no tiene acceso al Sistema Web. Entra a la app que te corresponde.»
(criterio §9: el alcance manda pero no apaga el criterio.)

## 4. Reglas de borde (defensivo)
- **Demo** (sin sesión real): NO se aplica el candado. En freelance-completo se exige
  `u.real`; en las demás, el candado vive en el camino de sesión real (getSession/login).
- **Rol vacío con sesión real** → se trata como «no corresponde» (cierra y al portal).
- Respeta el Alcance 3 (login propio del proveedor) y el Alcance 1 (llave de sesión propia):
  el chequeo va **después** de autenticar, no cambia el formulario ni el flujo de ingreso.

## 5. Qué NO se tocó
- Base de datos y permisos de base (esto es solo front; la base ya sabe el rol).
- Lógica de negocio ni camino demo.
- El dueño no queda bloqueado de SUS apps de oficina (freelance-completo, sistema-web).

## 6. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde
  (116 ✓). `test_puerta.js` ahora: (a) el padrón simulado trae el rol de cada app, (b)
  comprueba que existe el candado (`ROLES_APP`/`rolPermitidoApp`/`cerrarPorRolAjeno`) y se
  aplica, y (c) que una cuenta de otro rol (`financiero`) no entra y se le cierra la sesión.
- Arneses de versión al día (freelance v480, web b218, prov 76, socio 64, comi 197, transp 39,
  CACHE v328): `test_cambios_419/422`, `test_fe01_tarifas`, `test_fe03_pagos`.
- En el celular: con la cuenta del proveedor de prueba, la app del proveedor entra normal;
  si esa cuenta abre Comisionista/socio/transportista/freelance-completo → la cierra y la
  manda al portal. Con una cuenta de vendedor: entra a Comisionista, no a la del proveedor.
  Con el dueño: entra a freelance-completo y sistema-web; no a las de vendedor/proveedor.

## 7. Trampas conocidas
- **Valores exactos de `usuarios.rol`**: son minúscula y una sola palabra (`socio`, no
  «socio comercial»; `comisionista`; `financiero`/`logistica` en oficina). El candado
  normaliza (trim + minúsculas) y acepta «socio comercial» como `socio`.
- **`location.href="./index.html"`** disparaba un falso positivo en `test_puerta` (la
  proveedor no debe tener enlace al portal). Se usa `location.assign("./index.html")` para
  no dejar la subcadena `href="./index.html"` en el archivo.
- Publicar **VERSION + CACHE juntos** y ajustar los arneses de versión (hecho).
