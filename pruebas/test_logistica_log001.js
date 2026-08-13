#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   LOGÍSTICA (sistema-web.html · TrazabilidadWeb) CONECTADA A LOG-001

   La pantalla de Logística dejó de sostenerse con datos inventados
   (LOG_RUTAS_INI, que ahora es SOLO para el modo demo) y quedó enganchada a las
   funciones de base de LOG-001: crear_ruta, actualizar/confirmar orden,
   agregar/quitar pedido, anular ruta y cerrar la ruta al despachar.

   Esta prueba vigila los enganches clave, sin navegador:
     · guardarRuta llama a crear_ruta y ya NO fabrica el id con Date.now();
     · el despacho, además del viaje, llama a cerrar_ruta_despachada;
     · las otras RPC de LOG-001 están enlazadas;
     · el sello «sin factura» de "Escoger pedidos" desapareció (el candado del
       despacho, que sí exige factura, se conserva);
     · cada acción usa un op_id (crypto.randomUUID) con candado (useRef), y se
       relee la ruta desde la base tras cada operación;
     · las rutas se cargan de rutas_logisticas + ruta_pedidos con 5 estados.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const web = fs.readFileSync(path.join(__dirname, "..", "sistema-web.html"), "utf8");

let bien = 0, mal = 0;
const prueba = (ok, msg) => { if (ok) bien++; else { mal++; console.error("✗ " + msg); } };

