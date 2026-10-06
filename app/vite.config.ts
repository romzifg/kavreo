import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Keep browser requests on the frontend origin, including LAN/mobile access.
const apiProxy = { "/api": { target: "http://127.0.0.1:4000", changeOrigin: true } };

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: "prompt",
    injectRegister: null,
    includeAssets: ["favicon.svg", "icons/*.png"],
    manifest: {
      id: "/", name: "Kavreo — Creator Workspace", short_name: "Kavreo",
      description: "Dari ide, jadi karya. Susun script, ide, dan jadwal kontenmu.",
      lang: "id", start_url: "/", scope: "/", display: "standalone",
      background_color: "#f7f6fc", theme_color: "#6d5efc",
      icons: [
        { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      cleanupOutdatedCaches: true,
      navigateFallback: "index.html",
      navigateFallbackDenylist: [/^\/api(?:\/|$)/],
      // Only the static app shell is cached. Authenticated API data stays on the network.
      runtimeCaching: [{ urlPattern: ({ url, request }) => url.pathname.startsWith("/api/") || request.headers.has("Authorization"), handler: "NetworkOnly" }],
    },
  })],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5173, host: true, proxy: apiProxy },
  preview: { port: 4173, host: true, proxy: apiProxy },
});
