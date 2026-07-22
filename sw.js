/* ═══════════════════════════════════════════════════════════════════
   FREELANCE · sw.js — Trabajador de avisos + modo offline
   Qué hace:
   · Muestra avisos en la bandeja del teléfono, incluso con la app cerrada.
   · Guarda las pantallas para que la app ABRA SIN INTERNET en el campo.
   Requisito: la app debe estar publicada con HTTPS (GitHub Pages).

   REGLA DE ORO (aprendida en campo, 12 jul 2026):
   NUNCA dejar al usuario sin app. Si la red falla, responde mal o va lenta,
   se sirve SIEMPRE la copia guardada anterior. Un vendedor sin app en la
   mitad del campo es un problema real.
   ═══════════════════════════════════════════════════════════════════ */

const CACHE = "freelance-v21";
const PIEZAS = [
  "./", "./index.html",
  "./Comisionista.html", "./socio-comercial.html", "./transportista-app.html",
  "./freelance-completo.html", "./proveedor-freelance.html",
];

/* ── Instalación: guarda las pantallas.
   OJO: NO se llama skipWaiting() aquí. El service worker nuevo espera en
   segundo plano hasta que el usuario toque "Actualizar" en la app. Si tomara
   el control solo, recargaría la pantalla a mitad de un pedido. ── */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      /* addAll falla entero si una pieza falla; se guardan una por una para que
         una sola pieza rota no deje la app sin caché. */
      Promise.all(PIEZAS.map((p) => c.add(p).catch(() => {})))
    )
  );
});

/* ── Activación: limpia cachés viejos y toma el control ── */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((lista) => Promise.all(lista.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── Mensajes desde la app ── */
self.addEventListener("message", (e) => {
  const d = e.data || {};
  /* el botón "Actualizar" pide que este service worker nuevo tome el control ya */
  if (d.tipo === "activar-ya") { self.skipWaiting(); return; }
  if (d.tipo !== "aviso") return;
  self.registration.showNotification(d.titulo || "FREELANCE", {
    body: d.detalle || "",
    tag: d.tag || "freelance",
    badge: d.badge,
    icon: d.icon,
    data: { destino: d.destino || "" },
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

/* ── Red primero, copia guardada como red de seguridad ──
   Diferencia clave con la versión anterior: una respuesta con error (404, 500,
   o un despliegue a medio publicar) NO cuenta como buena. Antes se guardaba
   igual y se servía después: así es como la app se quedó sin abrir. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   /* Supabase y demás van directo a internet */

  e.respondWith((async () => {
    const guardada = await caches.match(e.request, { ignoreSearch: true });
    try {
      /* Si en 4 s no responde, servimos lo guardado: la app nunca se queda cargando. */
      const conLimite = new Promise((_, rechaza) =>
        setTimeout(() => rechaza(new Error("lenta")), 4000));
      const resp = await Promise.race([fetch(e.request), conLimite]);

      /* Solo se guarda y se sirve si la respuesta es BUENA. */
      if (resp && resp.ok) {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(() => {});
        return resp;
      }
      /* Respondió mal: mejor la copia anterior que una pantalla rota. */
      if (guardada) return guardada;
      return resp;
    } catch (err) {
      if (guardada) return guardada;
      /* Navegación sin copia propia: al menos abrir la portada. */
      if (e.request.mode === "navigate") {
        const inicio = await caches.match("./index.html");
        if (inicio) return inicio;
      }
      return fetch(e.request);
    }
  })());
});
