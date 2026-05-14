import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const projectCacheDir = path.join(projectRoot, 'node_modules', '.vite-claudio')

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = ''
    req.on('data', chunk => {
      rawBody += chunk
    })
    req.on('end', () => resolve(rawBody))
    req.on('error', reject)
  })
}

function normalizeProxyBaseUrl(value) {
  const raw = String(value || '').trim().replace(/[`'"]/g, '')
  const baseUrl = raw || 'http://127.0.0.1:58090'
  const parsed = new URL(baseUrl)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('XiaoMusic base URL must start with http:// or https://')
  }
  return parsed.toString()
}

function xiaoMusicProxy(env) {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/xiaomusic', async (req, res) => {
      try {
        const baseUrl = normalizeProxyBaseUrl(
          req.headers['x-xiaomusic-base-url'] ||
          env.XIAOMUSIC_BASE_URL ||
          env.VITE_XIAOMUSIC_BASE_URL
        )
        const targetUrl = new URL(req.url || '/', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
        const method = req.method || 'GET'
        const username = String(req.headers['x-xiaomusic-username'] || env.XIAOMUSIC_HTTPAUTH_USERNAME || '').trim()
        const password = String(req.headers['x-xiaomusic-password'] || env.XIAOMUSIC_HTTPAUTH_PASSWORD || '')
        const headers = {
          'Content-Type': req.headers['content-type'] || 'application/json'
        }

        if (username || password) {
          headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        }

        const response = await fetch(targetUrl, {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : await readRequestBody(req)
        })
        const text = await response.text()

        res.statusCode = response.status
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
        res.end(text)
      } catch (error) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message || 'XiaoMusic proxy failed' }))
      }
    })
  }

  return {
    name: 'xiaomusic-proxy',
    configureServer(server) {
      attachMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares)
    }
  }
}

function minimaxTtsProxy(env) {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/minimax/t2a_v2', async (req, res, next) => {
      if (req.method !== 'POST') {
        next()
        return
      }

      const apiKey = env.MINIMAX_TTS_API_KEY || env.VITE_MINIMAX_TTS_API_KEY || env.VITE_MINIMAX_API_KEY
      const baseUrl = (env.MINIMAX_TTS_BASE_URL || env.VITE_MINIMAX_TTS_BASE_URL || 'https://api.minimaxi.com/v1').trim().replace(/[`'"]/g, '')

      if (!apiKey) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'MiniMax TTS API key is not configured' }))
        return
      }

      readRequestBody(req).then(async (rawBody) => {
        try {
          const response = await fetch(`${baseUrl}/t2a_v2`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: rawBody
          })

          const text = await response.text()
          res.statusCode = response.status
          res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
          res.end(text)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message || 'MiniMax TTS proxy failed' }))
        }
      }).catch((error) => {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message || 'MiniMax TTS proxy failed' }))
      })
    })
  }

  return {
    name: 'minimax-tts-proxy',
    configureServer(server) {
      attachMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares)
    }
  }
}

function minimaxChatProxy(env) {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/minimax/chat', async (req, res, next) => {
      if (req.method !== 'POST') {
        next()
        return
      }

      const apiKey = env.VITE_MINIMAX_API_KEY || env.MINIMAX_API_KEY
      const baseUrl = (env.VITE_MINIMAX_BASE_URL || env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1').trim().replace(/[`'"]/g, '')

      if (!apiKey) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'MiniMax API key is not configured' }))
        return
      }

      readRequestBody(req).then(async (rawBody) => {
        try {
          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: rawBody
          })

          const text = await response.text()
          res.statusCode = response.status
          res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
          res.end(text)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message || 'MiniMax chat proxy failed' }))
        }
      }).catch((error) => {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message || 'MiniMax chat proxy failed' }))
      })
    })
  }

  return {
    name: 'minimax-chat-proxy',
    configureServer(server) {
      attachMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares)
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')

  return {
    root: projectRoot,
    cacheDir: projectCacheDir,
    optimizeDeps: {
      disabled: true,
      noDiscovery: true,
      include: []
    },
    plugins: [react(), xiaoMusicProxy(env), minimaxChatProxy(env), minimaxTtsProxy(env)],
  }
})
