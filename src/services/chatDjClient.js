const NETEASE_COOKIE_STORAGE_KEY = 'moodwave_netease_cookie'

function getNeteaseCookie() {
  try {
    return window.localStorage.getItem(NETEASE_COOKIE_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function parseSseMessage(message) {
  let event = 'message'
  const dataLines = []

  message.split(/\r?\n/).forEach(line => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  })

  const rawData = dataLines.join('\n')
  if (!rawData) return { event, data: {} }

  try {
    return { event, data: JSON.parse(rawData) }
  } catch {
    return { event, data: { text: rawData } }
  }
}

export async function getChatDjState() {
  const response = await fetch('/api/state')
  if (!response.ok) {
    throw new Error(`Claudio backend failed: ${response.status}`)
  }
  return response.json()
}

export async function sendPlayerControl(action, value) {
  const response = await fetch('/api/player/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, value })
  })
  if (!response.ok) {
    throw new Error(`Player control failed: ${response.status}`)
  }
  return response.json()
}

export async function streamChatDjMessage(message, { signal, onEvent, ttsSettings } = {}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({
      message,
      neteaseCookie: getNeteaseCookie(),
      ttsSettings: ttsSettings || undefined
    }),
    signal
  })

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `Claudio chat failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split(/\n\n|\r\n\r\n/)
    buffer = parts.pop() || ''

    parts.forEach(part => {
      const trimmed = part.trim()
      if (!trimmed || trimmed.startsWith(':')) return
      onEvent?.(parseSseMessage(trimmed))
    })
  }

  const tail = buffer.trim()
  if (tail && !tail.startsWith(':')) {
    onEvent?.(parseSseMessage(tail))
  }
}
