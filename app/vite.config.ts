import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { inspectAttr } from 'kimi-plugin-inspect-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/CineLume/' : '/',
  plugins: [
    ...(command === 'serve' ? [inspectAttr()] : []),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-maskable.svg', 'robots.txt', 'sitemap.xml', 'humans.txt'],
      manifest: {
        // Manifest enrichi pour le SEO PWA + l'experience d'install.
        // 'name' long pour l'install prompt, 'short_name' court pour
        // l'icone home screen.
        name: 'CineLume — Sorties cinéma & streaming, gratuit sans pub',
        short_name: 'CineLume',
        description: 'Application web gratuite pour suivre les sorties cinéma et streaming, semaine par semaine. Sans pub, sans abonnement, sans inscription. Favoris, listes, notifications.',
        theme_color: '#050508',
        background_color: '#050508',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait',
        scope: '/CineLume/',
        start_url: '/CineLume/?utm_source=pwa',
        id: '/CineLume/',
        lang: 'fr',
        dir: 'ltr',
        categories: ['entertainment', 'lifestyle', 'utilities'],
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
        // Shortcuts : raccourcis longue-presse sur l'icone home-screen.
        // Permettent l'acces direct aux fonctions cles depuis l'OS.
        shortcuts: [
          {
            name: 'Mes favoris',
            short_name: 'Favoris',
            description: 'Voir mes films favoris',
            url: '/CineLume/?utm_source=pwa_shortcut_favorites',
          },
          {
            name: 'Pioche un film',
            short_name: 'Pioche',
            description: 'Tirer un film au hasard dans mes listes',
            url: '/CineLume/?utm_source=pwa_shortcut_picker',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
        // skipWaiting + clientsClaim : la nouvelle version du SW s'active
        // immediatement et prend le controle des pages ouvertes. Sans ca, les
        // utilisateurs restaient bloques sur l'ancien bundle JS tant qu'ils
        // n'avaient pas ferme tous les onglets.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/t\/p\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.themoviedb\.org\/3\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tmdb-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
