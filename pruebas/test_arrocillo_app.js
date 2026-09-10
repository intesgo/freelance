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
c("CostosPreciosPiladora carga las variantes A01 (activas e inactivas)",
  /window\.SB\.from\("grano_variedades"\)[\s\S]{0,160}\.eq\("familia_cod","A01"\)/.test(app) && /setArrocVars/.test(app));
c("decodifica un código A01xx con el nombre comercial de la base",
  /const esArrocCod=\(cod\)=>String\(cod\|\|""\)\.slice\(0,3\)===ARROCILLO_FAM/.test(app) &&
  /const arrocDe=\(cod\)=>arrocVars\.find/.test(app) &&
  /esArrocCod\(tgCod\) \? \(\(arrocDe\(tgCod\)\|\|\{\}\)\.nombre/.test(app));
c("modal «Variedad» de dos pasos (Arroz / Arrocillo)",
  /¿Qué es\?/.test(app) && /setTgModo\("arrocillo"\)/.test(app) && /tgModo==="arroz" \?/.test(app));
c("paso Arrocillo guarda con busca-o-crea y reúsa guardarTipoGrano",
  /const r=await arrocilloResolverSB\(arrSel\)/.test(app) && /await guardarTipoGrano\(tgSel,r\.cod\)/.test(app));
c("guardarTipoGrano NO cambió (misma escritura a productos.tipo_grano por window.SB)",
  /const guardarTipoGrano=async\(prodId, cod\)=>\{[\s\S]{0,260}window\.SB\.from\("productos"\)\.update\(\{tipo_grano:cod\|\|null\}\)/.test(app));
c("el arroz no cambia: sigue iterando FAMILIAS_GRANO × NIVELES_GRANO en el paso Arroz",
  /tgModo==="arroz" \? \([\s\S]{0,120}FAMILIAS_GRANO\.map\(fam=>/.test(app));
c("panel de administración de variantes montado (AdminArrocilloSB)",
  /function AdminArrocilloSB/.test(app) && /<AdminArrocilloSB arrocVars=\{arrocVars\} recargar=\{cargar\} \/>/.test(app));

if (mal) { console.error(`ARROCILLO-APP: ${ok} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`ARROCILLO-APP: ${ok} ✓ · 0 ✗`);
