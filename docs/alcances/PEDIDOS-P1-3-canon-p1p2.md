# PEDIDOS P1-3 · Canon P1/P2 (mismo significado en app y web)

Canon único: P1 = Crédito, P2 = Contado (en toda la app, web y editores).
Contexto: el servidor NO usa P1/P2 para el precio (usa "condicion"), así que este cambio NO altera precio ni comisión; alinea el rótulo tipo_precio guardado y las etiquetas visibles, que hoy están al revés en la web.

A) sistema-web.html (hoy INVERTIDO — dejarlo canónico):
- TIPOS_PRECIO_WEB (~L1231-1233): dejar { id:"P1", nombre:"Crédito", ... }, { id:"P2", nombre:"Contado", ... }. Hoy dice P1:"Contado", P2:"Crédito".
- Selección de base (~L5572-5573): dejar  tipo==="P1" ? prod.baseCredito : tipo==="P2" ? prod.baseContado. Hoy está al revés (P1→baseContado).
- esCredito (~L5620): cambiar SOLO el token tipo==="P2" por tipo==="P1"; el resto de la expresión (P3/P5) NO se toca en este bloque (se revisa en P1-4/cupo). Queda: esCredito = tipo==="P1" || (tipo==="P3" && condP3==="credito") || tipo==="P5".
- "Repetir pedido" hardcode (~L5746): cambiar a tipo:"P1", tipoNombre:"Crédito", cond:"Crédito", credito:true. Hoy usa tipo:"P2".
- Revisar que ninguna otra etiqueta/visualización quede con el mapa viejo (el editor toma el nombre de TIPOS_PRECIO_WEB, así que se corrige solo).

B) freelance-completo.html (mapa invertido solo en el editor):
- TIPO_NOMBRE (~L6585): dejar {P1:"Crédito", P2:"Contado", ...}. Hoy dice {P1:"Contado", P2:"Crédito"}. Es solo la etiqueta visible del editor; la condicion guardada ya es fiel, no se toca esa lógica.

C) Comisionista.html y socio-comercial.html: ya están canónicos (P1=Crédito, P2=Contado). Verificar que sigan así; no cambiar.

NO tocar: el cálculo de precio/comisión, registrar_pedido_atomico, editar_pedido_atomico, ni la derivación de "condicion" (que ya usa el valor real).

Criterio de aceptación:
- Crear o editar a crédito guarda tipo_precio="P1" desde la app Y desde la web; a contado guarda "P2".
- Las etiquetas P1/P2 dicen lo mismo (P1=Crédito, P2=Contado) en app, editores y web.
- Precio y comisión de un caso conocido NO cambian.

Deja ancla /* PED_CANON_P1P2 */. Agrega/ajusta una prueba que verifique P1=Crédito y P2=Contado en app y web (y que caiga si se invierte). Valida, publica (VERSION + CACHE del sw), verifica deploy y avísame para probar en el celular.
