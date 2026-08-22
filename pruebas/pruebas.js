#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   TODAS LAS PRUEBAS, DE UN SOLO GOLPE

   Antes había que acordarse de cada arnés y correrlo a mano, uno por uno. Eso
   se olvida justo el día que importa. Esto los corre todos, en orden, y al
   final dice en una línea si se puede publicar o no.

       node pruebas.js                 → todo
       node pruebas.js rapido          → sin el visor de pantallas (sin navegador)
       node pruebas.js Comisionista    → solo lo que toca esa app

   Sale con código 1 si algo falla, para que un robot de publicación pueda
   frenar antes de sacar una app rota a la calle.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execFile } = require("child_process");
const fs = require("fs"), path = require("path");

const AQUI  = __dirname;
const APPS  = process.env.FREELANCE_APPS || path.join(AQUI, "..");   /* el repo de las apps */
const filtro = (process.argv[2] || "").trim();
const rapido = /^rapido$/i.test(filtro);
const soloApp = rapido ? "" : filtro;

const LAS_APPS = ["freelance-completo", "Comisionista", "socio-comercial",
                  "proveedor-freelance", "transportista-app"];
const DEL_EQUIPO = ["Comisionista", "socio-comercial"];

/* Cada prueba: qué mide, con qué archivo y sobre qué apps.
   `navegador:true` = necesita Chromium; se salta con "rapido". */
