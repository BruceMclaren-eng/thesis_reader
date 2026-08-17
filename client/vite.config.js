import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "論文リーダー",
        short_name: "論文リーダー",
        description: "選択範囲の即時翻訳と読了管理ができる論文リーダー",
        start_url: "/",
        display: "standalone",
        background_color: "#f3f0e6",
        theme_color: "#214b3c",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/papers\/[^/]+\/file$/,
            handler: "CacheFirst",
            options: {
              cacheName: "paper-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/api\/papers(\/.*)?$/,
            handler: "NetworkFirst",
            options: { cacheName: "paper-api", networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
