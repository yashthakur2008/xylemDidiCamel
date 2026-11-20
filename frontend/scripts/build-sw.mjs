import { readdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const assets = readdirSync("dist/assets")
  .filter((x) => /\.(js|css|woff2)$/.test(x))
  .map((x) => "/assets/" + x);
const files = [
  "/",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
  ...assets,
];
const version = createHash("sha256")
  .update(readFileSync("dist/index.html"))
  .digest("hex")
  .slice(0, 12);
writeFileSync(
  "dist/sw.js",
  `const CACHE='leaklens-${version}';const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('leaklens-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const r=event.request,u=new URL(r.url);if(r.method!=='GET'||r.headers.has('authorization')||u.origin!==self.location.origin||u.pathname.startsWith('/api/')||u.pathname==='/health')return;
if(r.mode==='navigate'){event.respondWith(fetch(r).catch(()=>caches.match('/',{ignoreVary:true})));return;}
if(FILES.includes(u.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(u.pathname,{ignoreVary:true}))||fetch(r)));
});`,
);
