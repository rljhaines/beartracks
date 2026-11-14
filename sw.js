/* BearTracks service worker: web push only (no caching, no fetch handler).
 * A push always shows a notification: iOS withdraws a site's push permission if pushes are received without one.
 * When the app is open and on screen the notice is quiet and goes away by itself; otherwise the icon gets a dot. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { b: e.data.text() }; } catch (y) {} }
  var title = d.t || 'BearTracks', body = d.b || '', gid = d.g || '';
  var tag = d.e ? 'ev-' + d.e : (gid ? 'gw-' + gid : 'bt'); // a finished card sent from two of your groups carries the same tag, so it shows once
  e.waitUntil((async function () {
    var wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    var seen = wins.some(function (c) { return c.visibilityState === 'visible'; });
    await self.registration.showNotification(title, { body: body, tag: tag, renotify: !d.e, silent: seen, data: { g: gid } });
    if (seen) {
      await new Promise(function (r) { setTimeout(r, 4000); });
      var list = await self.registration.getNotifications({ tag: tag });
      list.forEach(function (n) { n.close(); });
    } else if (self.navigator && self.navigator.setAppBadge) {
      try { await self.navigator.setAppBadge(555); } catch (x) {}
    }
  })());
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var gid = (e.notification.data && e.notification.data.g) || '';
  var url = self.registration.scope + (gid ? '?kind=groupwords&push=1&gw=' + encodeURIComponent(gid) : '');
  e.waitUntil((async function () {
    var wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i = 0; i < wins.length; i++) {
      if (wins[i].url.indexOf(self.registration.scope) === 0) { try { var w = await wins[i].focus(); (w || wins[i]).postMessage({ t: 'open', g: gid }); return; } catch (x) {} }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
