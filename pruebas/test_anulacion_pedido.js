#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   ANULACIÓN DE PEDIDO · comisionista pide, freelance decide

   · Comisionista.html: desde el detalle de SU pedido puede PEDIR la anulación
     al Freelance (no anula nada; abre una solicitud vía pedir_anulacion_pedido).
   · freelance-completo.html: el Freelance ANULA un pedido desde el detalle
     (anular_pedido), solo antes de facturar; y en Solicitudes resuelve las
     anulaciones que pide el comisionista (resolver_anulacion_pedido), que al
     aprobar anulan el pedido y dejan registro. Las dos pestañas dicen la regla:
     «En proceso» = editable/anulable; «Historial» = sellado (ya facturado).
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, "..");
const com = fs.readFileSync(path.join(raiz, "Comisionista.html"), "utf8");
const fl  = fs.readFileSync(path.join(raiz, "freelance-completo.html"), "utf8");

let bien = 0, mal = 0;
const prueba = (ok, msg) => { if (ok) bien++; else { mal++; console.error("✗ " + msg); } };

/* ── Comisionista: PEDIR anulación (no anula) ── */
prueba(/async function pedirAnulacionPedido\(/.test(com), "Comisionista: debe existir pedirAnulacionPedido");
prueba(/rpc\("pedir_anulacion_pedido"/.test(com), "Comisionista: debe llamar a la RPC pedir_anulacion_pedido");
prueba(/Pedir anulación al Freelance/.test(com), "Comisionista: debe ofrecer «Pedir anulación al Freelance»");
prueba(/Anulación pedida al Freelance/.test(com), "Comisionista: debe mostrar el aviso de anulación pedida");
/* solo antes de facturar (estados anulables) */
prueba(/ANULABLES = \["Esperando aprobación","Enviado al proveedor"\]/.test(com), "Comisionista: solo se pide anular antes de facturar");
prueba(/crypto\.randomUUID/.test(com), "Comisionista: la solicitud usa un op_id");

/* ── Freelance: ANULAR pedido (solo antes de facturar) ── */
prueba(/async function anularPedidoEnBase\(/.test(fl), "Freelance: debe existir anularPedidoEnBase");
prueba(/rpc\("anular_pedido"/.test(fl), "Freelance: debe llamar a la RPC anular_pedido");
prueba(/function AnularPedidoSheet\(/.test(fl), "Freelance: debe existir la hoja de anular pedido");
prueba(/const NO_ANULABLES = \[/.test(fl) && /const sePuedeAnular = /.test(fl), "Freelance: el botón de anular solo aparece si el pedido no está sellado");

/* ── Freelance: pestañas Pendientes / En camino / Entregados (regla sellada) ── */
prueba(/const SELLADOS=\[/.test(fl) && /"Facturado","Despachado"/.test(fl), "Freelance: los facturados/despachados están sellados");
prueba(/Ya facturados: van hacia el cliente/.test(fl), "Freelance: «En camino» explica que está sellado");
prueba(/Aquí están los pedidos que todavía se pueden editar o anular/.test(fl), "Freelance: «Pendientes» explica su regla");

/* ── Freelance: resolver anulaciones que pide el comisionista ── */
prueba(/rpc\("resolver_anulacion_pedido"/.test(fl), "Freelance: Solicitudes debe resolver con resolver_anulacion_pedido");
prueba(/tipoRaw === "anular_pedido"/.test(fl), "Freelance: las solicitudes de anular pedido van por su función");
prueba(/comisionEst:/.test(fl) && /comEsEstimada/.test(fl), "Freelance: la comisión se muestra ESTIMADA mientras el pedido está por aprobar");

/* ── Freelance: anular con ficha clara + Cancelar (no anular por error) ── */
prueba(/Vas a anular ESTE pedido:/.test(fl), "Freelance: la hoja de anular encabeza «Vas a anular ESTE pedido»");
prueba(/Cancelar<\/button>[\s\S]{0,400}Sí, anular pedido/.test(fl), "Freelance: «Cancelar» va junto al botón rojo «Sí, anular pedido»");
prueba(/const ok = motivo\.trim\(\)\.length>2/.test(fl), "Freelance: el motivo sigue siendo obligatorio para anular");

/* ── Freelance: ver anulados + REVIVIR (revivir_pedido, ya aplicada) ── */
prueba(/async function revivirPedidoEnBase\(/.test(fl), "Freelance: debe existir revivirPedidoEnBase");
prueba(/rpc\("revivir_pedido"/.test(fl), "Freelance: revivir debe llamar a la RPC revivir_pedido");
prueba(/p_op_id:opId/.test(fl) && /"rev-"\+pedId\+"-"\+Date\.now\(\)/.test(fl), "Freelance: revivir usa un op_id idempotente (8+)");
prueba(/const \[vistaAnulados,setVistaAnulados\]=useState\(false\)/.test(fl), "Freelance: hay una sub-vista de Anulados");
prueba(/const anulados = pedidos\.filter\(p=>p\.estado==="Anulado"\)/.test(fl), "Freelance: los anulados salen de los pedidos con estado Anulado");
prueba(/Ver anulados \(\{nAnulados\}\)/.test(fl), "Freelance: hay un enlace «Ver anulados (n)»");
prueba(/function RevivirPedidoSheet\(/.test(fl) && /Volverá a su estado anterior/.test(fl), "Freelance: revivir pide confirmación y avisa que vuelve a su estado anterior");
prueba(/♻ Revivir pedido/.test(fl), "Freelance: cada anulado tiene botón «Revivir pedido»");
prueba(/if\(!r\.ok\)\{ if\(toast\) toast\(r\.motivo[\s\S]{0,120}Pedido revivido/.test(fl), "Freelance: revivir no pinta éxito si la base devuelve error");

if (mal) { console.error(`Resultado ANULACIÓN-PEDIDO: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado ANULACIÓN-PEDIDO: ${bien} ✓ · 0 ✗`);
