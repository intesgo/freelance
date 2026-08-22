# DISEÑO · Pantalla CLIENTES a la línea ERP

Solo estilo (`sistema-web.html`), sobre la base `/* DISENO_BASE_ERP */`. Ancla
`/* DISENO_CLIENTES_ERP */`. NO se tocó lógica, datos, nombres ni comportamiento.
Componentes: `ClientesWeb` y `FichaCliente`.

## Qué se hizo
Se cambió SOLO la apariencia: emojis → `<Ico>`, tarjetas/chips limpios con la paleta `COLOR`,
avatar en chip `tealLight` con icono. Misma información, mismos campos, mismas secciones y
acciones. No se quitó ni reordenó ningún dato.

- **Iconos.** Se agregaron a `ICONS` los que faltaban (calendar, clock, creditCard, userCheck,
  edit, check, x, paperclip, chevronLeft). Reemplazos:
  - Buscador: `<Ico search>` dentro del input.
  - Tarjetitas (11, intactas): Código→clipboard · Tipo→users · RUC→idCard · Ciudad→mapPin ·
    Condición→creditCard · Cupo→banknote · Última compra→calendar · Cada cuánto→clock ·
    Ranking→award · Cartera→fileText · Lo atendió→userCheck.
  - Acciones: Nuevo pedido→cart · Ver historial→chart · Ver cartera→wallet · Ver datos→fileText.
  - Veredicto: ✓→check (verde) / ✕→x (rojo); texto y motivo intactos.
  - Ficha: avatar 🏢→building / 👤→users · Editar→edit · Volver→chevronLeft · Inicio→home ·
    Expediente→clipboard · ✅→check / 📎→paperclip · ubicación→mapPin · recibe mercadería→package.
- **Estilo del molde.** Tarjetas `card`+`border`+`radius`, chips píldora, veredicto en franja
  suave (verde/rojo), avatar en chip `tealLight`. El medidor de cupo conserva su barra y color.
- **Indicadores de fuente y estado** (🟢/⚪/●): pasaron a un punto de color CSS con tokens de
  `COLOR` (verde=supabase/activo, gris=demo, rojo=bloqueado); misma semántica y lógica.
- Se conservan las **5 pestañas** (General, Ubicación, Fiscal, Crédito, Comercial) y todos sus
  campos/secciones.

## Qué NO se toca
De dónde salen los datos (Supabase), el chip DEMO, el buscador predictivo, las acciones, los
colores de estado por documento en la cartera (semánticos de datos), el cálculo del
veredicto/cupo, ni el responsive (`useEsMovil`/`angosto`, 2 columnas en móvil).

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde (111).
- `test_ficha_cliente.js` (ACTUALIZADO): validaba textos con glifos `← Buscar otro cliente` y
  `● Activo`/`● Bloqueado`; ahora que son icono/punto CSS, las aserciones y el `__tocar` leen
  el texto sin el glifo. Los mutantes de negocio (veredicto/cupo/cartera/responsive) siguen
  cayendo → el comportamiento quedó intacto.
- Guards de fuente en `test_cambios_422.js`: ancla en ambas funciones, sin emojis renderizados,
  y uso de los iconos del molde en las tarjetitas.

## Versiones
Sistema Web b184, caché `freelance-v281`.

## Trampas conocidas
- `test_ficha_cliente.js` está atado al diseño de la vista de resultado de `ClientesWeb`: al
  quitar los glifos `←`/`●` había que actualizar sus aserciones y el `__tocar` en el mismo
  cambio (§4). El resto (contenido/negocio) no cambió.
- Un `✓` que estaba a media frase de un párrafo de ayuda ("(✓ Liberada)") se dejó como
  "(Liberada)" (meter un SVG a media frase partía el renglón); único texto tocado, sin datos.
