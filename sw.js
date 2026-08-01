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

const CACHE = "freelance-v173";
const PIEZAS = [
  "./", "./index.html",
  "./Comisionista.html", "./socio-comercial.html", "./transportista-app.html",
  "./freelance-completo.html", "./proveedor-freelance.html",
];

/* ── LAS LIBRERIAS · sin esto la app NO abre sin internet ────────────────
   MEDIDO el 01/08/2026: se guardaban las pantallas pero NO las librerias que
   esas pantallas cargan de un CDN. Sin señal el HTML salia de la cache, los
   cuatro archivos de abajo fallaban, y el resultado era PANTALLA EN BLANCO.
   Comprobado: 0 hijos dentro de <div id="root">.
   O sea que el modo offline no existia, aunque el comentario de arriba de
   este archivo llevaba semanas prometiendolo. Una promesa que nadie habia
   puesto a prueba.
   Van aparte de PIEZAS porque son de otro dominio y conviene que una que
   falle no arrastre a las demas. */
const LIBRERIAS = [
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.6/babel.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js",
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
      Promise.all(PIEZAS.concat(LIBRERIAS).map((p) => c.add(p).catch(() => {})))
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

  /* ── LAS LIBRERIAS DE OTRO DOMINIO · primero la copia guardada ─────────
     Aqui estaba la otra mitad del fallo: se salia con `return` para TODO lo
     que no fuera de este dominio, asi que aunque las librerias estuvieran
     guardadas, el navegador iba a internet a buscarlas y sin señal fallaba.
     Guardarlas sin servirlas no sirve de nada.

     Ojo con la distincion: el ARCHIVO de supabase-js (jsdelivr) si se guarda;
     las LLAMADAS a la base (*.supabase.co) NO se tocan nunca. Cachear una
     respuesta de la base seria enseñarle al chofer datos viejos como si
     fueran de ahora, que es peor que no enseñarle nada. */
  if (url.origin !== location.origin) {
    const esLibreria = LIBRERIAS.some((l) => l === e.request.url);
    if (!esLibreria) return;                    /* la base y demas van directo a internet */
    e.respondWith((async () => {
      const guardada = await caches.match(e.request, { ignoreSearch: true });
      if (guardada) return guardada;            /* copia primero: no cambian nunca */
      try {
        const resp = await fetch(e.request);
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(() => {});
        }
        return resp;
      } catch (err) {
        return new Response("", { status: 504, statusText: "sin conexion" });
      }
    })());
    return;
  }

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
