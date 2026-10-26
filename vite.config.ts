import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  build: { chunkSizeWarningLimit: 900 },
  // The video project lives alongside; its files never affect the app.
  server: { watch: { ignored: ["**/video/**", "**/docs/**"] } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "healthkey-wordmark-ink.png", "healthkey-wordmark-white.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // The page itself comes from the network first, so a refresh always shows the latest version.
        // The saved copy is only for when there's no connection.
        navigateFallback: null,
        directoryIndex: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "pages", networkTimeoutSeconds: 4, precacheFallback: { fallbackURL: "index.html" } },
          },
        ],
        // Japanese font files load by character range on demand; precaching all of them would be megabytes.
        globIgnores: ["**/noto-sans-jp*"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: "DriverScore",
        short_name: "DriverScore",
        description: "Driving assessment with your doctor.",
        theme_color: "#1C2229",
        background_color: "#F5F6F4",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
