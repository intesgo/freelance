#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
const sw=fs.readFileSync(path.join(raiz,"sw.js"),"utf8");
let bien=0,mal=0; const prueba=(ok,msg)=>{if(ok)bien++;else{mal++;console.error("✗ "+msg);}};

/* ── freelance-completo (sin cambios en esta entrega) ── */
prueba(/const VERSION = \{ n:"443"/.test(app),"Freelance debe anunciar v443");
prueba(!/Buenos días,\s+[A-ZÁÉÍÓÚÑ]/.test(app),"la portada no debe mostrar el saludo personalizado eliminado");
prueba(/totalRecibir\/metaMes\*100/.test(app),"el porcentaje financiero debe salir de valor/meta");
prueba(/valorAnimado/.test(app)&&/pctAnimado/.test(app),"valor y porcentaje deben animarse");
prueba(/prefers-reduced-motion/.test(app),"las animaciones deben respetar movimiento reducido");
prueba(!/className="inicio-resumen"/.test(app),"la portada no debe incluir la fila compacta de indicadores");
prueba(!/Puedes escribir palabras sueltas/.test(app),"no debe mostrarse el texto informativo del proveedor");
prueba(/productos-scroll/.test(app)&&/padding-bottom:calc\(82px/.test(app),"productos debe desplazarse por encima de la barra inferior");
prueba(/tab!=="inicio"/.test(app),"la burbuja de voz no debe tapar la portada");

/* ── Sistema Web · versión y caché ── */
prueba(/const VERSION = \{ n:"155"/.test(web),"Sistema Web debe anunciar b155");
prueba(/const CACHE = "freelance-v241"/.test(sw),"la caché debe renovarse");

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

/* ── b149 · Precio especial (P5): piso = costo + flete + estibada ── */
prueba(/const requiereAutorizacion = esP5 && !esFreelanceWeb/.test(web),"el freelance ya no se autoriza a sí mismo el precio especial");
prueba(/const bajoPiso = /.test(web)&&/precioNum < pisoUnidad/.test(web),"debe calcularse si el precio queda por debajo del piso");
prueba(/&& !bajoPiso;/.test(web),"un precio por debajo del piso debe invalidar el pedido");
prueba(/from\("tarifas_fe"\)/.test(web),"el piso debe leer las tarifas de flete/estibada de la base");
prueba(/costo: Number\(o\.costo\) \|\| Number\(o\.costo_contado\)/.test(web),"la oferta debe traer su costo para el piso");

if(mal){console.error(`Resultado CAMBIOS-422: ${bien} ✓ · ${mal} ✗`);process.exit(1);}
console.log(`Resultado CAMBIOS-422: ${bien} ✓ · 0 ✗`);
