#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   NOMBRE_CLIENTE_INTEGRIDAD · la función única del nombre del cliente
   (nombreClientePedido) se comporta igual en el Sistema Web y en Freelance:
     · natural  → primer nombre + primer apellido de la RAZÓN SOCIAL, MAYÚSCULAS.
     · jurídica → razón social en MAYÚSCULAS.
     · jurídica si el 3.er dígito del RUC es 9 o 6, o el tipo lo dice, o la razón
       trae marca de empresa (S.A., Cía, Ltda…).
   Se extrae la función real de cada HTML y se evalúa en un sandbox.
   Uso: node test_nombre_cliente.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path"), vm = require("vm");

let ok = 0, mal = 0;
const prueba = (c, msg) => { if (c) ok++; else { mal++; console.error("✗ " + msg); } };

function extraerFn(archivo) {
  const src = fs.readFileSync(path.join(__dirname, "..", archivo), "utf8");
  // acepta `const nombreClientePedido = (p) => { … };` o `function nombreClientePedido(p){ … }`
  let m = src.match(/const nombreClientePedido = \(p\) => \{[\s\S]*?\n\};/);
  let expr = m ? "(" + m[0].replace(/^const nombreClientePedido = /, "").replace(/;\s*$/, "") + ")"
                : null;
  if (!expr) {
    m = src.match(/function nombreClientePedido\(p\)\{[\s\S]*?\n\}/);
    expr = m ? "(" + m[0] + ")" : null;
  }
  if (!expr) throw new Error("no se encontró nombreClientePedido en " + archivo);
  return vm.runInNewContext(expr, {});
}

for (const archivo of ["sistema-web.html", "freelance-completo.html"]) {
  let fn;
  try { fn = extraerFn(archivo); }
  catch (e) { prueba(false, archivo + ": " + e.message); continue; }
  const et = " [" + archivo + "]";

  // natural: la razón trae el nombre completo → primer nombre + primer apellido, MAYÚSCULAS
  prueba(fn({ razon: "Dora Libia Diaz Mora" }) === "DORA DIAZ", "«Dora Libia Diaz Mora» → «DORA DIAZ»" + et);
  prueba(fn({ razon: "Pedro Rodrigo Castillo Rosero" }) === "PEDRO CASTILLO", "«Pedro Rodrigo Castillo Rosero» → «PEDRO CASTILLO»" + et);
  prueba(fn({ razon: "Pedro Castillo Rosero" }) === "PEDRO CASTILLO", "3 palabras → primer nombre + primer apellido" + et);
  prueba(fn({ razon: "Ana" }) === "ANA", "una sola palabra se respeta, en mayúsculas" + et);

  // jurídica por marca de empresa en la razón
  prueba(fn({ razon: "Comercial Mendoza S.A." }) === "COMERCIAL MENDOZA S.A.", "empresa (S.A.) → razón social en MAYÚSCULAS" + et);
  prueba(fn({ razon: "Distribuidora Ríos Cía. Ltda." }) === "DISTRIBUIDORA RÍOS CÍA. LTDA.", "empresa (Cía. Ltda.) → razón social en MAYÚSCULAS" + et);

  // jurídica por tipo
  prueba(fn({ razon: "Bodega El Agricultor", tipoCli: "Empresa" }) === "BODEGA EL AGRICULTOR", "tipo Empresa → jurídica (razón completa)" + et);

  // jurídica por 3.er dígito del RUC = 9 (empresa privada)
  prueba(fn({ nombre: "Supermercado Norte", razon: "Supermercado Norte", ruc: "1790012345001" }) === "SUPERMERCADO NORTE", "RUC 3.er dígito 9 → jurídica (razón completa)" + et);
  // 3.er dígito 6 (sector público) → jurídica
  prueba(fn({ razon: "Gobierno Provincial", ruc: "0160001230001" }) === "GOBIERNO PROVINCIAL", "RUC 3.er dígito 6 → jurídica" + et);
  // natural (cédula 3.er dígito 0-5) NO se fuerza a jurídica
  prueba(fn({ razon: "Dora Libia Diaz Mora", ruc: "0102030405001" }) === "DORA DIAZ", "RUC de persona natural (3.er dígito 0) NO fuerza jurídica" + et);

  // acepta el objeto de pedido {cli} y la ficha {nombre}
  prueba(fn({ cli: "Tienda", razon: "Juan Perez Lopez" }) === "JUAN PEREZ", "acepta pedido {cli,razon}" + et);
  prueba(fn({ nombre: "Tienda", razon_social: "Maria Elena Vega Cruz" }) === "MARIA VEGA", "acepta ficha {nombre,razon_social}" + et);
}

if (mal) { console.error(`Resultado NOMBRE-CLIENTE: ${ok} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado NOMBRE-CLIENTE: ${ok} ✓ · 0 ✗`);
