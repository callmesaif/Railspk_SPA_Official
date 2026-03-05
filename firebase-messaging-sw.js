// Scripts import karein
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

// Firebase initialize karein (Same config jo index.html mein hai)
firebase.initializeApp({
    apiKey: "AIzaSyCfoXeQk-6ubcJZz3ES7c6yE2IWSFp2z9A",
    authDomain: "railspk-official-1de54.firebaseapp.com",
    projectId: "railspk-official-1de54",
    storageBucket: "railspk-official-1de54.firebasestorage.app",
    messagingSenderId: "282037027182",
    appId: "1:282037027182:web:6b4f8bb420eb410374c17f"
});

const messaging = firebase.messaging();

// Background mein notification handle karne ke liye
messaging.onBackgroundMessage((payload) => {
  console.log('Background Message received: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/images/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'railspk-v1';
const ASSETS_TO_CACHE = [
  '/', 
  '/index.html',
  '/images/favicon.ico' // Sirf core assets cache karein
];

// Service Worker Install - Files ko cache mein save karna
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Fetch Event - Offline hone par cache se file uthana
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});