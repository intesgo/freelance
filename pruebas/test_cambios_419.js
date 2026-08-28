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

probar(/const VERSION = \{ n:"480"/.test(app), "la aplicación debe anunciar v480");
probar(/const CACHE = "freelance-v338"/.test(sw), "el service worker debe renovar la caché a v338");

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
