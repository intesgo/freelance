#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   PEDIDOS (App Freelance) · tres pestañas + editor de líneas

   · freelance-completo.html: el módulo Pedidos pasa de dos pestañas a TRES —
     Pendientes · En camino · Entregados— que dicen dónde está cada pedido.
     Pendientes trae el número; los anulados viven en Entregados pero ocultos
     hasta filtrar «Anulado»; el filtro de estado sirve en las tres.
   · Editor de líneas: desde el detalle de un pedido que todavía se puede tocar,
     el botón «Editar pedido» abre el armador en modo edición con las líneas
     cargadas; al guardar llama a editar_pedido_atomico (NO a registrar).
     La función trabaja en QUINTALES y el armador en presentaciones: se convierte
     con el `equiv` del producto. El cliente y el proveedor quedan fijos.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const fl = fs.readFileSync(path.join(__dirname, "..", "freelance-completo.html"), "utf8");

let bien = 0, mal = 0;
const prueba = (ok, msg) => { if (ok) bien++; else { mal++; console.error("✗ " + msg); } };

/* ── Trabajo 1 · Tres pestañas ── */
prueba(/pestanas?[\s\S]{0,40}pendientes \| encamino \| entregados/.test(fl) || /useState\("pendientes"\)/.test(fl),
  "el módulo entra por defecto en la pestaña Pendientes");
