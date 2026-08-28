# Alcance · Sistema Web · Fase 4 · `docs_ok` es DERIVADO (dejar de editarlo a mano)

La base YA deriva `clientes.docs_ok` de `documentos_cliente` (documentos con archivo real),
lo recalcula un trigger, y el candado IGNORA en silencio cualquier `docs_ok` que mande el front.
**Code no toca la base**: este cambio es solo front, para que el Sistema Web deje de tratar
`docs_ok` como interruptor manual y refleje los documentos reales.

## 1. Qué se cambia y por qué (negocio)
Que el expediente de crédito se cuente solo por los documentos con archivo cargado (no por un
marcado a mano que ya no tiene efecto), y que el expediente deje de bloquear el guardado del
cliente (el crédito ya se gobierna por líneas de crédito, Fase 2).

## 2. Qué se cambió (`sistema-web.html`, b229) — ancla `F4_DOCS_DERIVADO`
- **Badges de la pestaña Expediente (editor):** «entregado» = `exp.subidos.includes(i)` (documento
  con archivo real en el bucket `expedientes-credito`), no `form.docsOk`. El número y el texto ya
  **no se tocan** para marcar (solo lectura); el archivo se sube/ve/elimina con `BotonExpediente`.
  Mismo criterio que la ficha de solo lectura, que ya lo hacía así.
- **Cabecera del expediente:** muestra un **conteo derivado de solo lectura** «N de 7 documentos
  con archivo» y se corrigió el texto de ayuda (ya no dice «toca para marcar entregado»).
- **Guardado del cliente:** se quitó `docs_ok: c.docsOk || 0` del payload de UPDATE (la base lo
  deriva/ignora). También se dejó de cargar `r.docs_ok` a `form.docsOk` (ya no se lee).
- **Gate «Expediente incompleto» (`faltaEnTab`/`primeraIncompleta`):** el expediente **ya no
  bloquea el guardado**. El aviso ⚠/✓ de la pestaña sigue mostrando cuántos documentos faltan
  (contando `exp.subidos`), pero no impide guardar.

## 3. Qué NO se tocó
- Base, RLS, triggers, ni las apps móviles (no usan `docs_ok`). No se tocó la lógica de crédito
  (va por líneas de crédito), ni el bucket/gestor real de archivos (`useExpediente`), ni la ficha
  de solo lectura (que ya derivaba de `exp.subidos`).

## 4. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde (116 ✓).
- VERSION Sistema Web **b229** + CACHE **v339**; arneses de versión al día.
- En intesgo.app/home: al editar un cliente de crédito, la pestaña Expediente muestra «N de 7 con
  archivo», los documentos ✅ solo cuando tienen archivo, no hay marcado a mano, y el cliente se
  guarda sin trabarse aunque falten documentos.

## 5. Trampas conocidas
- La base ignora/deriva `docs_ok`: no depender de escribirlo. La verdad la da `documentos_cliente`.
- **Ojo (para Cowork):** el front sube archivos al **bucket de storage** `expedientes-credito`
  (`useExpediente`), mientras la base deriva `docs_ok` de la **tabla** `documentos_cliente`. Si esos
  dos almacenes no están sincronizados, el conteo del front (`exp.subidos`) y el `docs_ok` de la base
  pueden no coincidir. El front ahora muestra su propio conteo real (archivos cargados) de forma
  coherente con los botones Subir/Ver/Eliminar. Si se requiere que ambos hablen del mismo lugar,
  eso es trabajo de base (Cowork), no de Code.
- Antes de este cambio, exigir 7/7 en un cliente NUEVO era un callejón sin salida: los documentos
  solo se pueden subir **después** de guardar el cliente. Por eso el expediente ya no bloquea guardar.
- Publicar VERSION + CACHE juntos o el robot no publica.
