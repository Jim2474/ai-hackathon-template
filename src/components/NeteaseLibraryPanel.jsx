import { useEffect, useMemo, useState } from 'react'
import {
  getLikedSongs,
  getLoginStatus,
  getPlaylistDetail,
  getSongDetail,
  getSongUrl,
  getUserPlaylists,
  searchSongs,
} from '../services/neteaseApi'
import GlassPanel from './GlassPanel'

function formatCount(count) {
  if (!count) return '0'
  if (count > 10000) return `${(count / 10000).toFixed(1)} 万`
  return String(count)
}

function toTrack(song, audioUrl) {
  return {
    id: `netease-${song.id}`,
    neteaseId: song.id,
    title: song.name,
    artist: song.artistsText,
    album: song.albumName,
    duration: Math.round((song.duration || 0) / 1000),
    source: 'netease',
    sourceType: 'netease',
    audioUrl,
    coverUrl: song.coverUrl || song.raw?.album?.picUrl || song.raw?.al?.picUrl || '',
    raw: song.raw || song,
  }
}

export default function NeteaseLibraryPanel({ isOpen, onClose, onPlayTracks }) {
  const [profile, setProfile] = useState(null)
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [displaySongs, setDisplaySongs] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeTab, setActiveTab] = useState('playlists')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('打开你的网易云歌单，选一首直接接进 Claudio。')

  const isLoggedIn = Boolean(profile)
  const userId = profile?.userId

  const favoritePlaylist = useMemo(
    () => playlists.find(item => item.name?.includes('喜欢')) || null,
    [playlists]
  )

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    async function loadAccount() {
      setStatus('loading')
      setMessage('正在读取网易云账号...')

      try {
        const login = await getLoginStatus()
        if (cancelled) return

        if (!login.loggedIn || !login.profile) {
          setProfile(null)
          setPlaylists([])
          setStatus('empty')
          setMessage('还没有登录网易云。先在聊天区的登录卡片里扫码或导入 MUSIC_U。')
          return
        }

        setProfile(login.profile)
        const accountPlaylists = await getUserPlaylists(login.profile.userId, { limit: 30 })
        if (cancelled) return

        setPlaylists(accountPlaylists)
        setStatus('idle')
        setMessage(accountPlaylists.length > 0
          ? `已读取 ${accountPlaylists.length} 个歌单。`
          : '账号已登录，但暂时没有读到歌单。')
      } catch (error) {
        if (cancelled) return
        setStatus('error')
        setMessage(error.message || '网易云账号读取失败，请确认本地 API 正在运行。')
      }
    }

    loadAccount()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  if (!isOpen) return null

  const loadPlaylistSongs = async (playlist) => {
    setActiveTab('playlists')
    setSelectedPlaylist(playlist)
    setDisplaySongs([])
    setStatus('loading')
    setMessage(`正在读取「${playlist.name}」...`)

    try {
      const detail = await getPlaylistDetail(playlist.id)
      let songs = detail.tracks

      if (songs.length === 0 && detail.trackIds.length > 0) {
        songs = await getSongDetail(detail.trackIds.slice(0, 50))
      }

      setDisplaySongs(songs)
      setStatus(songs.length > 0 ? 'idle' : 'empty')
      setMessage(songs.length > 0
        ? `「${detail.name}」已载入 ${songs.length} 首，点击歌曲就能接进播放器。`
        : '这个歌单暂时没有返回歌曲详情。')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '歌单读取失败。')
    }
  }

  const loadLikedSongs = async () => {
    if (!userId) return

    setActiveTab('liked')
    setSelectedPlaylist(favoritePlaylist || { name: '收藏歌曲' })
    setDisplaySongs([])
    setStatus('loading')
    setMessage('正在读取你收藏的歌曲...')

    try {
      const songs = await getLikedSongs(userId, { limit: 50 })
      setDisplaySongs(songs)
      setStatus(songs.length > 0 ? 'idle' : 'empty')
      setMessage(songs.length > 0
        ? `已载入 ${songs.length} 首收藏歌曲。`
        : '没有读取到收藏歌曲，可以试试打开“我喜欢的音乐”歌单。')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '收藏歌曲读取失败。')
    }
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    const keyword = searchKeyword.trim()
    if (!keyword) return

    setActiveTab('search')
    setSelectedPlaylist({ name: `搜索：${keyword}` })
    setDisplaySongs([])
    setStatus('loading')
    setMessage(`正在搜索「${keyword}」...`)

    try {
      const songs = await searchSongs(keyword, { limit: 20 })
      setDisplaySongs(songs)
      setStatus(songs.length > 0 ? 'idle' : 'empty')
      setMessage(songs.length > 0 ? `搜到 ${songs.length} 首歌。` : '没搜到，可以换个关键词。')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '搜索失败。')
    }
  }

  const buildPlayableTracks = async (songs, label) => {
    setStatus('loading')
    setMessage(`正在为「${label}」获取可播放地址...`)

    const playable = []
    for (const song of songs.slice(0, 12)) {
      try {
        const result = await getSongUrl(song.id)
        if (result.playable && result.url) {
          playable.push(toTrack(song, result.url))
        }
      } catch (error) {
        console.warn('Song url failed:', song.id, error)
      }
    }

    if (playable.length === 0) {
      setStatus('error')
      setMessage('这些歌暂时拿不到播放地址，可能是版权、会员或账号权限限制。')
      return
    }

    setStatus('idle')
    setMessage(`已接入 ${playable.length} 首可播放歌曲。`)
    onPlayTracks({
      tracks: playable,
      label,
    })
  }

  const playFromSong = (song) => {
    const index = displaySongs.findIndex(item => item.id === song.id)
    const orderedSongs = index >= 0
      ? [...displaySongs.slice(index), ...displaySongs.slice(0, index)]
      : [song]
    buildPlayableTracks(orderedSongs, selectedPlaylist?.name || '网易云歌曲')
  }

  const playCurrentList = () => {
    if (displaySongs.length === 0) return
    buildPlayableTracks(displaySongs, selectedPlaylist?.name || '网易云歌单')
  }

  return (
    <GlassPanel
      preset="panel"
      className="mb-3 rounded-[24px] px-4 py-3"
      style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#1d1d1f' }}>
            我的网易云
          </p>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: status === 'error' ? '#be123c' : '#7a7a7a' }}>
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{ background: '#f5f5f7', color: '#0066cc' }}
        >
          收起
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold" style={{ color: '#1d1d1f' }}>
            {isLoggedIn ? profile.nickname : '未登录'}
          </p>
          <p className="truncate text-[10px]" style={{ color: '#7a7a7a' }}>
            {isLoggedIn ? `歌单 ${playlists.length} 个` : '需要先连接网易云账号'}
          </p>
        </div>
        {isLoggedIn && (
          <button
            type="button"
            onClick={loadLikedSongs}
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{
              background: activeTab === 'liked' ? '#0066cc' : '#f5f5f7',
              color: activeTab === 'liked' ? '#ffffff' : '#0066cc',
            }}
          >
            收藏歌曲
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="mb-3 flex gap-2">
        <input
          type="text"
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          placeholder="搜索网易云歌曲..."
          className="min-w-0 flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none"
          style={{ background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', color: '#1d1d1f' }}
        />
        <button
          type="submit"
          disabled={!searchKeyword.trim() || status === 'loading'}
          className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-45"
          style={{ background: '#0066cc' }}
        >
          搜索
        </button>
      </form>

      {playlists.length > 0 && activeTab !== 'search' && displaySongs.length === 0 && (
        <div className="max-h-44 space-y-1.5 overflow-y-auto">
          {playlists.map(playlist => (
            <button
              key={playlist.id}
              type="button"
              onClick={() => loadPlaylistSongs(playlist)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left"
              style={{ background: '#f5f5f7' }}
            >
              {playlist.coverUrl ? (
                <img src={playlist.coverUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <span className="h-10 w-10 rounded-xl" style={{ background: '#ffffff' }} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold" style={{ color: '#1d1d1f' }}>
                  {playlist.name}
                </span>
                <span className="block truncate text-[10px]" style={{ color: '#7a7a7a' }}>
                  {playlist.trackCount} 首 · 播放 {formatCount(playlist.playCount)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {displaySongs.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="truncate text-xs font-semibold" style={{ color: '#1d1d1f' }}>
              {selectedPlaylist?.name || '歌曲'}
            </p>
            <button
              type="button"
              onClick={playCurrentList}
              disabled={status === 'loading'}
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-45"
              style={{ background: '#0066cc' }}
            >
              播放这一组
            </button>
          </div>

          <div className="max-h-52 space-y-1.5 overflow-y-auto">
            {displaySongs.map(song => (
              <button
                key={song.id}
                type="button"
                onClick={() => playFromSong(song)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all hover:opacity-90"
                style={{ background: '#f5f5f7' }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold" style={{ color: '#1d1d1f' }}>
                    {song.name}
                  </span>
                  <span className="block truncate text-[10px]" style={{ color: '#7a7a7a' }}>
                    {song.artistsText} · {song.albumName}
                  </span>
                </span>
                <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: '#ffffff', color: '#0066cc' }}>
                  播放
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </GlassPanel>
  )
}
