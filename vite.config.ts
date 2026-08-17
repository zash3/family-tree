import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Bakes the build's hashed asset names into `public/sw.js`.
 *
 * Without this the worker only precaches the HTML shell, and since the very
 * first page load is not yet controlled by the worker, its fetch handler never
 * sees the JS/CSS — the app would only survive going offline from the second
 * visit onwards.
 */
function precacheServiceWorker(): Plugin {
  let assets: string[] = []
  return {
    name: 'precache-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      assets = Object.keys(bundle).map((name) => `./${name}`)
    },
    closeBundle() {
      const swPath = join('dist', 'sw.js')
      const urls = ['./', './manifest.webmanifest', './apple-touch-icon.png', ...assets]
      const version = createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 8)
      const source = readFileSync(swPath, 'utf8')
        .replace(/\/\* __PRECACHE__ \*\/ \[[^\]]*\]/, JSON.stringify(urls))
        .replace(/\/\* __VERSION__ \*\/ '[^']*'/, JSON.stringify(version))
      writeFileSync(swPath, source)
      this.info?.(`precached ${urls.length} urls into sw.js (cache family-tree-${version})`)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), precacheServiceWorker()],
  // Listen on the LAN so a phone on the same Wi-Fi can open the app. The
  // allowedHosts entry lets a Tailscale HTTPS proxy (*.ts.net) through Vite's
  // host check — HTTPS is what makes iOS register the service worker.
  server: { host: true, allowedHosts: ['.ts.net'] },
  preview: { host: true, allowedHosts: ['.ts.net'] },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
