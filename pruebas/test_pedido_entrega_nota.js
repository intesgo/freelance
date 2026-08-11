#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   FECHA DE ENTREGA + NOTA PARA EL CHOFER en las apps que toman pedidos

   El sistema web (b144) ya capta al crear un pedido dos campos opcionales que
   viajan en el payload de `registrar_pedido_atomico`: `fecha_entrega` y
   `nota_chofer`. Estas dos claves se replicaron en las apps móviles que crean
   pedidos por esa misma función. Esta prueba vigila, POR APP, que:

     1) exista el estado local (fechaEntregaPed / notaChoferPed),
     2) la pantalla del pedido tenga los dos campos (input date + textarea),
     3) los valores se pasen a guardarPedidoEnBase, y
     4) el PAYLOAD incluya EXACTAMENTE `fecha_entrega` y `nota_chofer` con la
        misma normalización que el sistema web (fecha||null · nota.trim()||null).

   NO se toca proveedor-freelance.html: esa app solo LEE pedidos, no los crea.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, "..");

const APPS = ["freelance-completo.html", "Comisionista.html", "socio-comercial.html"];

let bien = 0, mal = 0;
const prueba = (ok, msg) => { if (ok) bien++; else { mal++; console.error("✗ " + msg); } };

for (const app of APPS) {
  const src = fs.readFileSync(path.join(raiz, app), "utf8");

  /* 1) Estado local para los dos campos */
  prueba(/const \[fechaEntregaPed,\s*setFechaEntregaPed\]\s*=\s*useState\(""\)/.test(src),
    `${app}: falta el estado fechaEntregaPed`);
  prueba(/const \[notaChoferPed,\s*setNotaChoferPed\]\s*=\s*useState\(""\)/.test(src),
    `${app}: falta el estado notaChoferPed`);

  /* 2) Los dos campos en la pantalla del pedido */
  prueba(/<input\s+type="date"\s+value=\{fechaEntregaPed\}\s+onChange=\{e=>setFechaEntregaPed\(e\.target\.value\)\}/.test(src),
    `${app}: falta el <input type="date"> de Fecha de entrega`);
  prueba(/<textarea\s+value=\{notaChoferPed\}\s+onChange=\{e=>setNotaChoferPed\(e\.target\.value\)\}/.test(src),
    `${app}: falta el <textarea> de Nota para el chofer`);
  prueba(/Fecha de entrega/.test(src), `${app}: falta el rótulo "Fecha de entrega"`);
  prueba(/Nota para el chofer/.test(src), `${app}: falta el rótulo "Nota para el chofer"`);

  /* 3) Los valores se pasan a guardarPedidoEnBase */
  prueba(/fechaEntrega:\s*fechaEntregaPed/.test(src),
    `${app}: la fecha no se pasa a guardarPedidoEnBase`);
  prueba(/notaChofer:\s*notaChoferPed/.test(src),
    `${app}: la nota no se pasa a guardarPedidoEnBase`);

  /* 4) EL PAYLOAD incluye las dos claves, con la misma normalización que el web */
  prueba(/fecha_entrega:\s*fechaEntrega\s*\|\|\s*null/.test(src),
    `${app}: el payload no incluye fecha_entrega: fechaEntrega||null`);
  prueba(/nota_chofer:\s*\(notaChofer\s*&&\s*notaChofer\.trim\(\)\)\s*\|\|\s*null/.test(src),
    `${app}: el payload no incluye nota_chofer: (notaChofer&&notaChofer.trim())||null`);
}

if (mal) { console.error(`Resultado ENTREGA+NOTA: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado ENTREGA+NOTA: ${bien} ✓ · 0 ✗`);
