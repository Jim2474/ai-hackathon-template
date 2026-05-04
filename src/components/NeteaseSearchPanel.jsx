import { useEffect, useRef, useState } from 'react'
import {
  checkQrLogin,
  clearNeteaseCookie,
  createQrLogin,
  getLyrics,
  getLoginStatus,
  getPlaylistDetail,
  getSongDetail,
  getSongUrl,
  saveNeteaseCookie,
  searchSongs
} from '../services/neteaseApi'

function formatDuration(milliseconds) {
  if (!milliseconds) return '--:--'
  const seconds = Math.floor(milliseconds / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function compactUrl(url) {
  if (!url) return ''
  return url.length > 46 ? `${url.slice(0, 34)}...${url.slice(-10)}` : url
}

function NeteaseSearchPanel() {
  const [keyword, setKeyword] = useState('周杰伦')
  const [playlistId, setPlaylistId] = useState('')
  const [songs, setSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [songDetail, setSongDetail] = useState(null)
  const [lyrics, setLyrics] = useState(null)
  const [songUrl, setSongUrl] = useState(null)
  const [playlist, setPlaylist] = useState(null)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('Docker API 默认地址：http://localhost:3000')
  const [actionStatus, setActionStatus] = useState('')
  const [playingSongId, setPlayingSongId] = useState(null)
  const [loginStatus, setLoginStatus] = useState('checking')
  const [loginProfile, setLoginProfile] = useState(null)
  const [qrLogin, setQrLogin] = useState(null)
  const [qrMessage, setQrMessage] = useState('')
  const [manualCookie, setManualCookie] = useState('')
  const previewAudioRef = useRef(null)
  const qrTimerRef = useRef(null)

  useEffect(() => {
    refreshLoginStatus()

    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
        previewAudioRef.current.src = ''
        previewAudioRef.current = null
      }
      if (qrTimerRef.current) {
        clearInterval(qrTimerRef.current)
      }
    }
  }, [])

  const refreshLoginStatus = async () => {
    setLoginStatus('checking')
    try {
      const result = await getLoginStatus()
      setLoginProfile(result.profile)
      setLoginStatus(result.loggedIn ? 'logged_in' : 'logged_out')
    } catch {
      setLoginProfile(null)
      setLoginStatus('logged_out')
    }
  }

  const handleCreateQrLogin = async () => {
    setQrMessage('正在生成登录二维码...')
    setQrLogin(null)

    if (qrTimerRef.current) {
      clearInterval(qrTimerRef.current)
    }

    try {
      const nextQrLogin = await createQrLogin()
      setQrLogin(nextQrLogin)
      setQrMessage('请用网易云音乐 App 扫码，并在手机上确认登录。')

      qrTimerRef.current = setInterval(async () => {
        try {
          const result = await checkQrLogin(nextQrLogin.key)

          if (result.code === 800) {
            clearInterval(qrTimerRef.current)
            qrTimerRef.current = null
            setQrMessage('二维码已过期，请重新生成。')
          } else if (result.code === 801) {
            setQrMessage('等待扫码...')
          } else if (result.code === 802) {
            setQrMessage('已扫码，请在手机上确认登录。')
          } else if (result.code === 803) {
            clearInterval(qrTimerRef.current)
            qrTimerRef.current = null
            setQrMessage('登录成功，后续播放 URL 会带上你的会员登录态。')
            setQrLogin(null)
            refreshLoginStatus()
          } else {
            setQrMessage(result.message || '正在等待登录确认...')
          }
        } catch (error) {
          setQrMessage(error.message || '检查扫码状态失败。')
        }
      }, 2500)
    } catch (error) {
      setQrMessage(error.message || '生成二维码失败。')
    }
  }

  const handleLogout = () => {
    clearNeteaseCookie()
    setLoginStatus('logged_out')
    setLoginProfile(null)
    setQrLogin(null)
    setQrMessage('已清除本地登录态。')
  }

  const handleManualCookieLogin = async (event) => {
    event.preventDefault()
    const cleanedCookie = manualCookie.trim()
    if (!cleanedCookie) return

    try {
      saveNeteaseCookie(cleanedCookie)
      setQrMessage('已保存 Cookie，正在验证登录状态...')
      setManualCookie('')
      await refreshLoginStatus()
    } catch {
      setQrMessage('Cookie 保存失败，请确认浏览器允许 localStorage。')
    }
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    const cleanedKeyword = keyword.trim()
    if (!cleanedKeyword || status === 'loading') return

    setStatus('loading')
    setMessage('正在搜索网易云音乐...')
    setSongs([])
    setSelectedSong(null)
    setSongDetail(null)
    setLyrics(null)
    setSongUrl(null)
    setActionStatus('')
    setPlayingSongId(null)

    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.src = ''
      previewAudioRef.current = null
    }

    try {
      const results = await searchSongs(cleanedKeyword, { limit: 8 })
      setSongs(results)
      if (results.length === 0) {
        setStatus('empty')
        setMessage('没有搜到歌曲，可以换一个关键词试试。')
      } else {
        setStatus('success')
        setMessage(`搜到 ${results.length} 首歌。这里只做 API 验证，暂不接入播放器。`)
      }
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '网易云 API 请求失败，请检查 Docker 服务是否启动。')
    }
  }

  const runSongAction = async (song, action) => {
    setSelectedSong(song)
    setActionStatus('正在请求网易云接口...')

    try {
      if (action === 'detail') {
        const details = await getSongDetail(song.id)
        setSongDetail(details[0] || null)
        setActionStatus(details.length > 0 ? '歌曲详情已返回。' : '没有拿到歌曲详情。')
      }

      if (action === 'lyric') {
        const nextLyrics = await getLyrics(song.id)
        setLyrics(nextLyrics)
        setActionStatus(nextLyrics.hasLyric ? '歌词已返回。' : nextLyrics.reason)
      }

      if (action === 'url') {
        const nextUrl = await getSongUrl(song.id)
        setSongUrl(nextUrl)
        setActionStatus(nextUrl.playable ? '播放 URL 已返回。' : nextUrl.reason)
      }
    } catch (error) {
      setActionStatus(error.message || '接口请求失败。')
    }
  }

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.src = ''
      previewAudioRef.current = null
    }
    setPlayingSongId(null)
    setActionStatus('已停止试听。')
  }

  const playPreview = async (song) => {
    if (playingSongId === song.id) {
      stopPreview()
      return
    }

    setSelectedSong(song)
    setActionStatus('正在获取播放 URL...')

    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.src = ''
      previewAudioRef.current = null
    }

    try {
      const nextUrl = await getSongUrl(song.id)
      setSongUrl(nextUrl)

      if (!nextUrl.playable) {
        setPlayingSongId(null)
        setActionStatus(nextUrl.reason)
        return
      }

      const audio = new Audio(nextUrl.url)
      previewAudioRef.current = audio
      audio.onended = () => {
        setPlayingSongId(null)
        setActionStatus('试听结束。')
      }
      audio.onerror = () => {
        setPlayingSongId(null)
        setActionStatus('浏览器播放失败，可能是播放地址过期、跨域或版权限制。')
      }

      await audio.play()
      setPlayingSongId(song.id)
      setActionStatus('正在试听网易云返回的播放地址。部分歌曲可能只是 45 秒试听片段。')
    } catch (error) {
      setPlayingSongId(null)
      setActionStatus(error.message || '试听失败。')
    }
  }

  const handlePlaylistSearch = async (event) => {
    event.preventDefault()
    const cleanedId = playlistId.trim()
    if (!cleanedId) return

    setPlaylist(null)
    setActionStatus('正在获取歌单详情...')

    try {
      const result = await getPlaylistDetail(cleanedId)
      setPlaylist(result)
      setActionStatus(result.tracks.length > 0
        ? `歌单详情已返回，当前展示前 ${Math.min(result.tracks.length, 5)} 首。`
        : '歌单已返回，但未登录时 tracks 可能不完整，可先查看 trackIds。')
    } catch (error) {
      setActionStatus(error.message || '歌单详情请求失败。')
    }
  }

  const statusColor = {
    idle: '#6B7280',
    loading: '#7C5CFF',
    success: '#047857',
    empty: '#92400E',
    error: '#B91C1C'
  }[status]

  return (
    <section
      className="rounded-2xl p-3"
      style={{
        background: 'rgba(255,255,255,0.82)',
        border: '1px solid rgba(17,24,39,0.06)',
        boxShadow: '0 8px 22px rgba(17,24,39,0.06)'
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold" style={{ color: '#111217' }}>
            网易云 API 验证
          </p>
          <p className="truncate text-[10px]" style={{ color: statusColor }}>
            {message}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-1 text-[10px] font-medium"
          style={{ background: 'rgba(17,24,39,0.05)', color: '#737782' }}
        >
          Netease
        </span>
      </div>

      <div
        className="mb-2 rounded-xl px-3 py-2"
        style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.05)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold" style={{ color: '#111217' }}>
              {loginStatus === 'logged_in' ? `已登录：${loginProfile?.nickname || '网易云会员账号'}` : '未登录网易云'}
            </p>
            <p className="truncate text-[10px]" style={{ color: '#737782' }}>
              登录后会用你的会员权限请求播放 URL，但仍受版权和账号权限限制。
            </p>
          </div>
          {loginStatus === 'logged_in' ? (
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: 'rgba(17,24,39,0.08)', color: '#111217' }}
            >
              退出
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateQrLogin}
              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ background: '#C20C0C' }}
            >
              扫码登录
            </button>
          )}
        </div>

        {(qrLogin || qrMessage) && (
          <div className="mt-2 flex gap-2">
            {qrLogin?.qrImage && (
              <img
                src={qrLogin.qrImage}
                alt="网易云二维码登录"
                className="h-20 w-20 shrink-0 rounded-lg bg-white p-1"
              />
            )}
            <p className="text-[10px] leading-relaxed" style={{ color: '#92400E' }}>
              {qrMessage}
            </p>
          </div>
        )}

        {loginStatus !== 'logged_in' && (
          <form onSubmit={handleManualCookieLogin} className="mt-2 flex gap-2">
            <input
              type="password"
              value={manualCookie}
              onChange={(event) => setManualCookie(event.target.value)}
              placeholder="扫码被拦截时，可直接粘贴 MUSIC_U 值"
              className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none"
              style={{ background: '#FFF7ED', border: '1px solid rgba(251,146,60,0.22)', color: '#1F2937' }}
            />
            <button
              type="submit"
              disabled={!manualCookie.trim()}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-45"
              style={{ background: '#111217', color: '#FFFFFF' }}
            >
              导入
            </button>
          </form>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="输入关键词，比如 周杰伦"
          className="min-w-0 flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1F2937' }}
        />
        <button
          type="submit"
          disabled={!keyword.trim() || status === 'loading'}
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-45"
          style={{ background: '#C20C0C' }}
        >
          {status === 'loading' ? '搜索中' : '搜索网易云'}
        </button>
      </form>

      {songs.length > 0 && (
        <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
          {songs.map(song => (
            <div
              key={song.id}
              className="rounded-xl px-3 py-2"
              style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.05)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs font-semibold" style={{ color: '#111217' }}>
                  {song.name}
                </p>
                <span className="shrink-0 text-[10px] font-mono" style={{ color: '#9CA3AF' }}>
                  {song.id}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px]" style={{ color: '#737782' }}>
                {song.artistsText} · {song.albumName}
              </p>
              <div className="mt-2 flex gap-1.5">
                {[
                  { label: '详情', action: 'detail' },
                  { label: '歌词', action: 'lyric' },
                  { label: '查URL', action: 'url' }
                ].map(item => (
                  <button
                    key={item.action}
                    type="button"
                    onClick={() => runSongAction(song, item.action)}
                    className="rounded-full px-2 py-1 text-[10px] font-medium"
                    style={{
                      background: selectedSong?.id === song.id ? 'rgba(194,12,12,0.1)' : 'rgba(17,24,39,0.05)',
                      color: selectedSong?.id === song.id ? '#C20C0C' : '#6B7280'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => playPreview(song)}
                  className="rounded-full px-2 py-1 text-[10px] font-semibold"
                  style={{
                    background: playingSongId === song.id ? '#111217' : '#C20C0C',
                    color: '#FFFFFF'
                  }}
                >
                  {playingSongId === song.id ? '停止' : '试听'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(selectedSong || actionStatus) && (
        <div
          className="mt-2 rounded-xl px-3 py-2 text-[11px]"
          style={{ background: '#FFF7ED', border: '1px solid rgba(251,146,60,0.2)', color: '#7C2D12' }}
        >
          {selectedSong && (
            <p className="font-semibold" style={{ color: '#111217' }}>
              当前歌曲：{selectedSong.name}
            </p>
          )}
          {actionStatus && <p className="mt-0.5">{actionStatus}</p>}

          {songDetail && selectedSong?.id === songDetail.id && (
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]" style={{ color: '#6B7280' }}>
              <span>时长：{formatDuration(songDetail.duration)}</span>
              <span>专辑 ID：{songDetail.albumId || '-'}</span>
              <span>费用标记：{songDetail.fee ?? '-'}</span>
              <span>版权状态：{songDetail.status ?? '-'}</span>
            </div>
          )}

          {songUrl && String(selectedSong?.id) === String(songUrl.id) && (
            <div className="mt-2 rounded-lg bg-white px-2 py-1.5">
              <p style={{ color: songUrl.playable ? '#047857' : '#B91C1C' }}>
                {songUrl.playable ? '可播放' : '不可播放'}：{songUrl.reason || compactUrl(songUrl.url)}
              </p>
            </div>
          )}

          {lyrics && String(selectedSong?.id) === String(lyrics.id) && (
            <pre
              className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white px-2 py-1.5 font-sans"
              style={{ color: '#4B5563' }}
            >
              {lyrics.lyric || lyrics.reason}
            </pre>
          )}
        </div>
      )}

      <form onSubmit={handlePlaylistSearch} className="mt-3 flex gap-2">
        <input
          type="text"
          value={playlistId}
          onChange={(event) => setPlaylistId(event.target.value)}
          placeholder="输入歌单 ID 验证歌单详情"
          className="min-w-0 flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1F2937' }}
        />
        <button
          type="submit"
          disabled={!playlistId.trim()}
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold"
          style={{ background: 'rgba(17,24,39,0.08)', color: '#111217' }}
        >
          查歌单
        </button>
      </form>

      {playlist && (
        <div
          className="mt-2 rounded-xl px-3 py-2"
          style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.05)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-semibold" style={{ color: '#111217' }}>
              {playlist.name}
            </p>
            <span className="shrink-0 text-[10px]" style={{ color: '#9CA3AF' }}>
              {playlist.trackCount} 首
            </span>
          </div>
          <div className="mt-1 space-y-1">
            {playlist.tracks.slice(0, 5).map(track => (
              <p key={track.id} className="truncate text-[11px]" style={{ color: '#737782' }}>
                {track.name} · {track.artistsText}
              </p>
            ))}
            {playlist.tracks.length === 0 && playlist.trackIds.length > 0 && (
              <p className="text-[11px]" style={{ color: '#92400E' }}>
                未登录时可能只返回 trackIds：{playlist.trackIds.slice(0, 8).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default NeteaseSearchPanel
