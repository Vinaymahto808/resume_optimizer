/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// AdSense requires /ads.txt to list the publisher id. Generate it from VITE_ADSENSE_ID
// (ca-pub-123… → pub-123…) so it can never drift from the id the ads use.
function adsTxt(env) {
  const pub = /^ca-(pub-\d{10,20})$/.exec(env.VITE_ADSENSE_ID || '')?.[1]
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : null
  return {
    name: 'ads-txt',
    configureServer(server) {
      server.middlewares.use('/ads.txt', (req, res, next) => {
        if (!body) return next()
        res.setHeader('Content-Type', 'text/plain')
        res.end(body)
      })
    },
    generateBundle() {
      if (body) this.emitFile({ type: 'asset', fileName: 'ads.txt', source: body })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [tailwindcss(), react(), adsTxt(env)],
    server: {
      // Dev only: forward API calls to the FastAPI backend (production uses VITE_API_URL or the same origin).
      proxy: {
        '/api': { target: process.env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000', changeOrigin: true },
      },
    },
  }
})
