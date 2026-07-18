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
  /* el botón "Actualizar" pide que este service worker nuevo tome el control ya */
  if (d.tipo === "activar-ya") { self.skipWaiting(); return; }
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

/* ═══════════ MODO OFFLINE · la app instalada abre SIN internet ═══════════
   Al instalar, el teléfono guarda las pantallas. En el campo sin señal, la app
   abre igual (con la cola 4.4 protegiendo lo que se registre). Al volver la señal,
   se actualiza sola desde internet (red primero, guardado como respaldo). */
const CACHE = "freelance-v2";
const PIEZAS = [
  "./", "./index.html",
  "./Comisionista.html", "./socio-comercial.html", "./transportista-app.html",
  "./freelance-completo.html", "./proveedor-freelance.html",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PIEZAS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((lista) =>
      Promise.all(lista.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   /* Supabase y demás siguen directo a internet */
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then((guardada) => guardada || caches.match("./index.html")))
  );
});