const PLAN = [
  { arnes:"ARNES_GLOBALES.js",       que:"nombres sueltos que revientan la app", apps:LAS_APPS },
  { arnes:"test_puerta.js",          que:"la puerta: sin sesión no se entra",    apps:LAS_APPS,
    salvo:{ "freelance-completo": "por decisión operativa conserva su propio ingreso con correo y clave, como respaldo del portal" } },
  { arnes:"test_no_se_cae.js",       que:"la app no se queda en blanco",         apps:LAS_APPS },
  { arnes:"test_barra_leer.js",      que:"la barra se esconde al leer",          apps:LAS_APPS,
    salvo:{ "transportista-app": "no tiene barra inferior: no hay nada que esconder" } },
  { arnes:"test_barra_conectada.js", que:"la barra lee del sistema",             apps:["freelance-completo"] },
  { arnes:"test_barra_equipo.js",    que:"la barra del equipo con fixtures sintéticos", apps:DEL_EQUIPO },
  { arnes:"test_barra_prov.js",      que:"la barra de la piladora",              apps:["proveedor-freelance"] },
  { arnes:"test_costo_piladora.js", que:"la piladora cambia su costo con fecha", apps:["proveedor-freelance"] },
  { arnes:"test_pedido_real.js",     que:"el pedido del vendedor llega a la base", apps:["Comisionista"] },
  { arnes:"test_cabecera_pedido.js", que:"la cabecera del pedido, tal como es hoy", apps:["Comisionista"] },
  { arnes:"test_detalle_pedido.js",  que:"el detalle del pedido, tal como es hoy",  apps:["Comisionista"] },
  { arnes:"test_confirmacion_pedido.js", que:"la confirmación tras guardar el pedido", apps:["Comisionista"] },
  { arnes:"test_cobranza.js",        que:"la cobranza, de punta a punta",         apps:["Comisionista"] },
  { arnes:"test_cartera.js",         que:"la cartera: lo que le deben",           apps:["Comisionista"] },
  { arnes:"test_pedidos_lista.js",   que:"mis pedidos y su seguimiento",          apps:["Comisionista"] },
  { arnes:"test_rol_comisionista.js", que:"el rol nuevo ve lo mismo que el viejo", apps:DEL_EQUIPO },
  { arnes:"test_aprobar_pedido.js",  que:"cómo le pagas a la piladora al aprobar", apps:["freelance-completo"] },
  { arnes:"test_despacho_parcial.js", que:"cuando el pedido sale corto",           apps:[null] },
  { arnes:"test_nota_credito.js",    que:"la nota de crédito y a quién le duele", apps:[null] },
  { arnes:"test_comision_piladora.js", que:"lo que le facturas a cada piladora",   apps:["freelance-completo"] },
  { arnes:"test_arranque.js",        que:"el día en que empieza a contar de verdad", apps:["freelance-completo"] },
  { arnes:"test_corte_arranque.js",  que:"los informes arrancan en esa fecha",     apps:["freelance-completo"] },
  { arnes:"test_cotizacion.js",      que:"la cotización",                        apps:["Comisionista","socio-comercial","freelance-completo"] },
  { arnes:"test_catalogo_productos.js", que:"Productos sale de las ofertas, no de `precios`", apps:["freelance-completo"] },
  { arnes:"test_pedido_ofertas.js",  que:"el Pedido sale de las ofertas, no de `precios`", apps:["Comisionista","freelance-completo","socio-comercial"] },
  { arnes:"test_cotiza_ofertas.js",  que:"la Cotización sale de las ofertas, no de `precios`", apps:["socio-comercial","Comisionista","freelance-completo"] },
  { arnes:"test_qq_carrito.js",      que:"el total en quintales sale de la oferta, no del texto",
    apps:["Comisionista","socio-comercial","freelance-completo"],
    salvo:{ "freelance-completo": "su módulo de pedido no arma un total en quintales del carrito: no hay qué medir" } },
  { arnes:"test_gratis_desglose.js", que:"el desglose de las gratis sale de la oferta y del producto, no del texto ni de la marca",
    apps:["Comisionista","socio-comercial","freelance-completo"] },
  { arnes:"test_regalo_promo.js",    que:"el regalo no pasa de lo que concede la promoción",
    apps:["Comisionista","socio-comercial","freelance-completo"] },
  /* la otra punta de la misma cadena: la piladora CONFIRMA el regalo al
     despachar y `gratis_despachado_qq` viaja en el jsonb de `facturar_pedido` */
  { arnes:"test_regalo_piladora.js", que:"la piladora confirma el regalo al despachar",
    apps:["proveedor-freelance"] },
  { arnes:"test_promos_catalogo.js", que:"las promociones de la base llegan a P4 y P6",
    apps:["Comisionista","socio-comercial","freelance-completo"] },
  /* la regla del regalo vive en la BASE (migración PROMO-03), no en JavaScript: esta
     levanta un PostgreSQL de juguete y la corre tal cual. Si la máquina no tiene
     PostgreSQL, lo dice y no falla. */
  { arnes:"test_regalo_sql.js",      que:"la regla del regalo, corrida contra PostgreSQL", apps:[null] },
  /* La otra mitad de lo mismo: hasta el 6 ago 2026 una promoción solo se podía
     CARGAR escribiendo SQL. Esta mide la pantalla de oficina que las carga
     (sistema-web.html, que sí vive en este repo: no necesita nada del privado). */
  { arnes:"test_promos_carga.js",    que:"cargar una promoción sin escribir SQL", apps:[null] },
  /* La segunda pantalla de Clientes (la ficha del seleccionado) se rediseñó a la
     maqueta del PO en ago/2026: sin sello de fuente ni conteos, veredicto binario
     con el motivo funcional, rejilla de tarjetas con dobles sintéticos y los 4 botones. */
  { arnes:"test_ficha_cliente.js",   que:"la ficha del cliente seleccionado (maqueta del PO)", apps:[null] },
  /* La lista de Pedidos sacaba el nombre del cliente de la POSICIÓN de la fila
     (un setPedidos por índice que pisaba también los reales), no del pedido.
     Esta vigila que cada fila salga a nombre de SU cliente, con el maestro de
     clientes llegando a propósito DESPUÉS de los pedidos. */
  { arnes:"test_pedidos_cliente.js", que:"cada pedido, a nombre de su cliente", apps:[null] },
  /* La pantalla de Precios escribía en `precios`, congelada desde el 24 jul: decía
     «guardado» y el vendedor seguía cotizando lo de antes. Esta prueba vigila que
     no quede NINGÚN camino que escriba ahí, y que la subida de costo en bloque
     muestre el precio nuevo antes de guardar, mantenga la ganancia por quintal y
     toque sólo la piladora elegida. */
  { arnes:"test_precios_ofertas.js", que:"el precio vive en la oferta de la piladora", apps:[null] },
  { arnes:"test_padron_fc.js",       que:"sin ficha en el padrón no se entra",   apps:[null] },
  { arnes:"test_asistente_cartera.js", que:"el asistente no inventa números",    apps:[null] },
  { arnes:"test_cambios_419.js",      que:"fotos completas, proveedor por palabras y menú plegado", apps:[null] },
  { arnes:"test_cambios_422.js",      que:"portada, pedido web y scroll de productos", apps:[null] },
  { arnes:"test_operacion_424.js",     que:"fechas EC, demo aislado, errores y pedidos offline", apps:[null] },
  { arnes:"test_pedido_entrega_nota.js", que:"fecha de entrega y nota para el chofer viajan en el payload del pedido", apps:[null] },
  { arnes:"test_logistica_log001.js", que:"Logística conectada a LOG-001 (rutas reales, acciones a RPC, sin «sin factura»)", apps:[null] },
  { arnes:"test_anulacion_pedido.js", que:"anulación de pedido: el comisionista pide y el freelance decide", apps:[null] },
  { arnes:"test_pedidos_editor.js",  que:"Pedidos: tres pestañas y el editor de líneas (editar_pedido_atomico)", apps:[null] },
  { arnes:"test_costo_dos.js",       que:"el costo de compra se muestra en dos (contado y crédito)", apps:[null] },
  { arnes:"test_piladoras_costos.js", que:"Piladoras · Costos y Base por piladora (versionado, sin cruzar)", apps:[null] },
  { arnes:"test_piladoras_web.js",   que:"Sistema Web · módulo Piladoras (fusiona Precios vigentes, versionado)", apps:[null] },
  { arnes:"test_base_pct.js",        que:"Base = Costo + % y el guardar del mismo día (ambas apps)", apps:[null] },
  { arnes:"test_punto2.js",          que:"Piladoras: sin leyenda, fecha en la tarjeta, historial y Antes→Ahora", apps:[null] },
  { arnes:"test_tipo_grano.js",      que:"Piladoras: variedades de grano (tipo_grano) en ambas apps", apps:[null] },
  { arnes:"test_ficha_visual.js",    que:"Piladoras: pestaña Ficha, tarjeta de marca y modal por familia (ambas apps)", apps:[null] },
  { arnes:"test_costos_render.js",   que:"Piladoras: marca plegable, resumen de crédito, buscador uFuzzy y crédito en ámbar", apps:[null] },
  { arnes:"test_ajustar_visual.js",  que:"Piladoras: ajuste con verde suave, resumen sticky y ejemplo de impacto", apps:[null] },
  { arnes:"test_pedido_base_chips.js", que:"Pedido: base en los chips y nombre P1/P2 corregido (Crédito/Contado)", apps:[null] },
  { arnes:"test_web_al_dia.js",       que:"Sistema Web: dos bases en el pedido, crear y ocultar piladora", apps:[null] },
  { arnes:"test_fe01_tarifas.js",     que:"FE-01: tarifas por zona, chóferes y estibadores (versionado)", apps:[null] },
  { arnes:"test_fe02_cobro.js",       que:"FE-02: cobro de flete/estibada en el pedido (las 4 apps)", apps:[null] },
  { arnes:"test_fe03_pagos.js",       que:"FE-03: pagos de flete/estibada (pagos_fe, estibador, chofer)", apps:[null] },
  { arnes:"test_web01_titulos.js",    que:"WEB-01: un solo título por pantalla (cabecera con icono)", apps:[null] },
  { arnes:"test_web02_retiro.js",     que:"WEB-02: retiro del módulo Fletes y estibada (sin rastro, EF_* intactas)", apps:[null] },
  { arnes:"test_canon_p1p2.js",       que:"PED P1-3: canon P1=Crédito, P2=Contado en app, web, comisionista y socio", apps:[null] },
  { arnes:"test_p1_4_cupo_p5.js",     que:"PED P1-4: cupo solo crédito + exceso a autorización + piso de P5 (app y web)", apps:[null] },
  { arnes:"test_ped_p2_6.js",         que:"PED P2-6: una tarjeta por pedido, detalle con todas las líneas, condición real y búsqueda por proveedor", apps:[null] },
  { arnes:"test_origen_canal.js",     que:"PED P2-7: cada app manda su origen_canal al crear el pedido (freelance/comisionista/socio/web)", apps:[null] },
  { arnes:"test_solic_rpc.js",        que:"SOLIC: resolver una solicitud pasa por el RPC responder_solicitud, no por UPDATE directo (3 apps)", apps:[null] },
  { arnes:"test_web_sin_fallback.js", que:"WEB 1A: en vivo sin datos demo, sin pedido fantasma sin sesión, y fecha real (no fija)", apps:[null] },
  { arnes:"test_estados_paridad_web.js", que:"WEB 2C: editar el pedido en la web con los mismos estados que la app (incluye enviado_proveedor; facturado no), recarga tras éxito y no confía en el optimista", apps:[null] },
  { arnes:"test_equiv_obligatoria.js", que:"WEB 2D: una presentación no-Quintal sin equivalencia no deja guardar (nombra producto y presentación); tipo_precio se deriva de la condición; la cantidad admite decimales", apps:[null] },
  { arnes:"test_optimista_qq.js", que:"APP T3: la tarjeta optimista al guardar se muestra en quintales (50 arrobas → 12,5 qq a $40/qq; el dinero no cambia) en freelance y comisionista", apps:[null] },
  { arnes:"test_monto_suma_lineas.js", que:"PED: el «Monto del pedido» es la suma de las líneas (Σ round(qq×precio,2)), no cantidad × precio promedio (que pierde centavos)", apps:[null] },
  /* PED_TESTS_PARIDAD · blindaje de comportamiento app↔web (no regex): cada uno
     rompe el código a propósito (mutante) y exige que la prueba se caiga. */
  { arnes:"test_paridad_canon.js",    que:"PED P3-8: canon P1=Crédito/P2=Contado idéntico en los 4 canales (mapa efectivo)", apps:[null] },
  { arnes:"test_paridad_conv_web.js", que:"PED P3-8: la edición web convierte presentación→quintal (arroba 0,25) antes de guardar", apps:[null] },
  { arnes:"test_paridad_piso_web.js", que:"PED P3-8: el piso de P5 bloquea bajo costo+margen en la web (render real)", apps:[null] },
  { arnes:"test_paridad_cupo_web.js", que:"PED P3-8: el cupo en la web (contado no consume; crédito excedido va a autorizar, no bloquea)", apps:[null] },
  { arnes:"test_paridad_piso_app.js", que:"PED P3-8: el piso de P5 en la app freelance (bloquea bajo costo+margen)", apps:[null] },
  { arnes:"test_paridad_cupo_app.js", que:"PED P3-8: el cupo en la app (contado no consume; crédito excedido va a autorizar, no bloquea)", apps:[null] },
  { arnes:"ARNES_SECCIONES_WEB.js",   que:"PED P3-8: cada sección del Sistema Web renderiza de verdad (caza ReferenceError de alcance)", apps:[null] },
  /* sistema-web.html ya vive junto a las apps: estos cuatro forman parte de
     la regresión normal y no deben quedar omitidos por falta de una variable. */
  { arnes:"test_cuentas.js",         que:"las cuentas del equipo",               apps:[null] },
  { arnes:"test_menu_web.js",        que:"el menú del sistema web",              apps:[null] },
  { arnes:"test_dashboard_cliente.js", que:"el historial del cliente no inventa", apps:[null] },
  { arnes:"test_dueno_vendedor.js",  que:"a quién pertenece un cliente",         apps:[null] },
  /* la función de avisos también vive en el repo privado */
  { arnes:"test_avisos_costo.js",    que:"el aviso cuando cambia un costo",      apps:[null], soloSi:"AVISOS_TS" },
  { arnes:"test_avisos_pedido_piladora.js", que:"la piladora se entera del pedido", apps:[null], soloSi:"AVISOS_TS" },
  { arnes:"test_avisos_nc_comision.js", que:"avisos de plata que cambia",          apps:[null], soloSi:"AVISOS_TS" },
  { arnes:"test_invitacion.js",      que:"el enlace de invitación",              apps:[null], navegador:true },
  { arnes:"ver_pantallas.js",        que:"cómo SE VE cada pantalla",             apps:LAS_APPS, navegador:true, visor:true },
];

