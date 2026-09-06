import type { CapacitorConfig } from "@capacitor/cli";

// Wano is a server-rendered Next.js app (server actions, cookies, live DB) —
// there's no static export to bundle, so the native shell loads the live
// production site directly, same as installing the PWA, but as a real
// app-store app. `www/` only exists because Capacitor requires a local
// webDir even when `server.url` overrides it at runtime.
const config: CapacitorConfig = {
  appId: "com.panerasolutions.wano",
  appName: "Wano",
  webDir: "www",
  server: {
    url: "https://panerasolutions.com",
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
};

export default config;
