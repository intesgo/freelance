#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   DISENO_CAT_VARIEDAD · Productos (CatalogoWeb) · columna VARIEDAD + filtro
   «Sin variedad». La variedad se lee de la base (grano_variedades / grano_familias)
   con respaldo en las constantes del archivo. El contador cuenta SOLO líneas con
   grano. Este arnés mezcla inspección del fuente y la lógica pura de variedadDe/usaGrano.
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const web = fs.readFileSync(path.join(__dirname, "..", "sistema-web.html"), "utf8");
let b = 0, m = 0; const ok = (c, x) => { if (c) b++; else { m++; console.error("✗ " + x); } };

/* ── Réplica de la lógica del componente, alimentada con el catálogo de respaldo
   (las mismas familias/variedades de las constantes del archivo). ── */
const FAMILIAS = [
  { familia_cod:"C09", nombre:"Grano corriente", linea:"Arroz" },
  { familia_cod:"L11", nombre:"Grano largo 011", linea:"Arroz" },
  { familia_cod:"F14", nombre:"Grano Ferón",     linea:"Arroz" },
];
const VARIEDADES = [
  { variedad_cod:"C0901", familia_cod:"C09", nombre:"Grano corriente económico" },
  { variedad_cod:"L1103", familia_cod:"L11", nombre:"Grano largo 011 especial" },
  { variedad_cod:"F1401", familia_cod:"F14", nombre:"Grano Ferón económico" },
];
const LINEAS_CON_GRANO = [...new Set(FAMILIAS.map(f => f.linea).filter(Boolean))];
const usaGrano = (p) => LINEAS_CON_GRANO.includes(p.linea || "");
const variedadDe = (cod) => {
  const c = String(cod || "").trim().toUpperCase();
  if (!c) return { estado:"vacio" };
  const v = VARIEDADES.find(x => x.variedad_cod.toUpperCase() === c);
  if (!v) return { estado:"desconocida", desc:c, cod:c, familia:"" };
  const f = FAMILIAS.find(x => x.familia_cod === v.familia_cod);
  return { estado:"ok", desc:v.nombre, cod:v.variedad_cod, familia: f ? f.nombre : v.familia_cod };
};

/* 1 · la cabecera tiene seis columnas y «Variedad» va tercera */
ok(/gridTemplateColumns:"2\.2fr \.8fr 1\.3fr 1fr \.9fr 1\.4fr"/.test(web), "la rejilla de la tabla tiene seis columnas");
ok(/<span>Producto<\/span><span>Unidad<\/span><span>Variedad<\/span><span>Presentaciones<\/span><span>Rentab\.<\/span><span>Piladoras<\/span>/.test(web),
   "la cabecera pone Variedad tercera, entre Unidad y Presentaciones");

/* 2 · L1103 → nombre + «código · familia» */
const r2 = variedadDe("L1103");
ok(r2.estado === "ok" && r2.desc === "Grano largo 011 especial" && r2.cod === "L1103" && r2.familia === "Grano largo 011",
   "L1103 traduce a «Grano largo 011 especial» con «L1103 · Grano largo 011»");

/* 3 · Arroz sin variedad → «—» (vacío pero usa grano) */
ok(variedadDe("").estado === "vacio" && usaGrano({ linea:"Arroz" }),
   "un producto de Arroz sin variedad cae en «vacío» y usa grano (muestra «—»)");

/* 4 · línea sin grano y sin variedad → celda vacía (el fuente devuelve null) */
ok(!usaGrano({ linea:"Enlatados" }),
   "una línea sin grano (Enlatados) NO usa grano");
ok(/vr\.estado === "vacio" && !usaGrano\(p\)\) return null/.test(web),
   "el fuente deja la celda vacía (null) para una línea sin grano y sin variedad");