const verde = (t)=>"\x1b[32m"+t+"\x1b[0m", rojo=(t)=>"\x1b[31m"+t+"\x1b[0m", gris=(t)=>"\x1b[90m"+t+"\x1b[0m";

let bien = 0, mal = 0, saltadas = 0, exentos = 0;
const fallos = [];

/* ══ CARRILES · 8 ago 2026 ══════════════════════════════════════════════════
   Antes cada prueba esperaba a que terminara la anterior (execFileSync). Medido
   el 8 ago: 21 minutos de reloj, y el robot de publicación tardaba 15 por salida.
   Pero las pruebas NO dependen unas de otras: cada una levanta su propio doble y
   lee su propia copia de la app, sin tocar la base ni archivos compartidos. Así
   que pueden correr a la vez.

   NO se quita ni se afloja NINGUNA prueba: las mismas, el mismo veredicto y el
   mismo código de salida. Lo único que cambia es cuánto se espera.

   Las del visor van aparte, en fila: todas escriben las capturas en la misma
   carpeta y sí se pisarían entre ellas.

   Carriles por omisión: 4. Se puede cambiar con PRUEBAS_CARRILES=1 para volver
   al comportamiento de antes (útil para depurar una falla rara). */
const CARRILES = Math.max(1, Number(process.env.PRUEBAS_CARRILES || 6));

