# Alcance · DISENO_PRECIO_ADICIONAL — un solo editor por marca

> Archivo: `sistema-web.html` · componente `PiladorasWeb`, pestaña **Precios → «Por marca»**.
> Solo PRESENTACIÓN/UX de captura. No cambia ninguna regla de costo, base, margen ni
> equivalencia; solo **cómo se capturan** los números. Supabase no se toca (los adicionales
> NO se guardan: se derivan).

## Qué se cambia y por qué

Antes cada **presentación** tenía su propio «Editar», sus cuatro campos y su propio
Cancelar/Guardar. Para una marca con quintal y arroba eran dos ediciones y dos guardados
para una sola decisión.

Ahora hay **un solo editor por MARCA**:
- El **quintal** es la presentación base: conserva sus cuatro campos (Costo contado/crédito,
  Base contado/crédito) y el atajo «Base = Costo + 12%».
- Cada **otra presentación** deja de tener campos de precio y pasa a tener dos campos
  **«adicional» en $/quintal** (al costo y a la base). Su precio se **calcula**:
  `precio = (precio_del_quintal + adicional) × equiv_qq`.
- **Un solo** Editar, **un solo** Cancelar, **un solo** Guardar.

Dos adicionales (costo y base), no uno: hay presentaciones reales con recargo **solo en la
base** (fundas de 10 lb), y un adicional único inflaría también el costo y se comería el
margen. **No se guarda ningún adicional**: se derivan de los precios vigentes al abrir el
editor (desde el crédito, la columna que manda), igual criterio que el precio por variedad.

## Archivos y puntos (todo en `PiladorasWeb`)

- Estado: `edit` pasa de `ofertaId` a `prodId` (marca); `form` suma
  `adic:{ [presCod]:{costo,base} }`. Nuevo `okMarca` (aviso de éxito).
- `abrirEditarMarca(pid)`: siembra los adicionales desde los precios vigentes; abre el editor
  y despliega la marca.
- `guardarFila`: guarda TODA la marca. Quintal con sus cuatro campos; las demás con la
  fórmula. **Solo versiona lo que cambia** (compara con `r2`). Todas las escrituras comparten
  el **mismo código de auditoría** y `operacion: "Costo/Base por marca"`, y pasan por la
  puerta única `versionarOfertaWeb` (regla `keep`: campo vacío o 0 en el quintal mantiene el
  valor anterior; en los adicionales el 0 es legítimo = «sin recargo»).
- Render: el «Editar» sube a la cabecera de la marca; el quintal se rotula «base de cálculo»;
  las demás muestran dos adicionales + los cuatro números calculados en vivo (solo lectura) +
  la equivalencia; un solo «Antes → Ahora» agrupado por presentación; un solo Cancelar/Guardar.

## Qué NO se toca

- `versionarOfertaWeb` (se USA, no se modifica); su criterio mismo-día vs versionado.
- La pestaña «Por variedad» y la propagación por variedad; «Ajustar por grano» y la casilla
  «excluir del ajuste»; el historial por presentación (`verHistorial`); el candado
  `soloLectura` (sin Freelance no se pinta ningún «Editar»); la vista plegada y el resumen.
- No se crea ninguna tabla ni columna; los adicionales se derivan.

## Cómo verificar

```bash
node scripts/compilar.js
node pruebas/test_precio_adicional.js sistema-web.html
node pruebas/pruebas.js rapido
node pruebas/test_piladoras_costos.js && node pruebas/test_precio_una_puerta.js
```

En el navegador (Precios → «Por marca», rol Freelance), sobre un arrocillo con quintal y
arroba: abrir el editor, ver la arroba con adicional 0 y sus números actuales; poner
adicional al costo 1 y comprobar que el costo crédito de la arroba pasa a 4,75 y la base NO
se mueve; guardar y ver «… · N presentación(es) actualizada(s)».

## Trampas conocidas

- El adicional está en **$/quintal**: se suma al precio del quintal ANTES de multiplicar por
  la equivalencia (si se suma después, un +1 pondría la arroba en 5,50 en vez de 4,75).
- Los adicionales **no se persisten**: se derivan al abrir; persistirlos los desfasaría en
  cuanto alguien edite un precio por otro camino (ajuste por grano, variedad).
- Admitir adicionales **negativos** (un empaque puede ir más barato por quintal equivalente);
  no exigir > 0. Distinguir campo vacío de campo en cero.
- No versionar presentaciones que no cambian (si no, cada guardado apila una versión por
  presentación aunque solo se toque el quintal). Nota: si el **contado** de una presentación
  traía una desviación de redondeo distinta del crédito, al guardar se normaliza — el
  «Antes → Ahora» lo muestra.
- `ofsOrden` ya ordena por equivalencia descendente (quintal primero): no reordenar.
