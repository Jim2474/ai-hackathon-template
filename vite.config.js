import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function minimaxTtsProxy(env) {
  return {
    name: 'minimax-tts-proxy',
    configureServer(server) {
      server.middlewares.use('/api/minimax/t2a_v2', async (req, res, next) => {
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

        let rawBody = ''
        req.on('data', chunk => {
          rawBody += chunk
        })

        req.on('end', async () => {
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
        })
      })
    }
  }
}

function minimaxChatProxy(env) {
  return {
    name: 'minimax-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/minimax/chat', async (req, res, next) => {
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

        let rawBody = ''
        req.on('data', chunk => {
          rawBody += chunk
        })

        req.on('end', async () => {
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
        })
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), minimaxChatProxy(env), minimaxTtsProxy(env)],
  }
})