/* ══ LAS PESADAS PRIMERO ══════════════════════════════════════════════════
   Con carriles, el reloj lo manda la prueba más lenta que quede sin arrancar.
   Si las tres de casi dos minutos caen al final, un carril se queda solo
   trabajando mientras los otros ya terminaron. Arrancando por las pesadas,
   el reparto se empareja.

   Los segundos son medidos (8 ago 2026, corrida completa cronometrada una por
   una). No hace falta que estén al día ni que estén todas: es solo el orden de
   arranque. Lo que no aparezca se trata como prueba mediana y va después de
   las conocidas pesadas. Si el veredicto cambiara según el orden, el problema
   sería la prueba, no esta lista. */
const PESADAS = {
  "test_cotiza_ofertas · freelance-completo": 114,
  "test_promos_catalogo · freelance-completo": 114,
  "test_promos_carga": 98,
  "test_cotiza_ofertas · Comisionista": 74,
  "test_promos_catalogo · Comisionista": 70,
  "test_ficha_cliente": 68,
  "test_catalogo_productos · freelance-completo": 62,
  "test_cotiza_ofertas · socio-comercial": 60,
  "test_promos_catalogo · socio-comercial": 59,
  "test_pedido_ofertas · Comisionista": 58,
  "test_regalo_promo · freelance-completo": 43,
  "test_gratis_desglose · freelance-completo": 38,
  "test_nota_credito": 24,
  "test_despacho_parcial": 23,
  "test_regalo_promo · Comisionista": 22,
  "test_qq_carrito · Comisionista": 20,
  "test_gratis_desglose · Comisionista": 18,
  "test_regalo_promo · socio-comercial": 15,
  "test_arranque · freelance-completo": 15,
  "test_detalle_pedido · Comisionista": 14,
};
const pesoDe = (t) => PESADAS[t.etiqueta] || 10;