/* 5 · si la lectura falla, se usa el respaldo del archivo (no código pelado) */
ok(/const VARIEDADES_OK = \(variedades && variedades\.length\)/.test(web) &&
   /VARIEDADES_GRANO\.map\(v =>/.test(web), "hay respaldo: VARIEDADES_OK cae a VARIEDADES_GRANO");
ok(/const FAMILIAS_OK = \(familias && familias\.length\)/.test(web) &&
   /FAMILIAS_GRANO\.map\(f =>/.test(web), "hay respaldo: FAMILIAS_OK cae a FAMILIAS_GRANO");
ok(/const VARIEDADES_GRANO = \[/.test(web) && /const FAMILIAS_GRANO = \[/.test(web),
   "las constantes de respaldo siguen en el archivo (no se borraron)");

/* 6 · un código que no está en el catálogo → «desconocida» + chip «sin ficha» */
const r6 = variedadDe("Z9999");
ok(r6.estado === "desconocida" && r6.cod === "Z9999", "un código sin ficha da estado «desconocida»");
ok(/sin ficha<\/span>/.test(web), "el fuente pinta el chip «sin ficha»");

/* 7 · el contador cuenta SOLO líneas con grano y va sobre PRODS */
ok(/const totalSinVariedad = PRODS\.filter\(p => usaGrano\(p\) && !String\(p\.tipoGrano\|\|""\)\.trim\(\)\)\.length;/.test(web),
   "totalSinVariedad = PRODS con grano y sin variedad (no sobre productosFiltrados)");
ok(/Sin variedad \(\{totalSinVariedad\}\)/.test(web), "el botón dice «Sin variedad (N)»");

/* 8 · un producto de Enlatados NO entra en ese contador (misma guarda usaGrano) */
{
  const PRODS = [{ linea:"Arroz", tipoGrano:"" }, { linea:"Enlatados", tipoGrano:"" }, { linea:"Arroz", tipoGrano:"L1103" }];
  const cuenta = PRODS.filter(p => usaGrano(p) && !String(p.tipoGrano||"").trim()).length;
  ok(cuenta === 1, "el contador cuenta 1 (Arroz sin variedad), no el Enlatado ni el ya clasificado");
}

/* 9 · el filtro deja solo los de línea con grano y sin variedad */
ok(/if \(soloSinVariedad && \(!usaGrano\(p\) \|\| String\(p\.tipoGrano\|\|""\)\.trim\(\)\)\) return false;/.test(web),
   "el filtro «Sin variedad» deja solo los de grano sin variedad");

/* 11 · combina con «Sin piladora» y «Margen bajo» (filtros independientes, no se anulan) */
ok(/if \(soloSinProv && p\.provCod\) return false;/.test(web) &&
   /if \(soloMargenBajo\)/.test(web), "los otros filtros siguen presentes e independientes");

/* 12 · setPagina(0) al encender el filtro */
ok(/setSoloSinVariedad\(v=>!v\); setPagina\(0\);/.test(web), "el botón hace setPagina(0) al alternar");

/* 13 · buscar «largo» encuentra los de esa familia (la búsqueda mira nombre/familia de la variedad) */
ok(/norm\(variedadDe\(p\.tipoGrano\)\.desc \|\| ""\)\.includes\(w\)/.test(web) &&
   /norm\(variedadDe\(p\.tipoGrano\)\.familia \|\| ""\)\.includes\(w\)/.test(web),
   "la búsqueda también mira el nombre y la familia de la variedad");
ok(variedadDe("L1103").familia.toLowerCase().includes("largo"),
   "«largo» aparece en la familia de L1103");
ok(/nombre, marca, código o variedad/.test(web), "el texto del buscador dice «…código o variedad»");

/* 15 · los márgenes NO se tocaron (rentabilidad igual) */
ok(/function preMargenObjetivo\(\) \{ return 8; \}/.test(web), "preMargenObjetivo sigue en 8 % (márgenes intactos)");

/* 16 · en móvil la celda antepone la etiqueta «Variedad:» */
ok(/const etq = movil \? <span style=\{\{ color:COLOR\.muted, fontWeight:600 \}\}>Variedad: <\/span> : null;/.test(web),
   "en móvil la celda muestra la etiqueta «Variedad:»");

/* botón en COLOR.maiz (no teal) */
ok(/border:`1px solid \$\{soloSinVariedad\?COLOR\.maiz:COLOR\.border\}`/.test(web),
   "el botón «Sin variedad» se enciende en COLOR.maiz");

/* el efecto lee de la base grano_variedades y grano_familias */
ok(/from\("grano_variedades"\)/.test(web) && /from\("grano_familias"\)/.test(web),
   "el catálogo se lee de grano_variedades y grano_familias");

if (m) { console.error(`CAT-VARIEDAD: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`CAT-VARIEDAD: ${b} ✓ · 0 ✗`);
