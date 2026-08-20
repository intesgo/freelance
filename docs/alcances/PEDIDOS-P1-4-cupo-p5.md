# PEDIDOS P1-4 · Cupo de crédito y piso de P5 (igualar app y web)

Contexto: hoy la web bloquea el exceso de cupo y cuenta mal (incluye contado y P5); y no hay piso de P5 en la app. Decisiones del dueño: exceso de cupo = PERMITIR CON AUTORIZACIÓN (como la app); P5 bajo costo = BLOQUEAR. El costo/piso del ítem es la BASE de la oferta (la piladora); el flete/estibada NO entran al piso porque ya se cobran aparte (fe02).

A) CUPO DE CRÉDITO — sistema-web.html
- El expuesto de crédito debe contar SOLO las líneas a crédito del carrito. Excluir contado y P5. (Hoy excedeCupo usa totalCarrito ~L5622, que suma todo.) Espejar la app (freelance-completo.html ~L6688-6690 filtra solo crédito).
- NO bloquear por exceso: cambiar el bloqueo de `valido` (~L5627) por autorización, igual que la app: requiereAutorizacion = esP5 || excedeCupo (app ~L6694). El pedido se puede armar; queda "por autorizar".
- Ancla /* PED_CUPO_WEB */.

B) PISO DE P5 — bloquear bajo costo, en app y web
- Definición del piso: precio del ítem P5 debe ser >= BASE de la oferta (costo de la piladora según la condición). NO sumar flete/estibada (van aparte, fe02).
- sistema-web.html: ajustar pisoUnidad (~L5601) para que sea la BASE (quitar el + (flete+estibada)*equiv, que hoy doble-cuenta); mantener el bloqueo bajoPiso para P5 (~L5604).
- freelance-completo.html: agregar el piso de P5 que hoy NO tiene (~L6707-6708 precioOk/p5Ok): bloquear si el precio P5 < base. Mantener que P5 siga yendo a autorización.
- Ancla /* PED_PISO_P5 */.

NO tocar: el cálculo de precio/comisión del servidor, ni registrar_pedido_atomico/editar_pedido_atomico, ni la condicion (ya usa el valor real).

Criterio de aceptación:
- Un carrito con líneas de contado NO reduce el cupo; P5 tampoco.
- Un pedido a crédito sobre el cupo se puede armar y queda "por autorizar" en app Y web (mismo resultado, no se bloquea en un canal y se permite en otro).
- Un P5 por debajo de la base (costo de la piladora) se bloquea en app Y web.
- Precio y comisión de casos normales no cambian.

Deja las anclas indicadas. Agrega/ajusta pruebas que verifiquen: contado no consume cupo, exceso→autorización en ambos canales, y P5<base bloqueado en ambos. Valida, publica (VERSION + CACHE del sw), verifica deploy y avísame para probar en el celular.
