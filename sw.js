/* ═══════════════════════════════════════════════════════════════════
   FREELANCE · sw.js — Trabajador de avisos (Nivel 2)
   Qué hace: permite que los avisos aparezcan en la PANTALLA DEL TELÉFONO
   (la bandeja de notificaciones), incluso con la app cerrada.
   Requisito: la app debe estar publicada con HTTPS (GitHub Pages).
   Cómo se instala: este archivo va junto a los HTML en el repositorio;
   la app lo registra sola al detectar HTTPS.
   ═══════════════════════════════════════════════════════════════════ */

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/* La app (abierta o en segundo plano) pide mostrar un aviso en la bandeja */
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.tipo !== "aviso") return;
  self.registration.showNotification(d.titulo || "FREELANCE", {
    body: d.detalle || "",
    tag: d.tag || "freelance",         // agrupa avisos del mismo tema
    badge: d.badge,                     // ícono pequeño (opcional)
    icon: d.icon,                       // ícono grande (opcional)
    data: { destino: d.destino || "" }, // a qué pantalla llevar al tocar
    renotify: !!d.renotify,
  });
});

/* Nivel 3 (futuro): avisos empujados desde Supabase con la app cerrada */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.titulo || "FREELANCE", {
    body: d.detalle || "Tienes tareas pendientes",
    tag: d.tag || "freelance-push",
    data: { destino: d.destino || "" },
  }));
});

/* Al tocar el aviso: abre (o enfoca) la app y navega a la pantalla del tema */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.destino) || "";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) { c.postMessage({ tipo: "ir", destino }); return c.focus(); }
      }
      return self.clients.openWindow("./" + (destino ? "#" + destino : ""));
    })
  );
});
