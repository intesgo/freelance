# Alcances

Aquí vive lo que hay que construir. Cada archivo es **un trabajo**: lo escribe Claude en
Cowork (que investiga y revisa la base) y lo construye Claude Code (que edita las apps,
prueba y publica). El reparto completo está en `CLAUDE.md` §9.

## Cómo se lee esto

- Un archivo por trabajo, nombre corto y hablado: `pedido-editor-completo.md`,
  `logistica-cerrar-escritura-directa.md`.
- Cuando el trabajo está **publicado y verificado**, se marca `ESTADO: publicado` arriba y
  se deja como historia. No se borra: sirve para saber por qué las cosas son como son.

## Formato

```markdown
# <Nombre del trabajo>

ESTADO: pendiente | en curso | publicado
APPS: freelance-completo.html, Comisionista.html
BASE: no toca la base  ·  (o) usa las funciones X e Y, ya aplicadas

## Qué se cambia y por qué
Una o dos líneas, en lenguaje de negocio. Qué gana quien usa la app.

## Dónde
Archivo, función o componente, con números de línea de referencia (pueden haberse
corrido: son una guía, no una dirección exacta).

## Qué NO se debe tocar
Lo que tiene que seguir igual: el camino demo, otros roles, otras apps, la lógica de
permisos, los arneses que no correspondan.

## Cómo verificar
Qué pruebas correr y qué mirar en el celular después de publicar.

## Trampas conocidas
Lo que ya se revisó y lo que puede morder. Aquí van los hallazgos del trabajo previo:
"esta tabla la escriben 3 apps", "esta variable se usa en 3 lugares", "este arnés está
atado a la versión".
```

## Por qué existe esta carpeta

Porque el error caro no suele ser escribir mal el código, sino **construir sobre un supuesto
que nadie verificó**. El alcance es donde queda esa verificación por escrito, para que quien
construye no tenga que redescubrirla — y para que, si algo se rompe, se sepa qué se había
revisado y qué no.
