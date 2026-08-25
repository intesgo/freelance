#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
const sw=fs.readFileSync(path.join(raiz,"sw.js"),"utf8");
let bien=0,mal=0; const prueba=(ok,msg)=>{if(ok)bien++;else{mal++;console.error("✗ "+msg);}};

/* ── freelance-completo ── */
prueba(/const VERSION = \{ n:"474"/.test(app),"Freelance debe anunciar v474");
prueba(!/Buenos días,\s+[A-ZÁÉÍÓÚÑ]/.test(app),"la portada no debe mostrar el saludo personalizado eliminado");
prueba(/totalRecibir\/metaMes\*100/.test(app),"el porcentaje financiero debe salir de valor/meta");
prueba(/valorAnimado/.test(app)&&/pctAnimado/.test(app),"valor y porcentaje deben animarse");
prueba(/prefers-reduced-motion/.test(app),"las animaciones deben respetar movimiento reducido");
prueba(!/className="inicio-resumen"/.test(app),"la portada no debe incluir la fila compacta de indicadores");
prueba(!/Puedes escribir palabras sueltas/.test(app),"no debe mostrarse el texto informativo del proveedor");
prueba(/productos-scroll/.test(app)&&/padding-bottom:calc\(82px/.test(app),"productos debe desplazarse por encima de la barra inferior");
prueba(/tab!=="inicio"/.test(app),"la burbuja de voz no debe tapar la portada");

/* ── Sistema Web · versión y caché ── */
prueba(/const VERSION = \{ n:"214"/.test(web),"Sistema Web debe anunciar b214");
prueba(/const CACHE = "freelance-v319"/.test(sw),"la caché debe renovarse");
/* SW · version.json SIEMPRE de la red (si no, el aviso «Actualizar» del Sistema Web no sale) */
prueba(/url\.pathname\.endsWith\("\/version\.json"\)/.test(sw)&&/e\.respondWith\(fetch\(e\.request\)\.catch\(/.test(sw),"sw · version.json se sirve solo de la red, nunca de la caché");

/* ── Sistema Web · pantalla de pedido rediseñada (b143 · modal de 3 pestañas) ── */
prueba(/Cambiar producto/.test(web),"debe mantenerse Cambiar producto");
prueba(/setModalPed\("entrega"\)/.test(web)&&/setModalPed\("precio"\)/.test(web)&&/setModalPed\("historial"\)/.test(web),
  "los tres botones deben abrir el modal (Entrega, Precio, Historial)");
prueba(/Detalles del pedido/.test(web),"el modal debe titularse Detalles del pedido");
prueba(/setAsumeFlete\("cliente"\)/.test(web)&&/setAsumeEstibada\("cliente"\)/.test(web),
  "quién asume flete y estibada debe seguir disponible en el modal");
prueba(/setTipo\(t\.id\)/.test(web)&&/TIPOS_PRECIO_WEB\.map/.test(web),"el tipo de precio P1–P6 debe estar en el modal");
prueba(/Precio de venta/.test(web),"debe mantenerse el Precio de venta");
prueba(/Resumen del pedido/.test(web)&&/overflowY:"auto"/.test(web),"el resumen debe existir y desplazarse (scroll)");
prueba(/onClick=\{volver\}/.test(web),"la cabecera del pedido conserva el botón Cancelar (Inicio se quitó · DISENO_SUBIR_PEDIDO)");
prueba(/fecha_entrega/.test(web)&&/nota_chofer/.test(web),"deben enviarse fecha de entrega y nota para el chofer");

/* ── PED_PISO_P5_V2 · Precio especial (P5): piso = costo(condición) × (1 + margen_min/100), sin flete/estibada (fe02) ── */
prueba(/const requiereAutorizacion = \(esP5 && !esFreelanceWeb\)/.test(web),"el freelance ya no se autoriza a sí mismo el precio especial");
prueba(/const bajoPiso = /.test(web)&&/precioNum < pisoUnidad/.test(web),"debe calcularse si el precio queda por debajo del piso");
prueba(/&& !bajoPiso;/.test(web),"un precio por debajo del piso debe invalidar el pedido");
prueba(/const pisoUnidad = esP5 \? \(esCredito \? pisoCreditoP5 : pisoContadoP5\) : 0;/.test(web),"el piso del precio especial se elige por condición (costo × margen mínimo)");
prueba(/pisoCreditoP5 = prod \? Math\.round\(\(Number\(prod\.costo\)\|\|0\) \* \(1 \+ margenMinP5\/100\)/.test(web),"el piso de crédito sale de costo × (1 + margen_min/100)");
prueba(/margenMin: Number\(o\.margen_min\) \|\| 0/.test(web),"la oferta debe traer su margen_min para el piso");

/* ── PED_WEB_EDITOR_UNICO · un solo editor de pedido en la web (se quitó el modal viejo) ── */
prueba(/PED_WEB_EDITOR_UNICO/.test(web),"queda el ancla del editor único");
prueba(!/const abrirEdicion = \(pedId\)/.test(web) && !/const guardarEdicion = async/.test(web),"el editor de pedido viejo (abrirEdicion/guardarEdicion) ya no existe");
prueba(!/\{editPed && \(\(\)=>\{/.test(web),"el modal del editor viejo ya no se renderiza");
prueba(/const abrirEdicionArmar = /.test(web)&&/const guardarCambiosPedido = /.test(web),"el editor vivo (vista Armar) sigue presente");

/* ── PED_SIN_FALLBACK_DEMO · sin fallback demo en vivo, sin pedido fantasma, fecha real ── */
prueba(/PED_SIN_FALLBACK_DEMO/.test(web),"queda el ancla PED_SIN_FALLBACK_DEMO");
prueba(/\(clientesReales \|\| \[\]\)/.test(web),"en vivo los clientes NO caen a demo (clientesReales || [])");
prueba(/\(prodsReales \|\| \[\]\)/.test(web),"en vivo los productos NO caen a demo (prodsReales || [])");
prueba(/if \(!exito && !MODO_DEMO_WEB\)/.test(web),"sin sesión/conexión en vivo NO se pinta la tarjeta (guarda solo con éxito del RPC)");
prueba(/fecha: fechaHoy,/.test(web)&&/const fechaHoy = hoyECWeb\(\);/.test(web),"la fecha del pedido nuevo es hoy (hoyECWeb), no una fija");
prueba(!/estado: l\.requiere[\s\S]{0,40}fecha:"2026-06-13"/.test(web),"ya no queda la fecha fija 2026-06-13 en la creación del pedido");
prueba(/disabled=\{carrito\.length===0 \|\| fuentesConError\}/.test(web),"«Subir pedido» se deshabilita si las fuentes no cargaron");

/* ── PED_CUPO_VIVO_PARIDAD · cupo real (clientes.cupo + cartera pendiente), no FICHA/clientes.usado ── */
prueba(/PED_CUPO_VIVO_PARIDAD/.test(web)&&/PED_CUPO_VIVO_PARIDAD/.test(app),"queda el ancla PED_CUPO_VIVO_PARIDAD en web y app");
prueba(/usado: Math\.round\(\(usadoPorCli\[c\.cli_id\]\|\|0\)\*100\)\/100/.test(web),"web · el usado sale de la suma de cartera por cli_id, no de clientes.usado");
prueba(!/usado: c\.usado\|\|0/.test(web),"web · ya no se usa clientes.usado (columna en 0)");
prueba(/estado ?=== ?"pendiente" && m\.es_demo ?=== ?false/.test(web)&&/estado ?=== ?"pendiente" && m\.es_demo ?=== ?false/.test(app),"solo cuenta cartera PENDIENTE y no demo (web y app)");
prueba(/const ficha = cli \? \(vivoPed \? \(FICHA_VIVA_PED\[cli\]\|\|null\) : FICHA_CLIENTE\[cli\]\) : null;/.test(app),"app · en vivo el cupo sale de FICHA_VIVA_PED; FICHA_CLIENTE solo en demo");

/* ── PED_ESTADOS_PARIDAD · la web edita en los mismos estados que la app y el RPC ── */
prueba(/PED_ESTADOS_PARIDAD/.test(web),"queda el ancla PED_ESTADOS_PARIDAD en la web");
prueba(/\["ingresado","esperando_aprobacion","enviado_proveedor"\]\.includes\(pd\.estado_comercial \|\| pd\.estado\)/.test(web),"web · editable incluye enviado_proveedor (paridad con la app)");
prueba(!/\["ingresado","esperando_aprobacion"\]\.includes\(pd\.estado_comercial \|\| pd\.estado\)/.test(web),"web · ya no queda el editable viejo sin enviado_proveedor");

/* ── PED_EQUIV_OBLIGATORIA · equiv obligatoria (no-Quintal), tipo_precio por condición, cantidad decimal ── */
prueba(/PED_EQUIV_OBLIGATORIA/.test(web)&&/PED_EQUIV_OBLIGATORIA/.test(app),"queda el ancla PED_EQUIV_OBLIGATORIA en web y app");
prueba(/const equivInvalidaWeb = /.test(web),"web · existe el chequeo de equivalencia obligatoria para presentaciones no-Quintal");
prueba(/const malaEquiv = carrito\.find\(equivInvalidaWeb\)/.test(web)&&/const malaEquiv = vivos\.find\(equivInvalidaWeb\)/.test(web),"web · el nuevo pedido y la edición cortan el guardado si falta la equivalencia");
prueba(/const sinEquiv = items\.find\(it => \{ const u=String\(it\.prod\.unidad/.test(app),"freelance · el guardado de edición corta si una presentación no-Quintal no tiene equivalencia");
prueba(/tipo_precio:l\.tipo\|\|\(l\.credito\?"P1":"P2"\)/.test(web),"web · el fallback de tipo_precio sale de la condición (crédito⇒P1, contado⇒P2)");
prueba(!/tipo_precio:l\.tipo\|\|"P1"/.test(web),"web · ya no se fuerza tipo_precio P1 fijo al guardar la edición");
prueba(/const tipo = it\.tipo_precio \|\| \(it\.condicion==="contado" \? "P2" : "P1"\);/.test(web),"web · al cargar la edición el tipo también sale de la condición real");
prueba(/const cantNum = numDecWeb\(cant\)/.test(web)&&!/const cantNum = parseInt\(cant\)/.test(web),"web · la cantidad admite decimales (numDecWeb), no parseInt que trunca 12,5");
prueba(/function equivDePresentacionWeb\(/.test(web),"web · existe equivDePresentacionWeb (no se enmascara la equivalencia faltante a 1)");
prueba(/equiv: equivDePresentacionWeb\(o\.equiv_qq, pres\)/.test(web)&&!/unidad: pres, equiv: Number\(o\.equiv_qq\) \|\| 1/.test(web),"web · el catálogo del armador ya no hace Number(equiv_qq)||1 (una presentación no-Quintal sin equivalencia queda inválida)");
prueba(/equiv: equivDePresentacionWeb\(prod\.equiv, prod\.unidad\)/.test(web),"web · agregarLinea conserva el equiv real (no lo re-enmascara a 1)");

/* ── PED_OPTIMISTA_QQ · la tarjeta optimista de la app se expresa en quintales ── */
const comi=fs.readFileSync(path.join(raiz,"Comisionista.html"),"utf8");
prueba(/PED_OPTIMISTA_QQ/.test(app)&&/PED_OPTIMISTA_QQ/.test(comi),"queda el ancla PED_OPTIMISTA_QQ en freelance y comisionista");
prueba(/const qqLinea = Math\.round\(\(Number\(it\.cant\)\|\|0\)\*eq\*100\)\/100/.test(app),"freelance · la línea optimista convierte cant×equiv a quintales");
prueba(/const precioQqLinea = Math\.round\(\(\(Number\(it\.precio\)\|\|0\)\/eq\)\*100\)\/100/.test(app),"freelance · el precio optimista sale de precio÷equiv ($/qq)");
prueba(/const totalCant = lineasQq\.reduce\(\(s,l\)=>s\+\(Number\(l\.qq\)\|\|0\),0\)/.test(app),"freelance · el total de la tarjeta suma quintales, no la presentación cruda");
prueba(!/const totalCant = carrito\.reduce\(\(s,it\)=>s\+\(Number\(it\.cant\)\|\|0\),0\)/.test(app),"freelance · ya no se suma la cantidad cruda en la tarjeta optimista");
prueba(/prod:it\.prodNombre\|\|it\.prod, cant:qqLinea, precio:precioQqLinea/.test(comi),"comisionista · la tarjeta optimista usa qqLinea y precioQqLinea (no it.cant/it.precio crudos)");

/* ── PED_P0_2_AGRUPAR_WEB · la lista de pedidos de la web es UNA fila por pedido ── */
prueba(/PED_P0_2_AGRUPAR_WEB/.test(web),"queda el ancla PED_P0_2_AGRUPAR_WEB en la web");
prueba(/className="ped-cabecera"/.test(web),"web · la lista renderiza una cabecera por pedido (ped-cabecera)");
prueba(/const prodGuia = nLineas \? \(\(its\[0\]\.descripcion \|\| its\[0\]\.prod_id\)/.test(web),"web · cargarPedidosVivos arma una fila por pedido con prodGuia + totalQq + lineas");
prueba(!/\(porPed\[pd\.ped_id\]\|\|\[\]\)\.forEach\(\(x,i\) => filas\.push/.test(web),"web · ya no se hace filas.push por ítem (lista aplanada)");

/* ── PED_NUMERO_Y_MODAL · la lista muestra «Pedido N.º» y la fila abre un modal de solo lectura ── */
prueba((web.match(/PED_NUMERO_Y_MODAL/g)||[]).length >= 3,"queda el ancla PED_NUMERO_Y_MODAL (select, fila-modal, componente)");
prueba(/th\("numero","Pedido N.º"\)/.test(web)&&!/th\("producto","Productos"\)/.test(web),"web · la cabecera dice «Pedido N.º» y ya no «Productos»");
prueba(/numero_pedido,fecha_entrega,nota_chofer,retiro_bodega,asume_flete,asume_estibada,flete_cobro_qq,estibada_cobro_qq/.test(web),"web · el select trae numero_pedido y los datos del modal");
prueba(/numero: pd\.numero_pedido \|\| null/.test(web),"web · la fila expone el número de pedido (numero_pedido)");
prueba(/function ModalPedido\(\{ p, onCerrar, onEditar/.test(web),"web · existe el componente ModalPedido (solo lectura)");
prueba(/const abrirModalPed = \(p\) => setPedModal\(p\);/.test(web)&&/e\.currentTarget\.focus\(\); abrirModalPed\(p\);/.test(web),"web · el clic en la fila abre el modal (abrirModalPed → setPedModal)");/* PED_FE_003 · el clic de fila/tarjeta abre el modal por un manejador único */
prueba(/role="dialog" aria-modal="true"/.test(web),"web · el modal es accesible (role=dialog, aria-modal)");
prueba(/if\(e\.key==="Escape"\)\{ e\.preventDefault\(\); onCerrar\(\); return; \}/.test(web),"web · el modal cierra con la tecla Escape");
prueba(/onClick=\{\(e\)=>\{ e\.stopPropagation\(\); abrirEdicionArmar\(p\.pedId\); \}\}/.test(web),"web · el lápiz usa stopPropagation (no abre el modal) y va directo a editar");
prueba(!/className="ped-detalle"/.test(web)&&!/const \[pedAbierto/.test(web),"web · se retiró el acordeón inline (ped-detalle / pedAbierto): el detalle vive en el modal");

/* ── PED_MONTO_SUMA_LINEAS · el monto del pedido es la suma de las líneas, no cant × promedio ── */
const comi2=fs.readFileSync(path.join(raiz,"Comisionista.html"),"utf8");
const socio=fs.readFileSync(path.join(raiz,"socio-comercial.html"),"utf8");
prueba(/PED_MONTO_SUMA_LINEAS/.test(app)&&/PED_MONTO_SUMA_LINEAS/.test(comi2)&&/PED_MONTO_SUMA_LINEAS/.test(socio),"queda el ancla PED_MONTO_SUMA_LINEAS en freelance, comisionista y socio");
prueba(/function montoDePedido\(p\)\{/.test(app),"freelance · existe la función montoDePedido (suma de líneas)");
prueba(/const monto=montoDePedido\(p\);/.test(app)&&!/const monto=p\.cant\*p\.precio;/.test(app),"freelance · el monto del pedido usa montoDePedido, ya no cant × precio promedio");
prueba(/importe: Math\.round\(importe\*100\)\/100,/.test(app)&&/importe: Math\.round\(importe\*100\)\/100,/.test(comi2)&&/importe: Math\.round\(importe\*100\)\/100,/.test(socio),"los tres apps exponen el importe exacto del pedido (Σ qq×precio)");

/* ── DISENO_BASE_ERP · molde ERP del Sistema Web: iconos vectoriales, paleta y fuente únicas ── */
prueba(/DISENO_BASE_ERP/.test(web),"queda el ancla DISENO_BASE_ERP en la web");
prueba(/cta:"#17492e", fieldGreen:"#f6f8f3", fieldMaiz:"#fdf3df"/.test(web),"la paleta define cta, fieldGreen y fieldMaiz (ningún color suelto)");
prueba(!/background:"#f6f8f3"/.test(web)&&!/background:"#fdf3df"/.test(web),"«Subir pedido» ya no usa fondos hardcodeados (#f6f8f3/#fdf3df), sino tokens de COLOR");
prueba(!/fontFamily:"'Space Grotesk','Inter',sans-serif"/.test(web),"ninguna pantalla declara tipografía propia (Space Grotesk inline reemplazado por FUENTE)");
prueba(/settings:|building:|briefcase:|scale:|trendingUp:/.test(web) && /home:|inbox:|beaker:|package:/.test(web),"el set ICONS incluye los iconos vectoriales del menú (Lucide inline)");
prueba(/<Ico name=\{s\.ic\}/.test(web),"el menú lateral pinta iconos vectoriales (<Ico name={s.ic}/>), no emojis");

/* ── DISENO_CLIENTES_ERP · la pantalla Clientes rediseñada a la línea ERP (solo estilo) ── */
prueba((web.match(/DISENO_CLIENTES_ERP/g)||[]).length >= 2,"queda el ancla DISENO_CLIENTES_ERP en ClientesWeb y FichaCliente");
{ const cw = web.slice(web.indexOf("function ClientesWeb"), web.indexOf("function DashboardCliente"));
  const fc = web.slice(web.indexOf("function FichaCliente"), web.indexOf("function ModalAgregarVinculo"));
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{25CF}✅✓✕]/u;
  const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g,"");
  prueba(!emoji.test(sinComentarios(cw)),"ClientesWeb ya no tiene emojis renderizados (usa <Ico>)");
  prueba(!emoji.test(sinComentarios(fc)),"FichaCliente ya no tiene emojis renderizados (usa <Ico>)");
  prueba(/"calendar"/.test(cw)&&/"userCheck"/.test(cw)&&/"creditCard"/.test(cw)&&/dato\(/.test(cw),"ClientesWeb usa iconos vectoriales del molde en las tarjetitas (calendar/userCheck/creditCard vía dato())");
}

/* ── DISENO_DASHBOARD_CIERRE · Portada de 2 pestañas (sin «Indicadores») + Resumen del día ERP ── */
prueba((web.match(/DISENO_DASHBOARD_CIERRE/g)||[]).length >= 2,"queda el ancla DISENO_DASHBOARD_CIERRE en la Portada y el Resumen del día");
prueba(/\[\["tablero","home","Tablero"\],\["resumen","calendar","Resumen del día"\]\]/.test(web),"la Portada deja solo 2 pestañas (Tablero y Resumen del día) con icono vectorial");
prueba(!/pTab==="indicadores"/.test(web) && !/\{pTab==="indicadores" && <Dashboard/.test(web),"la pestaña «Indicadores» ya no se renderiza en la Portada (el Dashboard viejo queda sin ruta de acceso)");
prueba(/function Dashboard\(\{ navegar \}\)/.test(web),"la función Dashboard NO se borra (se reaprovecha luego en el Tablero)");
{ const rd = web.slice(web.indexOf("function ResumenDiaWeb"), web.indexOf("// ── COMUNICACIÓN"));
  /* el mismo detector de emojis que Clientes, PERO sin el bloque de flechas (←-⇿):
     «Logística → Novedades» y otros usan → legítimo, que no es un emoji a convertir. */
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{25CF}✅✓✕]/u;
  /* quita comentarios de bloque y de línea (las cenefas «──» viven en comentarios //) */
  const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:])\/\/[^\n]*/g,"$1");
  prueba(!emoji.test(sinComentarios(rd)),"ResumenDiaWeb ya no tiene emojis renderizados (usa <Ico>)");
  prueba(/"banknote"/.test(rd) && /"shield"/.test(rd) && /name=\{ic\}/.test(rd),"las 4 tarjetas de plata pasan icono vectorial al molde (<Ico name={ic}/>)");
  prueba(/name=\{a\.ic\}/.test(rd) && /name="chevronRight"/.test(rd),"los pendientes usan icono vectorial (a.ic) y chevron vectorial a la derecha");
}

/* ── DISENO_SUBIR_PEDIDO · la vista «armar» del pedido migrada al molde ERP (solo estilo) ── */
prueba((web.match(/DISENO_SUBIR_PEDIDO/g)||[]).length >= 2,"queda el ancla DISENO_SUBIR_PEDIDO en la vista armar");
{ const pw = web.slice(web.indexOf("function PedidosWeb"), web.indexOf("// ── Catálogo (web):"));
  prueba(!/<Icono /.test(pw),"PedidosWeb ya no usa el set de iconos VIEJO (<Icono>): todo pasó a <Ico> Lucide");
  prueba(!/window\.dispatchEvent\(new CustomEvent\("nav-inicio"\)\)/.test(pw),"el botón «Inicio» se quitó de la cabecera del pedido");
  prueba(/const chipEntrega = /.test(pw) && /chipEntrega\(!retiroBodega, "truck"/.test(pw),"«¿Dónde lo recibe?» usa chips con icono (truck/warehouse)");
  prueba(/name="plus"/.test(pw) && /name="send"/.test(pw) && /name="trash"/.test(pw) && /name="creditCard"/.test(pw),"Agregar/Subir/Borrar/Cupo usan iconos vectoriales del molde");
  prueba(/name="lock"/.test(pw) && /name="star"/.test(pw),"cliente bloqueado usa lock y Favoritos usa star (sin emojis)");
  /* iconos nuevos declarados en el set ICONS (fuera del slice de PedidosWeb) */
  prueba(/warehouse:|repeat:|tag:|plus:|trash:|send:|lock:|chevronUp:|chevronDown:/.test(web),"el set ICONS incluye los iconos nuevos de la vista armar");
}

/* ── DISENO_LOGISTICA_ESCOGER · Logística «Escoger pedidos»: número + nombre de persona + ciudad resaltada ── */
prueba((web.match(/DISENO_LOGISTICA_ESCOGER/g)||[]).length >= 3,"queda el ancla DISENO_LOGISTICA_ESCOGER (helper, select, ciudad, item)");
prueba((web.match(/const nombreClientePedido = \(p\) =>/g)||[]).length === 1,"nombreClientePedido está definida UNA sola vez, a nivel de módulo (reutilizable por Pedidos y Logística)");
prueba(/ped_id,numero_pedido,factura,creado,cli_id,estado,estado_logistico/.test(web),"logística · el select trae numero_pedido");
prueba(/clientes\(nombre,razon_social,tipo,ubicaciones_cliente/.test(web),"logística · el join de clientes trae razon_social y tipo (para el nombre de persona)");
prueba(/numero: p\.numero_pedido \|\| null,/.test(web)&&/razon: \(p\.clientes && p\.clientes\.razon_social\) \|\| null,/.test(web)&&/tipoCli: \(p\.clientes && p\.clientes\.tipo\) \|\| null,/.test(web),"logística · el mapeo expone numero, razon y tipoCli del pedido");
prueba(/textTransform:"uppercase"[^>]*>\{nombreClientePedido\(p\)\}<\/span>/.test(web),"logística · el item de cliente usa nombreClientePedido en mayúsculas");
prueba(/>\{p\.numero \|\| p\.id\}<\/span>/.test(web),"logística · el item muestra el número de pedido (p.numero || p.id)");
prueba(/<Ico name="mapPin" size=\{18\} color=\{COLOR\.tealDark\} \/>/.test(web),"logística · el encabezado de ciudad lleva el pin vectorial (mapPin) del molde");

/* ── DISENO_LOGISTICA_FILA_DATOS · la fila trae fecha/días/piladora/vendedor en una sola línea, y hay orden «Más recientes» ── */
prueba(/DISENO_LOGISTICA_FILA_DATOS/.test(web),"queda el ancla DISENO_LOGISTICA_FILA_DATOS");
prueba(/creado: p\.creado,/.test(web)&&/prov: \(p\.proveedores && p\.proveedores\.nombre\)/.test(web),"logística · el mapeo expone creado (fecha) y prov (piladora) por fila");
prueba(/const fmtFechaLog = \(iso\) =>/.test(web)&&/const diasDeLog = \(iso\) =>/.test(web),"logística · existen los helpers de fecha (fmtFechaLog) y días (diasDeLog)");
prueba(/fmtFechaLog\(p\.creado\)/.test(web)&&/diasDeLog\(p\.creado\)/.test(web),"logística · la fila muestra la fecha de ingreso y los días");
prueba(/<b[^>]*>\{p\.prov\}<\/b>/.test(web)&&/<b[^>]*>\{p\.sc\}<\/b>/.test(web),"logística · la fila muestra la piladora (p.prov) y el vendedor (p.sc), solo el valor");
prueba(!/Ingresó <b[^>]*>\{fmtFechaLog/.test(web)&&!/>Piladora <b[^>]*>\{p\.prov/.test(web)&&!/Vendedor <b[^>]*>\{p\.sc/.test(web)&&!/"hace " \+ n/.test(web)&&!/return "hace 1 día"/.test(web),"logística · se quitaron las palabras-etiqueta de la fila (Ingresó/Piladora/Vendedor/«hace»), quedan solo los valores");
prueba(/name="calendar"/.test(web)&&/name="clock"/.test(web)&&/name="warehouse"/.test(web)&&/name="user"/.test(web),"logística · la fila usa iconos Lucide (calendar, clock, warehouse, user)");
prueba(/minWidth:760/.test(web),"logística · la fila tiene min-width para deslizarse en horizontal en pantallas angostas");
prueba(/\["fecha","↓ Más recientes"\]/.test(web)&&/ordenP1==="fecha"/.test(web),"logística · existe el orden «↓ Más recientes» (por fecha de ingreso)");

/* ── DISENO_LOGISTICA_DESPACHO_PARCIAL · casilleros por producto al armar la ruta ── */
prueba((web.match(/DISENO_LOGISTICA_DESPACHO_PARCIAL/g)||[]).length >= 3,"queda el ancla DISENO_LOGISTICA_DESPACHO_PARCIAL");
prueba(/pedido_items\(item_id,descripcion,cantidad_qq,despachado_qq,condicion\)/.test(web),"logística · el select trae item_id y condicion de cada línea");
prueba(/id: \(i\.item_id != null \? i\.item_id : null\)/.test(web),"logística · el mapeo expone el item_id de cada línea");
prueba(/const \[excluidos, setExcluidos\]/.test(web)&&/const \[logAbierto, setLogAbierto\]/.test(web),"logística · hay estado para el despliegue del pedido y las líneas excluidas");
prueba(/const toggleItem = \(p, it\) =>/.test(web)&&/const confirmarExcluir = \(\) =>/.test(web),"logística · existen toggleItem y confirmarExcluir");
prueba(/items_excluidos: Object\.keys\(excluidos\[id\] \|\| \{\}\)/.test(web),"logística · el payload de crear_ruta manda items_excluidos por pedido");
prueba(/¿Seguro que no quiere enviar este producto a despacho\?/.test(web),"logística · el aviso de desmarcar usa el texto exacto");
prueba(/Sí, dejar fuera/.test(web)&&/>No<\/button>/.test(web),"logística · el aviso tiene los botones «Sí, dejar fuera» / «No»");
prueba(/Debe quedar al menos un producto para enviar este pedido a la ruta\./.test(web),"logística · no se puede dejar un pedido sin ningún producto");
prueba(/const qqPlan = \(p\) =>/.test(web),"logística · los qq mostrados reflejan solo las líneas marcadas (qqPlan)");

/* ── DISENO_LOGISTICA_ESCALAS_QQ · «Escoger pedidos»: 4 niveles de qq por color, píldora flotante y badge CONTADO ── */
prueba((web.match(/DISENO_LOGISTICA_ESCALAS_QQ/g)||[]).length >= 6,"logística · queda el ancla DISENO_LOGISTICA_ESCALAS_QQ");
/* 1) los 4 niveles de qq */
prueba(/fontSize:17\.5, fontWeight:800, color:"#123d29", margin:0 \}\}>\{Math\.round\(qqC\)\}/.test(web),"logística · TOTAL DE CIUDAD en verde bosque #123d29 (el más fuerte)");
prueba(/fontSize:15, fontWeight:800, color:COLOR\.text \}\}>\{Math\.round\(qqIra\)\} qq/.test(web),"logística · TOTAL DEL PEDIDO en tinta, peso 800, ~15");
prueba(/fontSize:13, fontWeight:600, color: excl\?"#c0392b":COLOR\.muted, textDecoration: excl\?"line-through":"none" \}\}>\{it\.q\} qq/.test(web),"logística · LÍNEA DE PRODUCTO gris peso 600; excluido en rojo #c0392b tachado");
prueba(/background:"#E4EFE7", borderRadius:8, padding:"3px 10px" \}\}>Irá a despacho:/.test(web),"logística · «Irá a despacho» con pastilla #E4EFE7 (el resultado resalta)");
/* 2) píldora flotante (reemplaza la barra inline; nunca las dos) · ARRASTRABLE y con la suma que resta excluidos */
prueba(/position:"fixed", zIndex:60, touchAction:"none", cursor:"grab"/.test(web)&&/bottom:"calc\(16px \+ env\(safe-area-inset-bottom, 0px\)\)"/.test(web),"logística · la píldora es flotante fija (respeta la barra del sistema en móvil)");
prueba(/onPointerDown=\{pillPointerDown\} onPointerMove=\{pillPointerMove\} onPointerUp=\{pillPointerUp\}/.test(web),"logística · la píldora se arrastra con Pointer Events (dedo y mouse)");
prueba(/window\.innerWidth  - d\.w - M/.test(web)&&/window\.innerHeight - d\.h - M/.test(web),"logística · el arrastre tiene tope al borde de la pantalla (clamp)");
prueba(/e\.target\.closest\("\[data-nodrag\]"\)/.test(web)&&/<button data-nodrag/.test(web),"logística · arrastrar desde «Guardar» NO mueve la píldora (data-nodrag)");
prueba(/const qqSel = idsSel\.reduce\(\(a,id\)=>\{ const p=pedidos\.find\(x=>x\.id===id\); return a\+\(p\?qqPlan\(p\):0\); \},0\)/.test(web),"logística · qqSel usa qqPlan (resta los productos excluidos), no logQQ");
prueba(/const qqC = lista\.reduce\(\(a,p\)=>a\+qqPlan\(p\),0\)/.test(web),"logística · el total de ciudad qqC también usa qqPlan (resta excluidos)");
prueba(/🚚 \{idsSel\.length\} E · <span className="num">\{Math\.round\(qqSel\)\} qq<\/span>/.test(web),"logística · la píldora muestra «N E · qqSel qq» (texto corto)");
prueba(/>Guardar ✓<\/button>/.test(web),"logística · el botón dice «Guardar ✓»");
prueba(!/🚚 \{idsSel\.length\} entregas/.test(web)&&!/>Guardar ruta ✓<\/button>/.test(web),"logística · ya no quedan los textos largos («entregas» / «Guardar ruta ✓»)");
/* 3) condición de pago: fuera del detalle, badge en la fila del cliente */
prueba(!/\{it\.cond\?<span style=\{\{ color:COLOR\.muted, fontWeight:500 \}\}> · \{it\.cond\}<\/span>:null\}/.test(web),"logística · el detalle YA NO muestra contado/crédito por producto");
prueba(/const esContado = \(p\.items\|\|\[\]\)\.length>0 && p\.items\.every\(it => \/contado\/i\.test\(it\.cond\|\|""\)\)/.test(web),"logística · esContado se deriva de las líneas (mixto NO es contado)");
prueba(/esContado && <span[\s\S]{0,240}💵 CONTADO<\/span>/.test(web),"logística · la fila del cliente muestra «💵 CONTADO» solo en pedidos de contado");

/* ── DISENO_LOGISTICA_QQ_RECORTADO · Orden de entrega / Despacho respetan el qq recortado (qq_planificado de la base) ── */
prueba((web.match(/DISENO_LOGISTICA_QQ_RECORTADO/g)||[]).length >= 4,"logística · queda el ancla DISENO_LOGISTICA_QQ_RECORTADO");
prueba(/ruta_pedidos\(ped_id,orden_entrega,ciudad,ubicacion_id,estado_asignacion,qq_planificado,items_excluidos\)/.test(web),"logística · recargarRutas trae qq_planificado e items_excluidos");
prueba(/qqPlan: Object\.fromEntries\(rp\.map\(x => \[x\.ped_id, x\.qq_planificado==null\?null:Number\(x\.qq_planificado\)\]\)\)/.test(web),"logística · mapRutaViva expone el mapa qqPlan por pedido");
prueba(/const qqRutaPed = \(r,p\) => \(r\.qqPlan && r\.qqPlan\[p\.id\]!=null\) \? r\.qqPlan\[p\.id\] : logQQ\(p\)/.test(web),"logística · qqRutaPed usa lo planificado y cae a logQQ en rutas viejas");
prueba(/const qqRuta = \(r\) => \{ const s = pedidosDe\(r\)\.reduce\(\(a,p\)=>a\+qqRutaPed\(r,p\),0\); return s>0 \? s : \(Number\(r\.qq\)\|\|0\); \}/.test(web),"logística · qqRuta suma qqRutaPed (total de la ruta, tablas, despacho y capacidad)");
prueba(/\{Math\.round\(qqRutaPed\(r, p\)\)\} qq<\/p>/.test(web),"logística · la fila de «Orden de entrega» muestra el qq recortado (qqRutaPed)");
prueba(/\{Math\.round\(qqRutaPed\(r, p\)\)\} qq<\/span>/.test(web),"logística · el detalle de la ruta muestra el qq recortado (qqRutaPed)");

/* ── DISENO_LOGISTICA_SIN_AVISO_REALES · se quitaron los dos avisos verdes solo-informativos ── */
prueba(/DISENO_LOGISTICA_SIN_AVISO_REALES/.test(web),"logística · queda el ancla DISENO_LOGISTICA_SIN_AVISO_REALES");
prueba(!/● Pedidos reales · \{pedidos\.length\}/.test(web),"logística · ya no está el aviso «Pedidos reales · N sin despachar»");
prueba(!/🟢 Rutas reales · " \+ rutas\.length \+ " en Supabase\./.test(web),"logística · ya no está el aviso «Rutas reales · N en Supabase»");
/* los avisos ÚTILES se conservan */
prueba(/No hay pedidos listos para despachar\./.test(web),"logística · se conserva el aviso «no hay pedidos listos»");
prueba(/Pedidos de DEMOSTRACIÓN · no son tuyos\./.test(web),"logística · se conserva el aviso de DEMOSTRACIÓN");

/* ── PED_NOMBRE_PERSONA · la lista de Pedidos de las 3 apps móviles muestra el nombre de persona en MAYÚSCULAS ── */
prueba(/function nombreClientePedido\(p\)\{/.test(app)&&/function nombreClientePedido\(p\)\{/.test(comi)&&/function nombreClientePedido\(p\)\{/.test(socio),"las 3 apps definen el helper nombreClientePedido (mismo criterio que el Sistema Web)");
prueba(/clientes"\)\.select\("cli_id,nombre,razon_social,tipo"\)/.test(app)&&/clientes"\)\.select\("cli_id,nombre,razon_social,tipo"\)/.test(comi)&&/clientes"\)\.select\("cli_id,nombre,razon_social,tipo"\)/.test(socio),"las 3 apps traen razon_social y tipo para armar el nombre de persona");
prueba(/textTransform:"uppercase"[^>]*>\{nombreClientePedido\(p\)\}<\/span>/.test(app),"freelance · la fila usa nombreClientePedido en mayúsculas");
prueba(/textTransform:"uppercase"[^>]*>\{nombreClientePedido\(pedido\)\}<\/div>/.test(comi),"comisionista · la fila usa nombreClientePedido en mayúsculas");
prueba(/className="cli" style=\{\{textTransform:"uppercase"\}\}>\{nombreClientePedido\(p\)\}<\/div>/.test(socio),"socio · la fila usa nombreClientePedido en mayúsculas");
prueba(/money\(pedido\.comision\)/.test(comi)&&/money\(p\.comision\)/.test(socio),"la comisión («tu comisión») SE CONSERVA en la lista de comisionista y socio (es lo que gana el vendedor)");

/* ── PED_FE_001 · Pedidos (web): clasifica por CÓDIGO canónico + pestañas + colores + sin Trazabilidad ── */
prueba(/PED_FE_001/.test(web),"queda el ancla PED_FE_001");
/* cada pedido lleva el código crudo */
prueba(/estadoCod: pd\.estado \|\| null, estadoLog: pd\.estado_logistico \|\| null/.test(web),"web · cada pedido lleva el CÓDIGO crudo estadoCod/estadoLog (del listado)");
/* tabDePed por código, con la precedencia y el default seguro */
prueba(/const tabDePed = \(p\) =>/.test(web)&&/const cod = String\(\(p && p\.estadoCod\) \|\| ""\)/.test(web)&&/const log = String\(\(p && p\.estadoLog\) \|\| ""\)/.test(web),"web · tabDePed clasifica por estadoCod/estadoLog (código), no por la etiqueta");
prueba(/if \(cod === "anulado"\) return "anulados";/.test(web),"web · anulado → 'anulados'");
prueba(/if \(cod === "cliente_pago" \|\| cod === "cerrado"\) return "entregados";\s*\n\s*if \(retiro\) return "retiros";/.test(web),"web · LOTE2 · el retiro PAGADO/CERRADO gana sobre «retiros» → 'entregados'");
prueba(/if \(log === "entregado" \|\| cod === "entregado"\) return "entregados";/.test(web),"web · entregado (log o cod) → 'entregados' (tras retiros)");
prueba(/if \(log === "despachado" \|\| cod === "despachado"\) return "en_ruta";/.test(web),"web · despachado (o log despachado) → 'en_ruta'");
prueba(/if \(cod === "facturado"\) return "por_despachar";/.test(web),"web · facturado sin despachar → 'por_despachar'");
prueba(/if \(cod === "ingresado" \|\| cod === "esperando_aprobacion" \|\| cod === "enviado_proveedor"\) return "pendientes";/.test(web),"web · ingresado/esperando_aprobacion/enviado_proveedor → 'pendientes'");
prueba(/return "sin_clasificar";/.test(web),"web · NEGATIVO: lo desconocido/nulo cae a 'sin_clasificar' (NUNCA a entregados)");
prueba(!/return "entregados";\s*\/\* Entregado, Cliente pagó, Cerrado \*\//.test(web),"web · ya NO existe el default viejo a 'entregados'");
/* pestañas: 6 base + Sin clasificar condicional; «Todos» incluye anulados */
prueba(/\[\["todos","Todos"\],\["pendientes","Pendientes"\],\["por_despachar","Por despachar"\],\["en_ruta","En ruta"\],\["retiros","🏭 Retiros"\],\["entregados","Entregados"\],\["anulados","Anulados"\]\]/.test(web),"web · las 7 pestañas base en orden (Todos/Pendientes/Por despachar/En ruta/🏭 Retiros/Entregados/Anulados) · LOTE2");
prueba(/haySinClasificar \? \[\["sin_clasificar","Sin clasificar"\]\] : \[\]/.test(web),"web · «Sin clasificar» solo aparece si hay ≥1 pedido ahí");
prueba(/k === "todos" \? pedidos\.length/.test(web),"web · «Todos» cuenta todos (incluye anulados)");
prueba(/const \[pTab, setPTab\] = useState\("pendientes"\)/.test(web),"web · la pestaña por defecto es Pendientes");
prueba(/\{pedidosTab\.length\}[\s\S]{0,90}pedidos · \{porRevisarTab\} por revisar/.test(web),"web · el rótulo «N pedidos · N por revisar» respeta la pestaña activa");/* PED_FE_002 · admite el «de N» opcional del total del servidor entre length y «pedidos» */
prueba(/p\.estadoLog==="parcial" &&/.test(web),"web · «Por despachar»: los pedidos en 'parcial' llevan alerta de saldo");
/* colores por código: «Anulado» NO azul, con icono */
prueba(/const colorEstado = \(p\) =>/.test(web),"web · colorEstado mapea por el objeto (código)");
prueba(/if \(cod === "anulado"\) return \{ bg:"#FDECEC", c:"#b91c1c", icon:"⛔" \}/.test(web),"web · NEGATIVO: «Anulado» se pinta rojo, no azul de pedido vivo");
prueba(/\{ce\.icon\} \{p\.estado\}/.test(web),"web · el estado muestra icono + texto (no depende solo del color)");
/* Trazabilidad quitada de Pedidos; enlace a Logística */
prueba(!/const vistaTraza = \(\) =>/.test(web),"web · NEGATIVO: ya NO existe vistaTraza (Trazabilidad) en Pedidos");
prueba(!/📲 Avisar al cliente/.test(web),"web · NEGATIVO: ya NO existe «Avisar al cliente» (recorrido demo) en Pedidos");
prueba(!/"traza","🔍 Trazabilidad"/.test(web),"web · NEGATIVO: ya NO existe la pestaña «Trazabilidad»");
prueba(/🚚 Ver en Logística/.test(web)&&/onIrLogistica={\(\)=>setSeccion\("trazabilidad"\)}/.test(web),"web · hay un enlace «Ver en Logística» que abre el módulo Logística");
/* fecha en hora de Ecuador */
prueba(/fecha: pd\.creado \? hoyECWeb\(new Date\(pd\.creado\)\) : ""/.test(web),"web · la fecha del pedido va en hora de Ecuador (hoyECWeb), no slice(0,10) UTC");
prueba(!/fecha: String\(pd\.creado\|\|""\)\.slice\(0,10\)/.test(web),"web · NEGATIVO: ya no queda el slice(0,10) UTC de la fecha del pedido");
/* subtítulo honesto */
prueba(/label:"Pedidos",\s+sub:"Gestión y seguimiento de pedidos"/.test(web),"web · el subtítulo de Pedidos es «Gestión y seguimiento de pedidos»");
prueba(!/Aprobaciones por lote/.test(web),"web · NEGATIVO: ya no queda «Aprobaciones por lote»");

/* ── PED_ESCOGER_SIN_RETIRO_BODEGA · Logística no ofrece los pedidos «retira en bodega» ── */
prueba(/PED_ESCOGER_SIN_RETIRO_BODEGA/.test(web),"queda el ancla PED_ESCOGER_SIN_RETIRO_BODEGA");
prueba(/!enRuta\(p\.id\) && !p\.retiroBodega/.test(web),"logística · «Escoger pedidos» filtra por !p.retiroBodega (NULL cuenta como elegible)");
prueba(!/\.neq\("retiro_bodega",\s*true\)/.test(web),"logística · NO se usa .neq(retiro_bodega,true) en el select (descartaría los NULL)");

/* ── NOMBRE_CLIENTE_INTEGRIDAD_2 · cerrar las pantallas que faltaban con la MISMA función ── */
prueba((web.match(/NOMBRE_CLIENTE_INTEGRIDAD_2/g)||[]).length >= 10,"web · queda el ancla NOMBRE_CLIENTE_INTEGRIDAD_2 en las pantallas cerradas (Cobranza, Solicitudes, Logística)");
prueba((app.match(/NOMBRE_CLIENTE_INTEGRIDAD_2/g)||[]).length >= 5,"freelance · queda el ancla NOMBRE_CLIENTE_INTEGRIDAD_2 (Notas, Novedades, Solicitudes, Agenda, Arranque, Cartera, Comisiones)");
/* web · los selects vivos traen razon_social,tipo del cliente */
prueba(/mov_id,cli_id,doc,emision,vence,monto,estado,clientes\(nombre,razon_social,tipo\)/.test(web),"web · Cobranza trae clientes(nombre,razon_social,tipo)");
prueba(/cli_id,detalle,estado,motivo_resp,creado,resuelto_en,es_demo,usuarios\(nombre\),clientes\(nombre,razon_social,tipo\)/.test(web),"web · Solicitudes trae clientes(nombre,razon_social,tipo)");
prueba(/viaje_guias\(guia_id,ped_id,orden_entrega,qq,estado_entrega,entregado_qq,entregado_en,receptor,clientes\(nombre,razon_social,tipo\)\)/.test(web),"web · Logística (viajes vivos) trae clientes(nombre,razon_social,tipo) en las guías");
prueba(/viaje_guias\(guia_id,estado_entrega,clientes\(nombre,razon_social,tipo\)\)/.test(web),"web · Logística (aviso de guías sin cerrar) trae clientes(nombre,razon_social,tipo)");
prueba(/respuesta,resuelto_en,resuelto_por,es_demo,clientes\(nombre,razon_social,tipo\)/.test(web),"web · Novedades (vivo) trae clientes(nombre,razon_social,tipo)");
/* web · las pantallas muestran el nombre con la función única, y dejan `cliente` crudo para filtros/búsqueda */
prueba(/\{nombreClientePedido\(\{cli:x\.c, razon:x\.razon, tipoCli:x\.tipoCli\}\)\}/.test(web),"web · Cobranza muestra el nombre con nombreClientePedido");
prueba(/pide · cliente "\+nombreClientePedido\(\{cli:x\.cliente,razon:x\.razon,tipoCli:x\.tipoCli\}\)/.test(web),"web · Solicitudes muestra el nombre con nombreClientePedido");
prueba(/\{nombreClientePedido\(\{cli:n\.cliente, razon:n\.razon, tipoCli:n\.tipoCli\}\)\}/.test(web),"web · Novedades (lista) muestra el nombre con nombreClientePedido");
prueba(/nombreClientePedido\(\{cli:g\.cliente, razon:g\.razon, tipoCli:g\.tipoCli\}\)/.test(web),"web · Logística (aviso de guías) muestra el nombre con nombreClientePedido");
/* freelance · la vista v_comisiones_app ya trae razon_social/tipo/ruc y se formatea con la misma función */
prueba(/ped:d\.ped_id, cli:d\.cliente, razon:d\.razon_social\|\|null, tipoCli:d\.tipo\|\|null, ruc:d\.ruc\|\|null/.test(app),"freelance · Comisiones toma razon_social/tipo/ruc de la vista v_comisiones_app (sin tocar la base)");
prueba(/window\.SB\.from\("clientes"\)\.select\("cli_id,nombre,razon_social,tipo,sub_id,cupo,usado,plazo,tel,tel2,bloqueado,motivo_bloqueo,estado_credito"\)/.test(app),"freelance · Cartera trae tipo del cliente para el nombre canónico");

/* ── NOMBRE_CLIENTE_INTEGRIDAD_3 · Proveedor, Socio y Comisionista (solo pantalla) ── */
const prov=fs.readFileSync(path.join(raiz,"proveedor-freelance.html"),"utf8");
/* la MISMA función (una sola verdad) en las tres apps, con RUC (3.er dígito) y MAYÚSCULAS */
prueba(/function nombreClientePedido\(p\)\{/.test(prov)&&/const d3=ruc\.length>=3\?ruc\.charAt\(2\):"";/.test(prov)&&/\.toUpperCase\(\)/.test(prov),"proveedor · define nombreClientePedido canónica (RUC + MAYÚSCULAS)");
prueba(/d3==="9"\|\|d3==="6"/.test(socio)&&/d3==="9"\|\|d3==="6"/.test(comi),"socio y comisionista · nombreClientePedido ahora usa el 3.er dígito del RUC y MAYÚSCULAS (misma regla)");
/* Comisionista · el nombre corto del buscador se UNIFICÓ (delega en la función única) */
prueba(/return nombreClientePedido\(\{cli:nombre, razon:razon\}\);/.test(comi),"comisionista · refCortoCliente delega en nombreClientePedido (sin criterios duplicados)");
/* proveedor · el select de clientes trae razon_social,tipo y el índice los guarda */
prueba(/from\("clientes"\)\.select\("cli_id,nombre,razon_social,tipo"\)/.test(prov),"proveedor · el select de clientes trae razon_social,tipo");
prueba(/nCli\[c\.cli_id\]=\{nombre:c\.nombre, razon:c\.razon_social\|\|null, tipoCli:c\.tipo\|\|null\}/.test(prov),"proveedor · el índice nCli guarda nombre+razon+tipo");
/* socio y comisionista · Novedades y Agenda ahora traen razon_social,tipo (3 selects: Pedidos+Novedades+Agenda) */
prueba((socio.match(/select\("cli_id,nombre,razon_social,tipo"\)/g)||[]).length>=3,"socio · Novedades y Agenda amplían el select a razon_social,tipo");
prueba((comi.match(/select\("cli_id,nombre,razon_social,tipo"\)/g)||[]).length>=3,"comisionista · Novedades y Agenda amplían el select a razon_social,tipo");
/* socio · la Cotización agrega tipo (ya traía razon_social y ruc) */
prueba(/select\("cli_id,nombre,razon_social,tipo,ruc,tel,tel2,plazo,condicion_pago,activo"\)/.test(socio),"socio · la Cotización trae tipo del cliente");
/* anclas de la tanda en las tres apps */
prueba((prov.match(/NOMBRE_CLIENTE_INTEGRIDAD_3/g)||[]).length>=6,"proveedor · quedan las anclas NOMBRE_CLIENTE_INTEGRIDAD_3");
prueba((socio.match(/NOMBRE_CLIENTE_INTEGRIDAD_3/g)||[]).length>=8,"socio · quedan las anclas NOMBRE_CLIENTE_INTEGRIDAD_3");
prueba((comi.match(/NOMBRE_CLIENTE_INTEGRIDAD_3/g)||[]).length>=8,"comisionista · quedan las anclas NOMBRE_CLIENTE_INTEGRIDAD_3");
/* versiones de las tres apps tocadas */
prueba(/const VERSION = \{ n:"71"/.test(prov),"proveedor debe anunciar v71");
prueba(/const VERSION = \{ n:"60"/.test(socio),"socio debe anunciar v60");
prueba(/const VERSION = \{ n:"193"/.test(comi),"comisionista debe anunciar v193");

if(mal){console.error(`Resultado CAMBIOS-422: ${bien} ✓ · ${mal} ✗`);process.exit(1);}
console.log(`Resultado CAMBIOS-422: ${bien} ✓ · 0 ✗`);
