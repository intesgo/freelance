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

probar(/const VERSION = \{ n:"419"/.test(app), "la aplicación debe anunciar v419");
probar(/const CACHE = "freelance-v209"/.test(sw), "el service worker debe renovar la caché a v209");

probar(/className="busc-grande proveedor-destacado"/.test(app), "el buscador de proveedor debe estar resaltado");
probar(/items=\{PROVS_PED\} sinLabel value=\{prov\} multiPalabra/.test(app), "el proveedor debe buscar por palabras sueltas");
probar(/Puedes escribir palabras sueltas/.test(app), "el buscador debe explicar la búsqueda por palabras");

probar(/const \[secMenu,setSecMenu\]=useState\(""\)/.test(app), "los grupos deben iniciar plegados");
probar(/const abrirMenu=React\.useCallback\(\(\)=>\{ setSecMenu\(""\); setMenuAbierto\(true\); \},\[\]\)/.test(app), "cada apertura debe plegar los grupos");
probar(/onClick=\{abrirMenu\} aria-label="Abrir menú"/.test(app), "el botón del menú debe usar la apertura plegada");
probar(/border-left:4px solid var\(--field-700\)/.test(app), "los encabezados grupales deben estar resaltados");

probar(app.includes('className={"card"+(!rojo?" cliente-insights":"")}'), "la tarjeta de información debe usar el nuevo diseño");
probar(/Información de compras/.test(app), "la tarjeta debe tener encabezado grupal");
probar(/\.cliente-insights\{margin-top:28px!important/.test(app), "la tarjeta debe quedar separada más abajo");

const recortesPedido = [
  /prodPend\.foto[\s\S]{0,180}objectFit:"cover"/,
  /f\.prod\.foto[\s\S]{0,180}objectFit:"cover"/,
  /p\.foto[\s\S]{0,180}objectFit:"cover"/
];
probar(recortesPedido.every(r => !r.test(app)), "las fotos del pedido no deben usar recorte cover");
probar((app.match(/objectFit:"contain"/g)||[]).length >= 5, "las vistas de producto deben conservar la imagen completa");

if (mal) {
  console.error(`Resultado CAMBIOS-419: ${bien} ✓ · ${mal} ✗`);
  process.exit(1);
}
console.log(`Resultado CAMBIOS-419: ${bien} ✓ · 0 ✗`);
