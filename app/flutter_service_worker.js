'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {".last_build_id":"561997bf4d0ae2bf13049d74acd4be0e","assets/AssetManifest.bin":"1c1e0f04855c558f3c1ec408fe523338","assets/AssetManifest.bin.json":"52355124089e53613b54772945e72480","assets/AssetManifest.json":"ba5631a11e1c4e8282888417da9fd616","assets/FontManifest.json":"7b2a36307916a9721811788013e65289","assets/NOTICES":"76a3888a448ac947450a1b4684ef85d9","assets/assets/icons/app_icon.png":"c51ad1a7b2d6d3310adb9edbe0a0f109","assets/fonts/MaterialIcons-Regular.otf":"f1525e4005325080d8efc0a47fc5d1fb","assets/shaders/ink_sparkle.frag":"ecc85a2e95f5e9f53123dcaf8cb9b6ce","canvaskit/canvaskit.js":"140ccb7d34d0a55065fbd422b843add6","canvaskit/canvaskit.wasm":"07b9f5853202304d3b0749d9306573cc","canvaskit/chromium/canvaskit.js":"5e27aae346eee469027c80af0751d53d","canvaskit/chromium/canvaskit.wasm":"24c77e750a7fa6d474198905249ff506","favicon.png":"0439c6c888a6f02d353c245b123f6770","flutter.js":"888483df48293866f9f41d3d9274a779","flutter_bootstrap.js":"bb303fd76e46dfb790b24f7847ea7462","icons/Icon-192.png":"16e4e2edc46a77c7c16fa735b48e071f","icons/Icon-512.png":"6e7a9237832a5a010697159f98e0b7a0","icons/Icon-maskable-192.png":"16e4e2edc46a77c7c16fa735b48e071f","icons/Icon-maskable-512.png":"6e7a9237832a5a010697159f98e0b7a0","index.html":"e8dc5545c345b1ec3562ed80e264146b","main.dart.js":"773704390831fbf1d6c433e538c82299","manifest.json":"de7a011d4f36aa2ab77db499aa8eabf5","splash/img/dark-1x.png":"b0b06432237a9480a100d06a211083e4","splash/img/dark-2x.png":"092c4b92b3f58c24d816287461394371","splash/img/light-1x.png":"b0b06432237a9480a100d06a211083e4","splash/img/light-2x.png":"092c4b92b3f58c24d816287461394371","version.json":"867fa31c49c6f1ae9e9567d805cae8b4","/":"e8dc5545c345b1ec3562ed80e264146b"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});
self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
