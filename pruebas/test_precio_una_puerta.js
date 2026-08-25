#!/usr/bin/env node
/* PRECIO_UNA_SOLA_PUERTA · el costo/base de una oferta de piladora se versiona por UNA sola
   función (versionarOfertaWeb). Antes tres pantallas tenían su copia y dos retoques del mismo
   día dejaban DOS filas vigentes. Este arnés vigila que la puerta exista una vez, que las tres
   pantallas entren por ella, que no haya una quinta escritura suelta y que sigan vivas la regla
   del mismo día, el vigente_desde de la ficha y la auditoría. Solo lee el fuente. */
const fs = require("fs"), path = require("path");
const web = fs.readFileSync(path.join(__dirname, "..", "sistema-web.html"), "utf8");
let b = 0, m = 0; const ok = (c, x) => { if (c) b++; else { m++; console.error("✗ " + x); } };

/* 1) la puerta existe, UNA sola vez y declarada con `function` (hoisting: la usa FichaProducto). */
const decl = (web.match(/function versionarOfertaWeb\s*\(/g) || []).length;
ok(decl === 1, "versionarOfertaWeb está declarada exactamente una vez (encontradas: " + decl + ")");
ok(/async function versionarOfertaWeb\(o, nuevos, usuario\)\{/.test(web), "versionarOfertaWeb se declara con `function` (hoisting), no con const/arrow");

/* 2) el ancla del cambio. */
ok(/PRECIO_UNA_SOLA_PUERTA/.test(web), "ancla PRECIO_UNA_SOLA_PUERTA presente");

/* 3) las tres pantallas entran por la puerta, cada una con su rótulo de auditoría. */
const usos = (web.match(/versionarOfertaWeb\s*\(/g) || []).length;   /* declaración + 3 llamadas = 4 */
ok(usos >= 4, "la puerta se usa desde las tres pantallas (apariciones del nombre: " + usos + ", esperado ≥4 con la declaración)");
ok(/operacion:"Costo\/Base por piladora"/.test(web), "Piladoras · Costos y Base llama a la puerta con su rótulo");
ok(/operacion: "Costo\/Base desde la ficha del producto"/.test(web), "la ficha del producto llama a la puerta con su rótulo");
ok(/operacion: "Alza de costo por piladora"/.test(web), "el alza en bloque llama a la puerta con su rótulo");

/* 4) NO hay una segunda puerta: como mucho 4 escrituras sueltas a ofertas_piladora
   (3 de la puerta + 1 del alta de producto). Una quinta sería otra copia del versionado. */
const escr = (web.match(/from\("ofertas_piladora"\)\s*\.(insert|update|delete|upsert)/g) || []).length;
ok(escr <= 4, "hay como mucho 4 escrituras sueltas a ofertas_piladora (encontradas: " + escr + " · 3 puerta + 1 alta)");

/* 5) la tabla `precios` (congelada) sigue de solo lectura: nadie le escribe. */
ok(!/from\("precios"\)\s*\.(insert|update|delete|upsert)/.test(web), "nadie escribe en la tabla `precios` (congelada, solo lectura)");

/* 6) sigue viva la regla del mismo día y la ficha trae vigente_desde en SUS DOS lecturas. */
ok(/MISMO_DIA_ACTUALIZA/.test(web), "MISMO_DIA_ACTUALIZA sigue vivo (regla del mismo día)");
const fichaConDesde = (web.match(/v_ofertas_vigentes"\)[\s\S]{0,240}vigente_desde[\s\S]{0,80}\.eq\("prod_id", prod\.id\)/g) || []).length;
ok(fichaConDesde >= 2, "las DOS lecturas de la ficha (carga y recarga) traen vigente_desde (encontradas: " + fichaConDesde + ")");

/* 7) la auditoría sigue guardando el antes y el después. */
ok(/valor_anterior:JSON\.stringify/.test(web) && /valor_nuevo:JSON\.stringify/.test(web), "la auditoría guarda valor_anterior y valor_nuevo");

if (m) { console.error(`PRECIO-UNA-PUERTA: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`PRECIO-UNA-PUERTA: ${b} ✓ · 0 ✗`);
