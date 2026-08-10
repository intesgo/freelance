#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
const sw=fs.readFileSync(path.join(raiz,"sw.js"),"utf8");
let bien=0,mal=0; const prueba=(ok,msg)=>{if(ok)bien++;else{mal++;console.error("✗ "+msg);}};

prueba(/const VERSION = \{ n:"422"/.test(app),"Freelance debe anunciar v422");
prueba(/const VERSION = \{ n:"139"/.test(web),"Sistema Web debe anunciar b139");
prueba(/const CACHE = "freelance-v212"/.test(sw),"la caché debe renovarse");
prueba(/Buenos días, Richard/.test(app),"la portada debe mostrar saludo y resumen diario");
prueba(/totalRecibir\/metaMes\*100/.test(app),"el porcentaje financiero debe salir de valor/meta");
prueba(/valorAnimado/.test(app)&&/pctAnimado/.test(app),"valor y porcentaje deben animarse");
prueba(/prefers-reduced-motion/.test(app),"las animaciones deben respetar movimiento reducido");
prueba(/inicio-resumen/.test(app),"la portada debe incluir resumen de pedidos, cobros, visitas y comisión");
prueba(!/Puedes escribir palabras sueltas/.test(app),"no debe mostrarse el texto informativo del proveedor");
prueba(/productos-scroll/.test(app)&&/padding-bottom:calc\(82px/.test(app),"productos debe desplazarse por encima de la barra inferior");
prueba(/tab!=="inicio"/.test(app),"la burbuja de voz no debe tapar la portada");
prueba(/pedido-web-form/.test(web)&&/35fr/.test(web)&&/65fr/.test(web),"Producto y entrega deben formar paneles 35/65");
prueba(/Cambiar producto/.test(web),"debe mantenerse Cambiar producto");
prueba(/pedido-web-costo/.test(web)&&/pedido-web-asume/.test(web),"Flete y Estibada deben usar bloques horizontales alineados");
prueba(/\["freelance","cliente"\]/.test(web),"quién asume debe ofrecer Freelance y Cliente");
prueba(/pedido-web-dato cantidad/.test(web)&&/pedido-web-dato precio/.test(web),"Cantidad y Precio deben estar resaltados");
prueba(/objectFit:"contain"/.test(web),"la imagen del producto debe mostrarse completa");

if(mal){console.error(`Resultado CAMBIOS-422: ${bien} ✓ · ${mal} ✗`);process.exit(1);}
console.log(`Resultado CAMBIOS-422: ${bien} ✓ · 0 ✗`);
