import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import { Readable } from 'node:stream'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const claudioTtsDir = path.join(projectRoot, '.codex-run', 'tts')

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

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function normalizePublicBaseUrl(value, req) {
  const fallback = `http://${req.headers.host || '127.0.0.1:5173'}`
  const raw = String(value || fallback).trim().replace(/[`'"]/g, '').replace(/\/+$/g, '')
  const parsed = new URL(raw)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Public base URL must start with http:// or https://')
  }
  return parsed.toString().replace(/\/+$/g, '')
}

function audioHexToBuffer(value) {
  const cleanHex = String(value || '').trim().replace(/^0x/i, '')
  if (!cleanHex || cleanHex.length % 2 !== 0 || /[^0-9a-f]/i.test(cleanHex)) {
    throw new Error('MiniMax TTS response has invalid audio hex')
  }
  return Buffer.from(cleanHex, 'hex')
}

async function cleanupOldTtsFiles() {
  try {
    const files = await fs.readdir(claudioTtsDir)
    const mp3Files = files.filter(file => file.endsWith('.mp3'))
    if (mp3Files.length <= 80) return

    const stats = await Promise.all(mp3Files.map(async file => ({
      file,
      stat: await fs.stat(path.join(claudioTtsDir, file))
    })))
    const oldFiles = stats
      .sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs)
      .slice(0, Math.max(0, mp3Files.length - 60))

    await Promise.all(oldFiles.map(item => fs.unlink(path.join(claudioTtsDir, item.file)).catch(() => {})))
  } catch {
    // TTS cache cleanup is best-effort.
  }
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

function minimaxXiaoDjAudioProxy(env) {
  const attachMiddleware = (middlewares) => {
    middlewares.use(async (req, res, next) => {
      const requestUrl = new URL(req.url || '/', 'http://localhost')

      if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/claudio-tts/')) {
        const fileName = path.basename(decodeURIComponent(requestUrl.pathname.replace('/api/claudio-tts/', '')))
        if (!fileName || !fileName.endsWith('.mp3')) {
          sendJson(res, 404, { error: 'TTS audio not found' })
          return
        }

        try {
          const filePath = path.join(claudioTtsDir, fileName)
          const audio = await fs.readFile(filePath)
          res.statusCode = 200
          res.setHeader('Content-Type', 'audio/mpeg')
          res.setHeader('Cache-Control', 'no-store')
          res.end(audio)
        } catch {
          sendJson(res, 404, { error: 'TTS audio not found' })
        }
        return
      }

      if (req.method !== 'POST' || requestUrl.pathname !== '/api/minimax/xiao-dj-audio') {
        next()
        return
      }

      const apiKey = env.MINIMAX_TTS_API_KEY || env.VITE_MINIMAX_TTS_API_KEY || env.VITE_MINIMAX_API_KEY
      const baseUrl = (env.MINIMAX_TTS_BASE_URL || env.VITE_MINIMAX_TTS_BASE_URL || 'https://api.minimaxi.com/v1').trim().replace(/[`'"]/g, '')

      if (!apiKey) {
        sendJson(res, 500, { error: 'MiniMax TTS API key is not configured' })
        return
      }

      try {
        const body = JSON.parse(await readRequestBody(req) || '{}')
        const text = String(body.text || '').trim()
        if (!text) {
          sendJson(res, 400, { error: 'TTS text is required' })
          return
        }

        const model = String(body.model || env.VITE_MINIMAX_TTS_MODEL || 'speech-2.8-turbo').trim()
        const voiceId = String(body.voiceId || env.VITE_MINIMAX_TTS_VOICE_ID || 'Chinese (Mandarin)_Wise_Women').trim()
        const speed = Math.min(2, Math.max(0.5, Number(body.speed || env.VITE_MINIMAX_TTS_SPEED || 1.04)))
        const volume = Math.min(10, Math.max(0.1, Number(body.volume || env.VITE_MINIMAX_TTS_VOLUME || 1)))
        const pitch = Math.min(12, Math.max(-12, Number(body.pitch ?? env.VITE_MINIMAX_TTS_PITCH ?? -1)))
        const emotion = String(body.emotion || env.VITE_MINIMAX_TTS_EMOTION || '').trim()

        const response = await fetch(`${baseUrl}/t2a_v2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            text,
            stream: false,
            output_format: 'hex',
            voice_setting: {
              voice_id: voiceId,
              speed,
              vol: volume,
              pitch,
              ...(emotion ? { emotion } : {})
            },
            audio_setting: {
              sample_rate: 32000,
              bitrate: 128000,
              format: 'mp3',
              channel: 1
            },
            subtitle_enable: false
          })
        })

        const responseText = await response.text()
        if (!response.ok) {
          sendJson(res, response.status, { error: responseText || response.statusText })
          return
        }

        const data = JSON.parse(responseText)
        const statusCode = data?.base_resp?.status_code
        if (statusCode !== undefined && statusCode !== 0) {
          sendJson(res, 502, { error: data?.base_resp?.status_msg || `MiniMax TTS error ${statusCode}` })
          return
        }

        const audioBuffer = audioHexToBuffer(data?.data?.audio)
        await fs.mkdir(claudioTtsDir, { recursive: true })
        const fileName = `dj-${Date.now()}-${randomUUID()}.mp3`
        await fs.writeFile(path.join(claudioTtsDir, fileName), audioBuffer)
        cleanupOldTtsFiles()

        const publicBaseUrl = normalizePublicBaseUrl(body.publicBaseUrl, req)
        const durationMs = Number(data?.extra_info?.audio_length || data?.data?.audio_length || 0)
        sendJson(res, 200, {
          url: `${publicBaseUrl}/api/claudio-tts/${encodeURIComponent(fileName)}`,
          bytes: audioBuffer.length,
          durationMs: Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0,
          chars: text.length,
          voiceId
        })
      } catch (error) {
        sendJson(res, 502, { error: error.message || 'MiniMax DJ audio proxy failed' })
      }
    })
  }

  return {
    name: 'minimax-xiao-dj-audio-proxy',
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

function chatDjBackendProxy(env) {
  const backendBaseUrl = (env.CLAUDIO_SERVER_URL || env.VITE_CLAUDIO_SERVER_URL || 'http://127.0.0.1:8080').trim().replace(/[`'"]/g, '').replace(/\/+$/, '')
  const proxiedPrefixes = ['/api/chat', '/api/state', '/api/now', '/api/player', '/api/tts', '/api/netease', '/api/sync-library']

  const attachMiddleware = (middlewares) => {
    middlewares.use(async (req, res, next) => {
      const requestUrl = new URL(req.url || '/', 'http://localhost')
      if (!proxiedPrefixes.some(prefix => requestUrl.pathname === prefix || requestUrl.pathname.startsWith(`${prefix}/`))) {
        next()
        return
      }

      try {
        const targetUrl = `${backendBaseUrl}${requestUrl.pathname}${requestUrl.search}`
        const method = req.method || 'GET'
        const headers = {
          'Content-Type': req.headers['content-type'] || 'application/json',
          Accept: req.headers.accept || '*/*'
        }

        const response = await fetch(targetUrl, {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : await readRequestBody(req),
          duplex: method === 'GET' || method === 'HEAD' ? undefined : 'half'
        })

        res.statusCode = response.status
        response.headers.forEach((value, key) => {
          if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
            res.setHeader(key, value)
          }
        })

        if (response.body) {
          Readable.fromWeb(response.body).pipe(res)
        } else {
          res.end()
        }
      } catch (error) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          error: error.message || 'Claudio backend is not available',
          hint: '请先运行 npm run server，保持 localhost:8080 后端开启。'
        }))
      }
    })
  }

  return {
    name: 'claudio-chat-dj-backend-proxy',
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
    plugins: [react(), chatDjBackendProxy(env), xiaoMusicProxy(env), minimaxChatProxy(env), minimaxTtsProxy(env), minimaxXiaoDjAudioProxy(env)],
    server: {
      host: '0.0.0.0',
    },
  }
})
