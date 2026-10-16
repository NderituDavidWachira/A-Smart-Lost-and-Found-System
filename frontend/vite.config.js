import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "St. Paul's University Lost & Found",
        short_name: "Lost & Found",
        description: "Report, search and claim lost and found items on campus.",
        theme_color: "#6b1f2a",
        background_color: "#3a0f16",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // Never cache API calls or uploaded images, so data is always live.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === "api.ryantech.co.ke",
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});