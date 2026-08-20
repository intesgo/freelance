#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
const sw=fs.readFileSync(path.join(raiz,"sw.js"),"utf8");
let bien=0,mal=0; const prueba=(ok,msg)=>{if(ok)bien++;else{mal++;console.error("✗ "+msg);}};

/* ── freelance-completo (sin cambios en esta entrega) ── */
prueba(/const VERSION = \{ n:"461"/.test(app),"Freelance debe anunciar v461");
prueba(!/Buenos días,\s+[A-ZÁÉÍÓÚÑ]/.test(app),"la portada no debe mostrar el saludo personalizado eliminado");
prueba(/totalRecibir\/metaMes\*100/.test(app),"el porcentaje financiero debe salir de valor/meta");
prueba(/valorAnimado/.test(app)&&/pctAnimado/.test(app),"valor y porcentaje deben animarse");
prueba(/prefers-reduced-motion/.test(app),"las animaciones deben respetar movimiento reducido");
prueba(!/className="inicio-resumen"/.test(app),"la portada no debe incluir la fila compacta de indicadores");
prueba(!/Puedes escribir palabras sueltas/.test(app),"no debe mostrarse el texto informativo del proveedor");
prueba(/productos-scroll/.test(app)&&/padding-bottom:calc\(82px/.test(app),"productos debe desplazarse por encima de la barra inferior");
prueba(/tab!=="inicio"/.test(app),"la burbuja de voz no debe tapar la portada");

/* ── Sistema Web · versión y caché ── */
prueba(/const VERSION = \{ n:"175"/.test(web),"Sistema Web debe anunciar b175");
prueba(/const CACHE = "freelance-v270"/.test(sw),"la caché debe renovarse");

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
prueba(/name="home"/.test(web),"Cancelar e Inicio deben estar en la cabecera");
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

if(mal){console.error(`Resultado CAMBIOS-422: ${bien} ✓ · ${mal} ✗`);process.exit(1);}
console.log(`Resultado CAMBIOS-422: ${bien} ✓ · 0 ✗`);
