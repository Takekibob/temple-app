// カスタムサービスワーカー — next-pwa の swSrc として使用
// Workbox の precache manifest がここに注入される
// eslint-disable-next-line no-undef
self.__WB_MANIFEST;

// ==========================================
// プッシュ通知
// ==========================================
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "てらログ", body: event.data.text() };
  }

  const title = payload.title ?? "てらログ";
  const options = {
    body: payload.body ?? "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: { url: payload.url ?? "/app" },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ==========================================
// 通知クリック
// ==========================================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/app";

  event.waitUntil(
    // eslint-disable-next-line no-undef
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        // eslint-disable-next-line no-undef
        if (clients.openWindow) {
          // eslint-disable-next-line no-undef
          return clients.openWindow(targetUrl);
        }
      })
  );
});
