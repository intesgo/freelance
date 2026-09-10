#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   DISENO_ARROCILLO · app del dueño (freelance-completo.html) — GEMELA del Sistema Web.
   Guardas de fuente: constantes/listas cerradas, resolver por window.SB, carga de las
   variantes A01, decodificación del nombre A01xx, modal «Variedad» de dos pasos y el panel
   de administración. Reúsa guardarTipoGrano tal cual (no la cambia).
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const app = fs.readFileSync(path.join(__dirname, "..", "freelance-completo.html"), "utf8");
let ok = 0, mal = 0;
const c = (t, cond) => { if (cond) { ok++; } else { mal++; console.error("✗ " + t); } };

c("familia A01 y las 5 listas cerradas exactas",
  /const ARROCILLO_FAM = "A01"/.test(app) &&
  /ops:\["3\/4","Medio","Fino"\]/.test(app) &&
  /ops:\["Selectado","No selectado"\]/.test(app) &&
  /ops:\["Envejecido","Natural"\]/.test(app) &&
  /ops:\["Humano","Animal"\]/.test(app) &&
  /ops:\["Especial","Estándar","Económico"\]/.test(app));
c("nombre comercial de vista previa (arrocilloNombre)",
  /const arrocilloNombre = \(v\) =>/.test(app) && /"Arrocillo " \+ \[v\.tipo, v\.proceso, v\.estado, v\.destino, v\.calidad\]\.join\(" · "\)/.test(app));
c("resolver busca-o-crea por window.SB (RPC arrocillo_crear_variante)",
  /async function arrocilloResolverSB/.test(app) && /window\.SB\.rpc\("arrocillo_crear_variante"/.test(app));
c("panel usa arrocillo_activar_variante (nunca borra)",
  /window\.SB\.rpc\("arrocillo_activar_variante"/.test(app) && !/arrocillo_borrar/.test(app));
c("CostosPreciosPiladora carga las variantes A01 con creado (activas e inactivas)",
  /window\.SB\.from\("grano_variedades"\)[\s\S]{0,180}\.eq\("familia_cod","A01"\)/.test(app) && /setArrocVars/.test(app) &&
  /select\("variedad_cod,nombre,activo,creado,arr_tipo/.test(app));
c("modal «Variedad» compartido de dos pasos (ModalVariedad · Arroz / Arrocillo)",
  /function ModalVariedad/.test(app) && /setModo\("arrocillo"\)/.test(app) && /modo==="arroz" \?/.test(app));
c("modal · encabezado con la marca + chip «Actual:», toggle bajo, un solo «Guardar»",
  /Actual: \{actualTxt\}/.test(app) && /const puede = modo==="arroz" \? !!arrozSel : arrocilloCompleto\(arrSel\)/.test(app) &&
  /\{busy\?"Guardando…":"Guardar"\}/.test(app));
c("modal · «Sin clasificar» apartado, autoscroll y chips «usados recientemente»",
  /Sin clasificar/.test(app) && /scrollIntoView\(\{block:"center"\}\)/.test(app) && /Usados recientemente/.test(app));
c("paso Arrocillo busca-o-crea con arrocilloResolverSB; el padre guarda el cod",
  /const r=await arrocilloResolverSB\(arrSel\)/.test(app) && /onGuardar\(r\.cod, nueva\)/.test(app));
c("Costos y precios usa el modal compartido y reúsa guardarTipoGrano",
  /\{tgSel && <ModalVariedad/.test(app) && /await guardarTipoGrano\(tgSel,cod\); setTgSel\(null\)/.test(app));
c("guardarTipoGrano NO cambió (misma escritura a productos.tipo_grano por window.SB)",
  /const guardarTipoGrano=async\(prodId, cod\)=>\{[\s\S]{0,260}window\.SB\.from\("productos"\)\.update\(\{tipo_grano:cod\|\|null\}\)/.test(app));
c("el arroz no cambia: el modal itera FAMILIAS_GRANO × NIVELES_GRANO en el paso Arroz",
  /modo==="arroz" \? \([\s\S]{0,120}FAMILIAS_GRANO\.map\(fam=>/.test(app));
c("Ficha de marca (Productos): decodifica el arrocillo y abre el mismo modal al clasificar",
  /const granoTexto=\(c\)=> esArrocCod\(c\) \? \(\(arrocDeFicha\(c\)\|\|\{\}\)\.nombre/.test(app) &&
  /\{granoTexto\(grano\)\}/.test(app) && /verModalVar && <ModalVariedad/.test(app) &&
  /onGuardar=\{async\(cod, nueva\)=>\{[\s\S]{0,120}await guardarGranoCod\(cod\)/.test(app));
c("Ficha · guardarGranoCod escribe productos.tipo_grano por window.SB (cualquier variedad)",
  /const guardarGranoCod = async \(cod\) =>[\s\S]{0,140}window\.SB\.from\("productos"\)\.update\(\{tipo_grano:cod\|\|null\}\)/.test(app));
c("panel de administración de variantes montado (AdminArrocilloSB)",
  /function AdminArrocilloSB/.test(app) && /<AdminArrocilloSB arrocVars=\{arrocVars\} recargar=\{cargar\} \/>/.test(app));

if (mal) { console.error(`ARROCILLO-APP: ${ok} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`ARROCILLO-APP: ${ok} ✓ · 0 ✗`);