function preparar(arnes, app, visor) {
  const ruta = path.join(AQUI, arnes);
  const etiqueta = arnes.replace(/\.js$/,"") + (app ? " · " + app : "");
  if (!fs.existsSync(ruta)) return { etiqueta, arnes, estado:"falta" };
  const args = [ruta];
  const LOCAL = process.env.FREELANCE_LOCAL || "/tmp/local";   /* copias con el doble, solo para el visor */
  if (app) args.push(visor ? ("file://" + path.join(LOCAL, app + ".html")) : path.join(APPS, app + ".html"));
  if (visor) args.push("/tmp/capturas");
  return { etiqueta, arnes, args, estado:"pendiente" };
}

function lanzar(t) {
  return new Promise((listo) => {
    if (t.estado !== "pendiente") return listo();
    execFile("node", t.args, { encoding:"utf-8", timeout: 180000, maxBuffer: 64*1024*1024 },
      (err, salidaOk, salidaErr) => {
        if (!err) {
          const ultima = String(salidaOk).trim().split("\n").filter(Boolean).pop() || "";
          t.estado = "bien"; t.resumen = ultima.slice(0,60);
        } else {
          const lineas = String((salidaOk||"") + (salidaErr||"")).trim().split("\n");
          t.estado = "mal";
          t.detalle = lineas.filter(l=>/✗/.test(l)).slice(0,4).join("\n     ") || lineas.slice(-2).join(" ");
        }
        listo();
      });
  });
}

