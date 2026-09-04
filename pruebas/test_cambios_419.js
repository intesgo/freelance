#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const app = fs.readFileSync(path.join(__dirname, "..", "freelance-completo.html"), "utf8");
const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
let bien = 0, mal = 0;
const probar = (ok, mensaje) => {
  if (ok) bien++;
  else { mal++; console.error("✗ " + mensaje); }
};

probar(/const VERSION = \{ n:"483"/.test(app), "la aplicación debe anunciar v481");
probar(/const CACHE = "freelance-v357"/.test(sw), "el service worker debe renovar la caché a v346");

/* DISENO_APP_COLUMNA · con "Sitio para computadoras" (viewport inflado) la app
   se ve como columna centrada (480px), no estirada; y la puerta (login) queda
   topada al mismo ancho. Solo diseño; no toca la detección JS de vw-inflado. */
probar(/:root\.vw-inflado\{--appw:480px\}/.test(app), "en modo escritorio la app debe quedar como columna centrada (480px), no estirada");
probar(!/:root\.vw-inflado\{--appw:100%\}/.test(app), "el blindaje vw-inflado ya no debe forzar el ancho completo");
probar(/\.puerta\{max-width:var\(--appw\);margin-left:auto;margin-right:auto\}/.test(app), "el login (.puerta) debe quedar topado y centrado al ancho de la app");
probar(/:root\.vw-inflado \.puerta \.pt-cuerpo\{justify-content:center\}/.test(app), "en modo escritorio la tarjeta de ingreso debe centrarse en vertical");
probar(/\.puerta \.pt-cuerpo\{justify-content:flex-start\}/.test(app), "en el teléfono real la tarjeta de ingreso se queda arriba (b451)");
probar(/raiz\.classList\.toggle\("vw-inflado", inflado\)/.test(app), "la detección JS de vw-inflado NO debe cambiar (innerWidth>700 && screen.width<700)");

probar(/className="busc-grande proveedor-destacado"/.test(app), "el buscador de proveedor debe estar resaltado");
probar(/items=\{PROVS_PED\} sinLabel value=\{prov\} multiPalabra/.test(app), "el proveedor debe buscar por palabras sueltas");
probar(!/Puedes escribir palabras sueltas/.test(app), "el buscador no debe mostrar la ayuda de palabras sueltas");

probar(/const \[secMenu,setSecMenu\]=useState\(""\)/.test(app), "los grupos deben iniciar plegados");
probar(/const abrirMenu=React\.useCallback\(\(\)=>\{ setSecMenu\(""\); setMenuAbierto\(true\); \},\[\]\)/.test(app), "cada apertura debe plegar los grupos");
probar(/onClick=\{abrirMenu\} aria-label="Abrir menú"/.test(app), "el botón del menú debe usar la apertura plegada");
probar(/border-left:4px solid var\(--field-700\)/.test(app), "los encabezados grupales deben estar resaltados");

probar(app.includes('className={"card"+(!rojo?" cliente-insights":"")}'), "la tarjeta de información debe usar el nuevo diseño");
/* b428 · la pantalla de entrada se separó en dos: se quitaron las estadísticas
   de demo (Información de compras) y la entrega vive en su propia pantalla. */
probar(!/Información de compras/.test(app), "se debe quitar la tarjeta de estadísticas de demo (Información de compras)");
probar(!/Suele comprar cada/.test(app) && !/Puesto en compras/.test(app), "no deben quedar las estadísticas de demo del cliente");
probar(/Detalles de entrega/.test(app), "debe existir el botón/pantalla \"Detalles de entrega\"");
probar(/const \[verEntrega,setVerEntrega\]=useState\(false\)/.test(app), "la segunda pantalla de entrega debe tener su propio estado");
probar(/\.cliente-insights\{margin-top:28px!important/.test(app), "la tarjeta debe quedar separada más abajo");

const recortesPedido = [
  /prodPend\.foto[\s\S]{0,180}objectFit:"cover"/,
  /f\.prod\.foto[\s\S]{0,180}objectFit:"cover"/,
  /p\.foto[\s\S]{0,180}objectFit:"cover"/
];
probar(recortesPedido.every(r => !r.test(app)), "las fotos del pedido no deben usar recorte cover");
probar((app.match(/objectFit:"contain"/g)||[]).length >= 5, "las vistas de producto deben conservar la imagen completa");
probar(/grid-template-columns:0\.72fr 1fr/.test(app), "el pedido debe conservar la distribución compacta original");
probar(/aspect-ratio:0\.677\/1}/.test(app), "la foto principal debe conservar el tamaño original de la tarjeta");
probar(!/\.ps-foto\{[^}]*min-height:440px/.test(app), "la foto no debe forzar el ancho ni descuadrar las tarjetas");
probar(!/const min=Math\.min\(img\.width, img\.height\)/.test(app), "la carga no debe recortar la imagen a un cuadrado");
probar(/ctx\.drawImage\(img, 0, 0, img\.width, img\.height, 0, 0, ancho, alto\)/.test(app), "la carga debe conservar todo el encuadre original");

if (mal) {
  console.error(`Resultado CAMBIOS-419: ${bien} ✓ · ${mal} ✗`);
  process.exit(1);
}
console.log(`Resultado CAMBIOS-419: ${bien} ✓ · 0 ✗`);