prueba(/pendientes: \["Esperando aprobación","Enviado al proveedor"\]/.test(fl), "Pendientes = por aprobar / enviado al proveedor");
prueba(/encamino:\s*\["Facturado","Despachado"\]/.test(fl), "En camino = facturado / despachado");
prueba(/entregados: \["Entregado","Cobrado y validado","Comisión liberada","Anulado"\]/.test(fl), "Entregados = entregado / cobrado / comisión / anulado");
prueba(/const tabDe = /.test(fl), "cada pedido sabe a qué pestaña va (tabDe)");
prueba(/pestana==="entregados" && p\.estado==="Anulado" && estado!=="Anulado"/.test(fl), "los anulados quedan ocultos en Entregados hasta filtrar «Anulado»");
prueba(/const nPendientes = /.test(fl) && /nPendientes>0\?` \(\$\{nPendientes\}\)`/.test(fl), "la pestaña Pendientes muestra el número cuando hay");
prueba(/const ESTADOS = \["Todos", \.\.\.TAB_ESTADOS\[pestana\]\]/.test(fl), "el filtro de estado se arma según la pestaña activa");
prueba(/Aquí están los pedidos que todavía se pueden editar o anular/.test(fl), "nota de Pendientes");
prueba(/🔒 Ya facturados: van hacia el cliente/.test(fl), "nota de En camino");
prueba(/🔒 Cerrados: quedan para consulta/.test(fl), "nota de Entregados");
prueba(/const irAEstado=\(e\)=>\{[\s\S]{0,220}TAB_ESTADOS\.pendientes\.includes\(e\)/.test(fl), "el embudo lleva cada estado a la pestaña que le toca");

/* ── Trabajo 2 · Editor de líneas ── */
prueba(/const EDITABLES = \["Esperando aprobación","Enviado al proveedor"\]/.test(fl), "Editar solo antes de facturar");
prueba(/const sePuedeEditar = !!vivo && !p\.demo && !!onEditar && EDITABLES\.includes\(p\.estado\)/.test(fl), "Editar: sesión real, no demo, estado editable");
prueba(/✏️ Editar pedido/.test(fl), "existe el botón «Editar pedido»");
prueba(/from\("pedido_items"\)[\s\S]{0,140}item_id,prod_id,pres_cod,descripcion,cantidad_qq,precio_usd,tipo_precio,condicion,gratis_qq,promo_id/.test(fl),
  "el editor lee las líneas de pedido_items con sus columnas");
prueba(/rpc\("editar_pedido_atomico"/.test(fl), "al guardar llama a editar_pedido_atomico");
prueba(/const modoEdicion = !!edicion/.test(fl), "el armador conoce el modo edición");
/* Conversión qq ↔ presentaciones (trampa 1): al cargar y al guardar */
prueba(/const cant = Math\.round\(\(Number\(it\.cantidad_qq\)\|\|0\)\/eq\*100\)\/100/.test(fl), "al cargar: cantidad_qq / equiv");
prueba(/const precio = Math\.round\(\(Number\(it\.precio_usd\)\|\|0\)\*eq\*100\)\/100/.test(fl), "al cargar: precio_usd × equiv");
prueba(/cantidad_qq: Math\.round\(\(Number\(it\.cant\)\|\|0\)\*eq\*100\)\/100/.test(fl), "al guardar: cant × equiv");
prueba(/precio_qq: Math\.round\(\(\(Number\(it\.precio\)\|\|0\)\/eq\)\*100\)\/100/.test(fl), "al guardar: precio / equiv");
/* El cliente y el proveedor quedan fijos en edición */
prueba(/El cliente y el proveedor no se cambian/.test(fl), "en edición se avisa que cliente y proveedor no se cambian");
prueba(/\{cli && !bloqueado && !verFact && !prod && !modoEdicion &&/.test(fl), "en edición no aparece el buscador de proveedor");
/* No dejar el pedido sin líneas (trampa 3) y op_id (contrato) */
prueba(/El pedido no puede quedar sin productos/.test(fl), "no se puede guardar un pedido sin líneas (guía a Anular)");
prueba(/crypto\.randomUUID/.test(fl), "el guardado usa un op_id único");
/* Mensaje de error traducido (trampa 7) */
prueba(/ya no se puede editar\/i[\s\S]{0,80}ya se facturó: ya no se puede editar/.test(fl), "traduce el error «ya no se puede editar»");

/* ── Entrada liviana (Trabajo A del alcance entrada-liviana) ── */
prueba(/const \[vistaResumen,setVistaResumen\]=useState\(false\)/.test(fl), "la sub-vista Resumen tiene su propio estado");
prueba(/onClick=\{\(\)=>setVistaResumen\(true\)\}[\s\S]{0,600}📊 Ver resumen/.test(fl), "hay un botón «Ver resumen» que abre el panorama");
prueba(/onClick=\{\(\)=>setVistaResumen\(false\)\}/.test(fl), "desde el Resumen se puede volver a la lista");
prueba(/if\(vistaResumen\)\{ setVistaResumen\(false\); return true; \}/.test(fl), "el botón atrás cierra el Resumen");
prueba(/const cambiarPestana=\(p,mantenerEstado\)=>\{setVistaResumen\(false\);/.test(fl), "tocar un estado/pestaña sale del Resumen y filtra la lista");
prueba(/const \[verRegla,setVerRegla\]=useState\(false\)/.test(fl) && /onClick=\{\(\)=>setVerRegla\(v=>!v\)\}/.test(fl), "la regla de la pestaña vive tras el ícono ⓘ");

/* ── Rendimiento (Trabajo B del alcance): sin cambiar qué se ve ── */
prueba(/const panorama = React\.useMemo\(\(\)=>\{[\s\S]{0,1400}\},\[pedidos\]\);/.test(fl), "los agregados del panorama van en useMemo dep [pedidos]");
prueba(/const \{ lista, nPendientes, ordenada \} = React\.useMemo\(\(\)=>\{[\s\S]{0,1600}\},\[pedidos,q,estado,desde,hasta,orden,pestana\]\);/.test(fl),
  "la lista filtrada/ordenada va en useMemo con sus dependencias");
prueba(/const itemsPorPed=\{\};[\s\S]{0,140}itemsPorPed\[i\.ped_id\]=itemsPorPed\[i\.ped_id\]\|\|\[\]/.test(fl), "los ítems se indexan por pedido una sola vez");
prueba(/const its=itemsPorPed\[p\.ped_id\]\|\|\[\]/.test(fl), "cada pedido toma sus ítems del índice, no con filter");
prueba(/function lineaDePedido\(p\)\{/.test(fl), "la línea de tiempo se arma con un helper a demanda");
prueba(/const linea = p\.linea \|\| lineaDePedido\(p\)/.test(fl), "el detalle arma la línea de tiempo solo al abrirse");
prueba(!/linea: ETAPAS_PEDIDO\.map/.test(fl), "el cargador de la lista ya NO construye la línea de tiempo de cada pedido");
prueba(/etapaLinea:m\.linea, creado:p\.creado/.test(fl), "el cargador solo guarda los primitivos para armarla después");

/* ── Dos pantallas (alcance dos-pantallas): lista liviana + Resumen con KPI ── */
prueba(/const \[filtrosAbiertos,setFiltrosAbiertos\]=useState\(false\)/.test(fl), "Estado/Fecha se pliegan tras «⚙ Filtros» (plegados por defecto)");
prueba(/const filtrosActivos = \(estado!=="Todos"\?1:0\) \+ \(\(desde\|\|hasta\)\?1:0\)/.test(fl), "se cuentan los filtros puestos para avisarlos");
prueba(/⚙ Filtros\{filtrosActivos>0\?` \(\$\{filtrosActivos\}\)`:""\}/.test(fl), "el chip muestra cuántos filtros hay puestos");
prueba(/const limpiarFiltros = \(\)=>\{ setEstado\("Todos"\); setDesde\(""\); setHasta\(""\); setPagina\(1\); \}/.test(fl), "«Limpiar» resetea estado, fechas y página");
prueba(/onClick=\{limpiarFiltros\}>Limpiar<\/button>/.test(fl), "aparece el enlace «Limpiar» cuando hay filtros");
prueba(/\{filtrosAbiertos && \(/.test(fl) && /items=\{ESTADOS\.filter\(e=>e!=="Todos"\)\}/.test(fl), "el selector de Estado vive dentro del panel de filtros");
prueba(/\{filtrosAbiertos && verFechas && \(/.test(fl), "el panel Desde/Hasta solo se ve con los filtros abiertos");
/* Los 4 KPI ya no van en la lista, ahora en el Resumen y son tocables */
prueba(/ya no viven aquí: se movieron al Resumen/.test(fl), "los 4 KPI ya no van en la pantalla de lista (se movieron al Resumen)");
prueba(/\{vistaResumen && \(\(\)=>\{[\s\S]{0,900}const enProceso = activos\.filter/.test(fl), "el Resumen calcula los 4 números (En proceso, etc.)");
prueba(/‹ Pedidos<\/button>[\s\S]{0,120}Resumen<\/div>/.test(fl), "el Resumen tiene su encabezado «‹ Pedidos» + «Resumen»");
prueba(/onClick=\{\(\)=>irAEstado\("Despachado"\)\}>[\s\S]{0,300}En camino/.test(fl), "los números del Resumen son tocables (filtran y vuelven a la lista)");

if (mal) { console.error(`Resultado PEDIDOS-EDITOR: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado PEDIDOS-EDITOR: ${bien} ✓ · 0 ✗`);