/* Reparte las tareas entre N obreros. Cada obrero toma la siguiente libre. */
async function enCarriles(tareas, carriles) {
  let siguiente = 0;
  const obrero = async () => { while (siguiente < tareas.length) await lanzar(tareas[siguiente++]); };
  await Promise.all(Array.from({ length: Math.min(carriles, tareas.length) }, obrero));
}

async function principal() {
  console.log("\n═══ PRUEBAS DE FREELANCE" + (soloApp ? " · solo " + soloApp : "") + (rapido ? " · sin navegador" : "")
    + gris(CARRILES > 1 ? "  · " + CARRILES + " carriles" : "  · en fila"));

  /* ── 1) Armar el plan: qué se corre, qué se salta y por qué ── */
  const grupos = [];
  for (const p of PLAN) {
    if (rapido && p.navegador) continue;
    if (p.soloSi && !process.env[p.soloSi]) { grupos.push({ que:p.que, nota:"no corre aquí: falta " + p.soloSi + " (vive en el repo privado)", tareas:[], exentas:[] }); continue; }
    let apps = soloApp ? p.apps.filter(a => a === soloApp) : p.apps;
    const exentas = apps.filter(a => p.salvo && p.salvo[a]).map(a => ({ app:a, motivo:p.salvo[a] }));
    apps = apps.filter(a => !(p.salvo && p.salvo[a]));
    if (!apps.length && !exentas.length) continue;
    grupos.push({ que:p.que, visor:!!p.visor, tareas: apps.map(a => preparar(p.arnes, a, p.visor)), exentas });
  }

  /* ── 2) Correr: en carriles lo normal, en fila las del visor ── */
  const todas = grupos.flatMap(g => g.tareas.map(t => ({ t, visor:g.visor })));
  /* Se arranca por las pesadas. El ORDEN DE IMPRESIÓN no cambia: más abajo se
     recorre `grupos`, que sigue en el orden del plan. */
  const enParalelo = todas.filter(x => !x.visor).map(x => x.t).sort((a,b) => pesoDe(b) - pesoDe(a));
  await enCarriles(enParalelo, CARRILES);
  await enCarriles(todas.filter(x =>  x.visor).map(x => x.t), 1);

  /* ── 3) Contar e imprimir SIEMPRE en el orden del plan, corra como corra ── */
  for (const g of grupos) {
    console.log("\n" + g.que);
    if (g.nota) { console.log(gris("  (·) " + g.nota)); continue; }
    for (const t of g.tareas) {
      if (t.estado === "falta") { saltadas++; console.log(gris("  · " + t.arnes + ": no está en esta carpeta")); }
      else if (t.estado === "bien") { bien++; console.log(verde("  ✓ ") + t.etiqueta + gris("  " + t.resumen)); }
      else { mal++; fallos.push({ etiqueta:t.etiqueta, detalle:t.detalle }); console.log(rojo("  ✗ ") + t.etiqueta + "\n     " + t.detalle); }
    }
    /* Nunca en silencio: si una app queda fuera, se dice y se dice por qué. */
    for (const e of g.exentas) { exentos++; console.log(gris("  (·) " + e.app + " queda fuera: " + e.motivo)); }
  }

  console.log("\n" + "─".repeat(58));
  if (mal === 0) {
    console.log(verde("TODO BIEN") + " · " + bien + " pruebas pasaron"
      + (exentos ? gris(" · " + exentos + " exenta(s) con motivo") : "")
      + (saltadas ? gris(" · " + saltadas + " no estaban") : ""));
    console.log("Se puede publicar.\n");
  } else {
    console.log(rojo("NO PUBLIQUES") + " · " + mal + " prueba(s) fallaron de " + (bien + mal));
    fallos.forEach(f => console.log("  ✗ " + f.etiqueta));
    console.log("");
  }
  process.exit(mal ? 1 : 0);
}

principal();
