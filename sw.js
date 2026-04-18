// =============================================
// SERVICE WORKER - STBCOR PWA
// =============================================

const CACHE_NAME = 'stbcor-cache-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Archivos a cachear para funcionamiento offline
const urlsToCache = [
  '/',
  '/index.html',
  '/historia-completa.html',
  '/docentes.html',
  '/admisiones.html',
  '/contacto.html',
  '/login-intranet.html',
  '/offline.html',
  '/css/main.css',
  '/js/main.js',
  '/manifest.json',
  // Librerías externas (CDN)
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js'
];

// =============================================
// INSTALACIÓN DEL SERVICE WORKER
// =============================================
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando archivos esenciales...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Todos los recursos cacheados');
        return self.skipWaiting();
      })
  );
});

// =============================================
// ACTIVACIÓN DEL SERVICE WORKER
// =============================================
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activado');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Reclamando clientes');
      return self.clients.claim();
    })
  );
});

// =============================================
// INTERCEPTAR PETICIONES (ESTRATEGIA: CACHE FIRST)
// =============================================
self.addEventListener('fetch', (event) => {
  // No interceptar peticiones a EmailJS (API externa)
  if (event.request.url.includes('emailjs.com')) {
    return;
  }
  
  // No interceptar Google Maps
  if (event.request.url.includes('google.com/maps')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Devolver del cache si existe
        if (cachedResponse) {
          // Actualizar el cache en segundo plano (Stale-While-Revalidate)
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {});
          
          return cachedResponse;
        }
        
        // Si no está en cache, intentar de la red
        return fetch(event.request)
          .then((response) => {
            // Guardar en cache para futuras visitas
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            // Si es una página HTML, mostrar página offline
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            // Para otros recursos, podríamos devolver un placeholder
            return new Response('Recurso no disponible sin conexión');
          });
      })
  );
});

// =============================================
// NOTIFICACIONES PUSH (Opcional - para futuro)
// =============================================
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Seminario Teológico Bautista';
  const options = {
    body: data.body || 'Nueva actualización disponible',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/badge.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('📱 Service Worker STBCOR cargado correctamente');