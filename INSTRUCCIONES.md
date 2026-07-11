# 📱 Publicar FREELANCE en internet — paso a paso desde tu teléfono

Tiempo total: **10–15 minutos**. Todo se hace desde el navegador del celular. Costo: **$0**.

---

## Paso 1 · Crear la cuenta de GitHub (si no tienes)

1. Entra a **github.com/signup**
2. Correo, contraseña y un nombre de usuario (ese nombre saldrá en tu URL — elige uno serio, ej. `freelanceec`)
3. Confirma el correo que te llega

## Paso 2 · Crear el repositorio

1. Toca el **+** (arriba a la derecha) → **New repository**
2. Nombre: **freelance**
3. Marca **Public** (necesario para Pages gratis)
4. Toca **Create repository**

## Paso 3 · Subir los archivos de esta carpeta

1. En el repositorio: **Add file → Upload files**
2. Sube TODOS los archivos de esta carpeta:
   - `index.html` (la portada)
   - `Comisionista.html`, `socio-comercial.html`, `freelance-completo.html`, `proveedor-freelance.html`, `transportista-app.html`
   - `sw.js` y `.nojekyll`
3. Abajo toca **Commit changes**

> Si el teléfono no te deja seleccionar varios, súbelos en tandas — GitHub los va acumulando.

## Paso 4 · El robot anti-pausa (archivo especial)

Este va aparte porque vive en una carpeta oculta:

1. **Add file → Create new file**
2. En el nombre escribe EXACTO: `.github/workflows/ping.yml` (GitHub crea las carpetas solo al poner las barras)
3. Abre el archivo `ping.yml` de esta carpeta, copia TODO su contenido y pégalo
4. **Commit changes**
6
## Paso 5 · Encender Pages

1. En el repositorio: **Settings → Pages** (menú lateral)
2. En "Build and deployment" → Source: **Deploy from a branch**
3. Branch: **main** · Carpeta: **/ (root)** → **Save**
4. Espera 1–3 minutos y recarga: arriba aparecerá tu URL

## 🎉 Tu URL oficial

```
https://TU-USUARIO.github.io/freelance/
```

Esa dirección abre la **portada** con las 5 apps. Compártela con tu equipo; cada quien entra a la suya.

---

## Qué se enciende automáticamente al publicar

| Beneficio | Cómo |
|---|---|
| 🔔 Avisos en la bandeja del teléfono | El `sw.js` se registra solo al detectar HTTPS |
| 💾 Cola offline 100% garantizada | El almacenamiento del navegador queda estable |
| 🤖 Base sin pausas | El robot toca Supabase todos los días a las 06:15 |
| 📲 "Instalar" las apps | Menú del navegador → *Agregar a pantalla de inicio* |

## Recuerda

- **El Sistema Web central NO va aquí** — muestra tu operación real; se publica cuando activemos el inicio de sesión (Fase 4)
- Las apps publicadas usan **datos de demostración** — perfectas para que el equipo practique
- Cuando actualicemos una app, solo subes el archivo de nuevo (mismo nombre) y listo
publicado el 10/07/2026