/* ── 1) guardarRuta → crear_ruta, sin id con Date.now ── */
prueba(/const guardarRuta = async/.test(web), "guardarRuta debe ser asíncrona (llama a la base)");
prueba(/correrRpc\("crear_ruta"/.test(web), "guardarRuta debe llamar a crear_ruta");
prueba(!/id:\s*"R-"\s*\+\s*Date\.now/.test(web), "guardarRuta NO debe fabricar el id con Date.now()");

/* ── 2) Despacho → además del viaje, cerrar_ruta_despachada ── */
prueba(/correrRpc\("cerrar_ruta_despachada"/.test(web), "el despacho debe llamar a cerrar_ruta_despachada");
prueba(/from\("viajes"\)\.insert/.test(web), "el despacho debe seguir creando el viaje (LOG-002 intacto)");
prueba(/from\("viaje_guias"\)\.insert/.test(web), "el despacho debe seguir creando las guías (LOG-002 intacto)");

/* ── 3) El resto de acciones LOG-001 enlazadas ── */
["actualizar_orden_ruta","confirmar_orden_ruta","agregar_pedido_ruta","quitar_pedido_ruta","anular_ruta"]
  .forEach(fn => prueba(new RegExp('correrRpc\\("'+fn+'"').test(web), "debe estar enlazada la RPC " + fn));

/* ── 4) El sello «sin factura» ya no está (pero el candado del despacho sí) ── */
prueba(!/sin factura<\/span>/.test(web), "el chip «sin factura» de escoger pedidos debe desaparecer");
prueba(!/sin factura aún/.test(web), "el contador «(N sin factura aún)» debe desaparecer");
prueba(/EL CAMIÓN NO PUEDE SALIR TODAVÍA/.test(web), "el candado del despacho (exige factura) se conserva");

/* ── 5) Idempotencia, candado y relectura ── */
prueba(/crypto\.randomUUID\(\)/.test(web), "cada acción debe generar un op_id con crypto.randomUUID()");
prueba(/opLock\s*=\s*React\.useRef\(false\)/.test(web), "debe haber un candado con useRef para no disparar dos veces");
prueba(/const recargarRutas = async/.test(web), "debe existir recargarRutas (relee la ruta tras cada operación)");
prueba(/await recargarRutas\(\)/.test(web), "tras las operaciones se debe releer con recargarRutas()");

/* ── 6) Carga real y 5 estados ── */
prueba(/from\("rutas_logisticas"\)/.test(web), "las rutas deben salir de rutas_logisticas");
prueba(/ruta_pedidos\(/.test(web), "las rutas deben traer sus ruta_pedidos");
["cargando","vivo","sin","error","sin_sesion"].forEach(e =>
  prueba(new RegExp('estadoRutas(===|==="?)?"?'+e).test(web) || new RegExp('"'+e+'"').test(web),
    "debe existir el estado de rutas: " + e));
prueba(/No hay rutas armadas/.test(web), "debe mostrarse «No hay rutas armadas» cuando la consulta real viene vacía");
prueba(/mapped\.length \? "vivo" : "sin"/.test(web) && /nunca se vuelve a LOG_RUTAS_INI/.test(web),
  "tras una consulta real vacía queda en «sin», no se vuelve al demo");

/* ── 7) Errores por código, no crudos de Postgres ── */
prueba(/SIN_SESION/.test(web) && /ROL_NO_AUTORIZADO/.test(web) && /PEDIDO_YA_ASIGNADO/.test(web),
  "los errores deben traducir los códigos (SIN_SESION, ROL_NO_AUTORIZADO, …)");

/* ── 8) Anulación de despacho conectada a anular_viaje (sin código en ESE flujo) ── */
const anulDesp = (web.match(/const confirmarAnularDespacho = async[\s\S]*?\n  const /) || [""])[0];
prueba(/correrRpc\("anular_viaje"/.test(anulDesp), "confirmarAnularDespacho debe llamar a anular_viaje");
prueba(!/CODIGO_ANULACION_FREELANCE/.test(anulDesp), "el flujo de anular despacho ya NO debe usar el código de autorización");
prueba(/const CODIGO_ANULACION_FREELANCE = /.test(web), "la constante CODIGO_ANULACION_FREELANCE NO debe borrarse (otras anulaciones la usan)");
prueba(/p_op_id:\s*anulaDesp\.opId/.test(web), "la anulación de despacho debe usar el op_id generado al abrir el diálogo");
prueba(/opId:\s*crypto\.randomUUID\(\)/.test(web), "el op_id de anular despacho se genera una sola vez al abrir (crypto.randomUUID)");
prueba(!/anulaDesp\.codigo/.test(web), "el diálogo de anular despacho ya no debe leer un código");
prueba(/VIAJE_CON_ENTREGAS/.test(web) && /VIAJE_YA_ANULADO/.test(web) && /VIAJE_NO_ENCONTRADO/.test(web),
  "deben estar los mensajes claros por código de anular_viaje");

/* ── 9) Novedades (Logística) conectadas a la base ── */
prueba(/const recargarNovedades = async/.test(web), "Novedades debe cargar de la base (recargarNovedades)");
prueba(/from\("novedades"\)/.test(web), "Novedades debe consultar la tabla novedades");
["gestionar_novedad","resolver_novedad","anular_novedad"].forEach(fn =>
  prueba(new RegExp('correrRpc\\("'+fn+'"').test(web), "debe estar enlazada la RPC " + fn));
prueba(/setNvResolver\(\{ id:n\.id, texto:"", opId:crypto\.randomUUID\(\) \}\)/.test(web), "el diálogo de resolver debe generar el op_id al abrir");
prueba(/setNvAnular\(\{ id:n\.id, motivo:"", opId:crypto\.randomUUID\(\) \}\)/.test(web), "el diálogo de anular novedad debe generar el op_id al abrir");
prueba(/Resolver DIRECTO desde 'reportada'/.test(web), "se debe poder resolver directo desde 'reportada'");
const nvAnul = (web.match(/const nvConfirmarAnular = async[\s\S]*?\n  const /) || [""])[0];
prueba(!/CODIGO_ANULACION_FREELANCE/.test(nvAnul), "anular novedad ya NO debe exigir el código del Freelance");
prueba(!/nvAnular\.codigo/.test(web), "el diálogo de anular novedad ya no debe leer un código");
prueba(/const \[estadoNov,/.test(web) && /No hay novedades/.test(web), "Novedades debe tener 5 estados (incluye vacío «No hay novedades»)");
prueba(/RESPUESTA_OBLIGATORIA/.test(web) && /NOVEDAD_YA_CERRADA/.test(web) && /NOVEDAD_NO_REPORTADA/.test(web) && /NOVEDAD_NO_ENCONTRADA/.test(web),
  "deben estar los mensajes claros por código de las novedades");
prueba((web.match(/await recargarNovedades\(\)/g)||[]).length >= 3, "tras cada gestión de novedad se debe releer con recargarNovedades()");

if (mal) { console.error(`Resultado LOG-001: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado LOG-001: ${bien} ✓ · 0 ✗`);
