#!/usr/bin/env node
/* WEB-02 · el módulo «Fletes y estibada» (recepcion) se retiró (ya lo reemplazaron
   FE-01…FE-06). Vigila que no quede ningún rastro navegable de `recepcion` y —lo más
   importante— que las constantes demo compartidas EF_* SIGAN (las usan 6 módulos). */
const fs=require("fs"),path=require("path");
const web=fs.readFileSync(path.join(__dirname,"..","sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* ── no queda rastro del módulo ── */
ok(!/"recepcion"/.test(web), "no queda ninguna clave \"recepcion\" (menú, permisos, router, navegaciones)");
ok(!/recepcion:/.test(web), "no queda entrada recepcion en AYUDA_SECCION ni VIDEOS_AYUDA");
ok(!/EstibadaFletesWeb/.test(web), "el componente EstibadaFletesWeb ya no existe (ni su case)");
ok(!/label:"Fletes y estibada"/.test(web), "no queda la entrada de menú «Fletes y estibada»");
ok(!/ir:"recepcion"|key:"recepcion"/.test(web), "ninguna tarjeta del Dashboard/Resumen apunta a recepcion");

/* ── lo que SÍ debe seguir: el demo compartido y los reemplazos ── */
ok(/const EF_VIAJES_INI/.test(web), "EF_VIAJES_INI (demo compartido) NO se borró");
ok(/const EF_TRANSPORTISTAS_INI/.test(web), "EF_TRANSPORTISTAS_INI (demo compartido) NO se borró");
ok(/function PagosFeVivos/.test(web), "el reemplazo real (PagosFeVivos, módulo Pagos) sigue");
ok(/FE06_GUIAS_SIN_CERRAR/.test(web), "el reemplazo del aviso de pendientes (FE-06 en Logística) sigue");

/* ── la navegación repunta a lo real ── */
ok(/parada\(s\) sin cerrar hace 3\+ días[\s\S]{0,120}key:"trazabilidad"/.test(web), "la tarjeta de paradas sin cerrar lleva a Logística (trazabilidad)");

/* ── las filas de auditoría (historia) se conservan ── */
ok(/modulo:"Fletes y estibada"/.test(web), "las filas de auditoría con módulo «Fletes y estibada» se conservan (historia)");

if(m){console.error(`WEB02-RETIRO: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`WEB02-RETIRO: ${b} ✓ · 0 ✗`);
