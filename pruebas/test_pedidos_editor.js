#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   PEDIDOS (App Freelance) · tres pestañas + editor de líneas

   · freelance-completo.html: el módulo Pedidos pasa de dos pestañas a TRES —
     Pendientes · En camino · Entregados— que dicen dónde está cada pedido.
     Pendientes trae el número; los anulados viven en Entregados pero ocultos
     hasta filtrar «Anulado»; el filtro de estado sirve en las tres.
   · Editor de líneas: desde el detalle de un pedido que todavía se puede tocar,
     el botón «Editar pedido» abre el armador en modo edición con las líneas
     cargadas; al guardar llama a editar_pedido_atomico (NO a registrar).
     La función trabaja en QUINTALES y el armador en presentaciones: se convierte
     con el `equiv` del producto. El cliente y el proveedor quedan fijos.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const fl = fs.readFileSync(path.join(__dirname, "..", "freelance-completo.html"), "utf8");

let bien = 0, mal = 0;
const prueba = (ok, msg) => { if (ok) bien++; else { mal++; console.error("✗ " + msg); } };

/* ── Trabajo 1 · Tres pestañas ── */
prueba(/pestanas?[\s\S]{0,40}pendientes \| encamino \| entregados/.test(fl) || /useState\("pendientes"\)/.test(fl),
  "el módulo entra por defecto en la pestaña Pendientes");
prueba(/pendientes: \["Esperando aprobación","Enviado al proveedor"\]/.test(fl), "Pendientes = por aprobar / enviado al proveedor");
prueba(/encamino:\s*\["Facturado","Despachado"\]/.test(fl), "En camino = facturado / despachado");
prueba(/entregados: \["Entregado","Cobrado y validado","Comisión liberada","Anulado"\]/.test(fl), "Entregados = entregado / cobrado / comisión / anulado");
prueba(/const tabDe = /.test(fl), "cada pedido sabe a qué pestaña va (tabDe)");
prueba(/pestana==="entregados" && p\.estado==="Anulado" && estado!=="Anulado"/.test(fl), "los anulados quedan ocultos en Entregados hasta filtrar «Anulado»");
prueba(/const nPendientes = /.test(fl) && /nPendientes>0\?` \(\$\{nPendientes\}\)`/.test(fl), "la pestaña Pendientes muestra el número cuando hay");
prueba(/const ESTADOS = \["Todos", \.\.\.TAB_ESTADOS\[pestana\]\]/.test(fl), "el filtro de estado se arma según la pestaña activa");
prueba(/Aquí están los pedidos que todavía se pueden editar o anular/.test(fl), "nota de Pendientes");
prueba(/🔒 Ya facturados: van hacia el cliente/.test(fl), "nota de En camino");
prueba(/🔒 Cerrados: quedan para consulta/.test(fl), "nota de Entregados");
prueba(/const irAEstado=\(e\)=>\{[\s\S]{0,220}TAB_ESTADOS\.pendientes\.includes\(e\)/.test(fl), "el embudo lleva cada estado a la pestaña que le toca");

/* ── Trabajo 2 · Editor de líneas ── */
prueba(/const EDITABLES = \["Esperando aprobación","Enviado al proveedor"\]/.test(fl), "Editar solo antes de facturar");
prueba(/const sePuedeEditar = !!vivo && !p\.demo && !!onEditar && EDITABLES\.includes\(p\.estado\)/.test(fl), "Editar: sesión real, no demo, estado editable");
prueba(/✏️ Editar pedido/.test(fl), "existe el botón «Editar pedido»");
prueba(/from\("pedido_items"\)[\s\S]{0,140}item_id,prod_id,pres_cod,descripcion,cantidad_qq,precio_usd,tipo_precio,condicion,gratis_qq,promo_id/.test(fl),
  "el editor lee las líneas de pedido_items con sus columnas");
prueba(/rpc\("editar_pedido_atomico"/.test(fl), "al guardar llama a editar_pedido_atomico");
prueba(/const modoEdicion = !!edicion/.test(fl), "el armador conoce el modo edición");
/* Conversión qq ↔ presentaciones (trampa 1): al cargar y al guardar */
prueba(/const cant = Math\.round\(\(Number\(it\.cantidad_qq\)\|\|0\)\/eq\*100\)\/100/.test(fl), "al cargar: cantidad_qq / equiv");
prueba(/const precio = Math\.round\(\(Number\(it\.precio_usd\)\|\|0\)\*eq\*100\)\/100/.test(fl), "al cargar: precio_usd × equiv");
prueba(/cantidad_qq: Math\.round\(\(Number\(it\.cant\)\|\|0\)\*eq\*100\)\/100/.test(fl), "al guardar: cant × equiv");
prueba(/precio_qq: Math\.round\(\(\(Number\(it\.precio\)\|\|0\)\/eq\)\*100\)\/100/.test(fl), "al guardar: precio / equiv");
/* El cliente y el proveedor quedan fijos en edición */
prueba(/El cliente y el proveedor no se cambian/.test(fl), "en edición se avisa que cliente y proveedor no se cambian");
prueba(/\{cli && !bloqueado && !verFact && !prod && !modoEdicion &&/.test(fl), "en edición no aparece el buscador de proveedor");
/* No dejar el pedido sin líneas (trampa 3) y op_id (contrato) */
prueba(/El pedido no puede quedar sin productos/.test(fl), "no se puede guardar un pedido sin líneas (guía a Anular)");
prueba(/crypto\.randomUUID/.test(fl), "el guardado usa un op_id único");
/* Mensaje de error traducido (trampa 7) */
prueba(/ya no se puede editar\/i[\s\S]{0,80}ya se facturó: ya no se puede editar/.test(fl), "traduce el error «ya no se puede editar»");

if (mal) { console.error(`Resultado PEDIDOS-EDITOR: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado PEDIDOS-EDITOR: ${bien} ✓ · 0 ✗`);
