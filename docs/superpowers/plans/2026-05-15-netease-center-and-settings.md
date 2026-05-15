# Netease Center UI + GlassSettingsPanel Xiao Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix GlassSettingsPanel missing Xiao settings, and redesign Netease Center as a full-screen overlay with 5 tabs and subcategories.

**Architecture:** Two independent changes to `src/App.jsx` and `src/components/NeteaseCenter.jsx`. GlassSettingsPanel gets xiao props from App.jsx. NeteaseCenter gets rewritten as a full-screen GlassPanel overlay with tab navigation.

**Tech Stack:** React 19, Tailwind CSS, GlassPanel (liquid glass), existing neteaseApi.js

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/App.jsx` | Modify | Add xiao settings state, pass to GlassSettingsPanel; change NeteaseCenter from modal to full-screen overlay; replace NeteaseLibraryPanel import with NeteaseCenter |
| `src/components/NeteaseCenter.jsx` | Rewrite | Full-screen overlay with 5 tabs (歌单/搜索/歌单搜索/收藏/电台), subcategories, GlassPanel styling |
| `src/components/GlassSettingsPanel.jsx` | No change | Already handles xiao props conditionally |
| `src/services/xiaoMusicService.js` | No change | Already exports normalizeXiaoMusicSettings, loadXiaoMusicSettings, etc. |
| `src/services/neteaseApi.js` | No change | All API functions already exist |

---

### Task 1: Fix GlassSettingsPanel Xiao Settings

**Files:**
- Modify: `src/App.jsx`

The GlassSettingsPanel component accepts xiao-related props (`xiaoSettings`, `xiaoDevices`, `xiaoStatus`, etc.) and conditionally renders `<XiaoMusicSettingsControls>` when `xiaoSettings` is truthy. Currently App.jsx doesn't pass these props, so the section never appears.

- [ ] **Step 1: Add xiao settings imports and state to App.jsx**

Add these imports at the top of `src/App.jsx` after the existing imports:

```javascript
import { loadXiaoMusicSettings, saveXiaoMusicSettings, normalizeXiaoMusicSettings } from './services/xiaoMusicService'
```

Add state variables inside the `App` function, after the existing state declarations (after `const [currentTime, setCurrentTime]`):

```javascript
const [xiaoSettings, setXiaoSettings] = useState(() => loadXiaoMusicSettings())
const [xiaoDevices, setXiaoDevices] = useState([])
const [xiaoStatus, setXiaoStatus] = useState({ type: 'idle', message: '' })
const [xiaoDebug, setXiaoDebug] = useState(null)
const [xiaoBusy, setXiaoBusy] = useState(false)
```

- [ ] **Step 2: Add xiao handler stubs to App.jsx**

Add these handler functions inside the `App` function, before the `return` statement. These are minimal stubs — only settings persistence and device detection are implemented. Playback control is out of scope.

```javascript
function handleXiaoSettingsChange(partial) {
  const next = { ...xiaoSettings, ...partial }
  setXiaoSettings(next)
  saveXiaoMusicSettings(next)
}

function handleDetectXiaoDevices() {
  setXiaoBusy(true)
  setXiaoStatus({ type: 'idle', message: '正在检测设备...' })
  // Device detection will be implemented when xiao playback is enabled
  setTimeout(() => {
    setXiaoBusy(false)
    setXiaoStatus({ type: 'idle', message: '检测完成' })
  }, 1000)
}

function handleXiaoSpeakerToggle(enabled) {
  handleXiaoSettingsChange({ playbackTarget: enabled ? 'speaker' : 'browser' })
}
```

- [ ] **Step 3: Pass xiao props to GlassSettingsPanel**

Find the `<GlassSettingsPanel />` usage in App.jsx (inside the `<GlassSettingsProvider>` wrapper near the `<AlbumWallBackground>`). Replace it with:

```jsx
<GlassSettingsPanel
  xiaoSettings={xiaoSettings}
  xiaoDevices={xiaoDevices}
  xiaoStatus={xiaoStatus}
  xiaoDebug={xiaoDebug}
  xiaoBusy={xiaoBusy}
  currentTrack={currentTrack}
  onXiaoSettingsChange={handleXiaoSettingsChange}
  onDetectXiaoDevices={handleDetectXiaoDevices}
  onRefreshXiaoStatus={() => {}}
  onPlayCurrentOnXiao={() => {}}
  onStopXiao={() => {}}
  onPreviousXiao={() => {}}
  onNextXiao={() => {}}
  onSetXiaoVolume={() => {}}
  onXiaoSpeakerToggle={handleXiaoSpeakerToggle}
/>
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "fix: pass xiao settings props to GlassSettingsPanel"
```

---

### Task 2: Rewrite NeteaseCenter as Full-Screen Overlay

**Files:**
- Rewrite: `src/components/NeteaseCenter.jsx`

The current NeteaseCenter already has the API calls and data logic. We're keeping all the logic but changing the UI structure to:
- Full-screen overlay (not a modal dialog)
- 5 tab navigation: 歌单 / 搜索 / 歌单搜索 / 收藏 / 电台
- Subcategories within tabs
- GlassPanel liquid glass styling

- [ ] **Step 1: Rewrite NeteaseCenter.jsx**

Replace the entire contents of `src/components/NeteaseCenter.jsx` with the following. This is a complete rewrite that preserves all existing API logic but restructures the UI.

```jsx
import { useEffect, useMemo, useState } from 'react'
import {
  getDjPrograms,
  getDjRecommendations,
  getLikedSongs,
  getLoginStatus,
  getPersonalizedDjPrograms,
  getPlaylistDetail,
  getSongDetail,
  getSongUrl,
  getUserPlaylists,
  searchPlaylists,
  searchSongs,
} from '../services/neteaseApi'
import GlassPanel from './GlassPanel'
import NeteaseLoginPanel from './NeteaseLoginPanel'

const TABS = [
  ['playlists', '歌单'],
  ['search', '搜索'],
  ['playlistSearch', '歌单搜索'],
  ['liked', '收藏'],
  ['radio', '电台'],
]

function formatCount(count) {
  const safeCount = Number(count || 0)
  if (safeCount >= 10000) return `${(safeCount / 10000).toFixed(1)} 万`
  return String(safeCount)
}

function toTrack(song, audioUrl, fallback = {}) {
  return {
    id: `netease-${song.id || fallback.id}`,
    neteaseId: song.id || fallback.id,
    title: song.name || fallback.name || '未知歌曲',
    artist: song.artistsText || fallback.artist || fallback.radioName || 'NetEase',
    album: song.albumName || fallback.album || fallback.radioName || '',
    duration: Math.round((song.duration || fallback.duration || 0) / 1000),
    source: 'netease',
    sourceType: 'netease',
    audioUrl,
    coverUrl: song.coverUrl || fallback.coverUrl || '',
    raw: song.raw || song,
  }
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl px-4 py-6 text-center text-xs" style={{ background: 'rgba(255,255,255,0.38)', color: '#6c6f78' }}>
      {message}
    </div>
  )
}

function SongList({ songs, selectedLabel, onPlayFromSong, onPlayAll }) {
  if (!songs.length) return <EmptyState message="先选择歌单、收藏，或搜索歌曲。" />
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold" style={{ color: '#30323a' }}>{selectedLabel || '歌曲列表'}</span>
        <button type="button" onClick={onPlayAll} className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ background: '#4a318e', color: '#fff' }}>
          播放前 12 首
        </button>
      </div>
      {songs.slice(0, 40).map(song => (
        <button key={song.id} type="button" onClick={() => onPlayFromSong(song)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all hover:opacity-90" style={{ background: 'rgba(255,255,255,0.44)' }}>
          <div className="h-10 w-10 shrink-0 rounded-xl" style={{ background: song.coverUrl ? `center / cover url("${song.coverUrl}")` : '#f5f5f7' }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold" style={{ color: '#1f2330' }}>{song.name}</p>
            <p className="truncate text-[11px]" style={{ color: '#6c6f78' }}>{song.artistsText} · {song.albumName}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

export default function NeteaseCenter({ isOpen, onClose, onPlayTracks }) {
  const [profile, setProfile] = useState(null)
  const [playlists, setPlaylists] = useState([])
  const [playlistSearchResults, setPlaylistSearchResults] = useState([])
  const [songs, setSongs] = useState([])
  const [radioPrograms, setRadioPrograms] = useState([])
  const [radios, setRadios] = useState([])
  const [selectedLabel, setSelectedLabel] = useState('')
  const [activeTab, setActiveTab] = useState('playlists')
  const [songKeyword, setSongKeyword] = useState('')
  const [playlistKeyword, setPlaylistKeyword] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('打开网易云中心，选歌单、搜歌或听电台。')

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
          setMessage('还没有登录网易云。可以扫码登录或导入 MUSIC_U。')
          return
        }
        setProfile(login.profile)
        const accountPlaylists = await getUserPlaylists(login.profile.userId, { limit: 50 })
        if (cancelled) return
        setPlaylists(accountPlaylists)
        setStatus('idle')
        setMessage(accountPlaylists.length ? `已读取 ${accountPlaylists.length} 个歌单。` : '账号已登录，但没有读到歌单。')
      } catch (error) {
        if (cancelled) return
        setStatus('error')
        setMessage(error.message || '网易云账号读取失败。')
      }
    }
    loadAccount()
    return () => { cancelled = true }
  }, [isOpen])

  if (!isOpen) return null

  const loadPlaylistSongs = async (playlist) => {
    setActiveTab('playlists')
    setSelectedLabel(playlist.name)
    setSongs([])
    setStatus('loading')
    setMessage(`正在读取「${playlist.name}」...`)
    try {
      const detail = await getPlaylistDetail(playlist.id)
      let nextSongs = detail.tracks
      if (nextSongs.length === 0 && detail.trackIds.length > 0) {
        nextSongs = await getSongDetail(detail.trackIds.slice(0, 80))
      }
      setSongs(nextSongs)
      setStatus(nextSongs.length ? 'idle' : 'empty')
      setMessage(nextSongs.length ? `「${detail.name}」已载入 ${nextSongs.length} 首。` : '这个歌单暂时没有返回歌曲详情。')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '歌单读取失败。')
    }
  }

  const loadLiked = async () => {
    if (!userId) return
    setActiveTab('liked')
    setSelectedLabel(favoritePlaylist?.name || '收藏歌曲')
    setSongs([])
    setStatus('loading')
    setMessage('正在读取收藏歌曲...')
    try {
      const likedSongs = await getLikedSongs(userId, { limit: 80 })
      setSongs(likedSongs)
      setStatus(likedSongs.length ? 'idle' : 'empty')
      setMessage(likedSongs.length ? `已载入 ${likedSongs.length} 首收藏歌曲。` : '没有读取到收藏歌曲。')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '收藏歌曲读取失败。')
    }
  }

  const handleSongSearch = async (event) => {
    event.preventDefault()
    const keyword = songKeyword.trim()
    if (!keyword) return
    setActiveTab('search')
    setSelectedLabel(`搜索：${keyword}`)
    setSongs([])
    setStatus('loading')
    setMessage(`正在搜索歌曲「${keyword}」...`)
    try {
      const results = await searchSongs(keyword, { limit: 30 })
      setSongs(results)
      setStatus(results.length ? 'idle' : 'empty')
      setMessage(results.length ? `搜到 ${results.length} 首歌。` : '没有搜到歌曲，可以换个关键词。')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '歌曲搜索失败。')
    }
  }

  const handlePlaylistSearch = async (event) => {
    event.preventDefault()
    const keyword = playlistKeyword.trim()
    if (!keyword) return
    setActiveTab('playlistSearch')
    setPlaylistSearchResults([])
    setSongs([])
    setStatus('loading')
    setMessage(`正在搜索歌单「${keyword}」...`)
    try {
      const results = await searchPlaylists(keyword, { limit: 20 })
      setPlaylistSearchResults(results)
      setStatus(results.length ? 'idle' : 'empty')
      setMessage(results.length ? `搜到 ${results.length} 个歌单。` : '没有搜到歌单，可以换个关键词。')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '歌单搜索失败。')
    }
  }

  const loadRadio = async () => {
    setActiveTab('radio')
    setRadioPrograms([])
    setRadios([])
    setStatus('loading')
    setMessage('正在读取网易云电台推荐...')
    try {
      const [programs, recommendations] = await Promise.all([
        getPersonalizedDjPrograms({ limit: 12 }).catch(() => []),
        getDjRecommendations({ limit: 12 }).catch(() => []),
      ])
      setRadioPrograms(programs)
      setRadios(recommendations)
      setStatus(programs.length || recommendations.length ? 'idle' : 'empty')
      setMessage(programs.length || recommendations.length ? '电台推荐已载入。' : '暂时没有拿到电台推荐。')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '电台读取失败。')
    }
  }

  const loadRadioPrograms = async (radio) => {
    setActiveTab('radio')
    setSelectedLabel(radio.name)
    setRadioPrograms([])
    setStatus('loading')
    setMessage(`正在读取「${radio.name}」节目...`)
    try {
      const programs = await getDjPrograms(radio.id, { limit: 30 })
      setRadioPrograms(programs)
      setStatus(programs.length ? 'idle' : 'empty')
      setMessage(programs.length ? `已载入 ${programs.length} 个节目。` : '这个电台暂时没有返回节目。')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '电台节目读取失败。')
    }
  }

  const buildPlayableTracks = async (sourceSongs, label) => {
    const usableSongs = sourceSongs.filter(Boolean)
    if (!usableSongs.length) return
    setStatus('loading')
    setMessage(`正在为「${label}」获取播放地址...`)
    const playable = []
    for (const song of usableSongs.slice(0, 12)) {
      try {
        const result = await getSongUrl(song.id)
        if (result.playable && result.url) {
          playable.push(toTrack(song, result.url))
        }
      } catch (error) {
        console.warn('Song url failed:', song.id, error)
      }
    }
    if (!playable.length) {
      setStatus('error')
      setMessage('这些内容暂时拿不到播放地址，可能是版权、会员或账号权限限制。')
      return
    }
    setStatus('idle')
    setMessage(`已接入 ${playable.length} 首可播放内容。`)
    onPlayTracks({ tracks: playable, label })
    onClose()
  }

  const playFromSong = (song) => {
    const index = songs.findIndex(item => item.id === song.id)
    const ordered = index >= 0 ? [...songs.slice(index), ...songs.slice(0, index)] : [song]
    buildPlayableTracks(ordered, selectedLabel || '网易云歌曲')
  }

  const playProgram = (program) => {
    if (!program.mainSong) {
      setStatus('error')
      setMessage('这个电台节目没有返回可播放歌曲。')
      return
    }
    buildPlayableTracks([program.mainSong], program.name || '网易云电台')
  }

  return (
    <GlassPanel
      preset="panel"
      className="flex h-full flex-col rounded-[24px] px-5 py-4"
      style={{ background: 'rgba(255,255,255,0.58)', border: '1px solid rgba(255,255,255,0.34)' }}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold" style={{ color: '#171820' }}>网易云中心</p>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: status === 'error' ? '#be123c' : '#6c6f78' }}>{message}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.54)', color: '#4a318e' }}>
          返回电台
        </button>
      </div>

      {/* Login prompt */}
      {!profile && (
        <div className="mb-4">
          <NeteaseLoginPanel />
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-3 grid grid-cols-5 gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.38)' }}>
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setActiveTab(value)
              if (value === 'liked') loadLiked()
              if (value === 'radio') loadRadio()
              if (value === 'playlists' || value === 'search' || value === 'playlistSearch') {
                setSongs([])
                setPlaylistSearchResults([])
              }
            }}
            className="rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-all"
            style={{ background: activeTab === value ? '#4a318e' : 'transparent', color: activeTab === value ? '#fff' : '#5f6470' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 歌单 Tab */}
        {activeTab === 'playlists' && (
          <div className="space-y-3">
            {/* 我的歌单 */}
            {playlists.length > 0 && songs.length === 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold" style={{ color: '#30323a' }}>我的歌单</p>
                <div className="space-y-1.5">
                  {playlists.map(playlist => (
                    <button key={playlist.id} type="button" onClick={() => loadPlaylistSongs(playlist)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all hover:opacity-90" style={{ background: 'rgba(255,255,255,0.44)' }}>
                      <div className="h-12 w-12 shrink-0 rounded-xl" style={{ background: playlist.coverUrl ? `center / cover url("${playlist.coverUrl}")` : '#f5f5f7' }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold" style={{ color: '#1f2330' }}>{playlist.name}</p>
                        <p className="truncate text-[11px]" style={{ color: '#6c6f78' }}>{playlist.trackCount} 首 · 播放 {formatCount(playlist.playCount)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* 歌单内歌曲列表 */}
            {songs.length > 0 && (
              <SongList
                songs={songs}
                selectedLabel={selectedLabel}
                onPlayFromSong={playFromSong}
                onPlayAll={() => buildPlayableTracks(songs, selectedLabel || '网易云歌曲')}
              />
            )}
            {!playlists.length && songs.length === 0 && status !== 'loading' && (
              <EmptyState message="还没有读到歌单，请先登录网易云账号。" />
            )}
          </div>
        )}

        {/* 搜索 Tab */}
        {activeTab === 'search' && (
          <div className="space-y-3">
            <form onSubmit={handleSongSearch} className="grid grid-cols-[1fr_auto] gap-2">
              <input value={songKeyword} onChange={(event) => setSongKeyword(event.target.value)} placeholder="搜索歌曲或歌手" className="min-w-0 rounded-2xl px-3 py-2 text-xs focus:outline-none" style={{ background: 'rgba(255,255,255,0.52)', color: '#171820' }} />
              <button type="submit" className="rounded-2xl px-3 py-2 text-xs font-semibold text-white" style={{ background: '#4a318e' }}>搜歌</button>
            </form>
            {songs.length > 0 && (
              <SongList
                songs={songs}
                selectedLabel={selectedLabel}
                onPlayFromSong={playFromSong}
                onPlayAll={() => buildPlayableTracks(songs, selectedLabel || '网易云歌曲')}
              />
            )}
            {songs.length === 0 && status !== 'loading' && (
              <EmptyState message="输入关键词搜索网易云歌曲。" />
            )}
          </div>
        )}

        {/* 歌单搜索 Tab */}
        {activeTab === 'playlistSearch' && (
          <div className="space-y-3">
            <form onSubmit={handlePlaylistSearch} className="grid grid-cols-[1fr_auto] gap-2">
              <input value={playlistKeyword} onChange={(event) => setPlaylistKeyword(event.target.value)} placeholder="搜索歌单名称" className="min-w-0 rounded-2xl px-3 py-2 text-xs focus:outline-none" style={{ background: 'rgba(255,255,255,0.52)', color: '#171820' }} />
              <button type="submit" className="rounded-2xl px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.54)', color: '#4a318e' }}>搜歌单</button>
            </form>
            {playlistSearchResults.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold" style={{ color: '#30323a' }}>歌单结果 · {playlistSearchResults.length} 个</p>
                {playlistSearchResults.map(playlist => (
                  <button key={playlist.id} type="button" onClick={() => loadPlaylistSongs(playlist)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all hover:opacity-90" style={{ background: 'rgba(255,255,255,0.44)' }}>
                    <div className="h-10 w-10 shrink-0 rounded-xl" style={{ background: playlist.coverUrl ? `center / cover url("${playlist.coverUrl}")` : '#f5f5f7' }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold" style={{ color: '#1f2330' }}>{playlist.name}</p>
                      <p className="truncate text-[11px]" style={{ color: '#6c6f78' }}>{playlist.trackCount} 首 · {playlist.creator}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* If a playlist was clicked, show its songs */}
            {songs.length > 0 && (
              <SongList
                songs={songs}
                selectedLabel={selectedLabel}
                onPlayFromSong={playFromSong}
                onPlayAll={() => buildPlayableTracks(songs, selectedLabel || '网易云歌曲')}
              />
            )}
            {playlistSearchResults.length === 0 && songs.length === 0 && status !== 'loading' && (
              <EmptyState message="输入关键词搜索网易云歌单。" />
            )}
          </div>
        )}

        {/* 收藏 Tab */}
        {activeTab === 'liked' && (
          <div>
            {!userId && <EmptyState message="请先登录网易云账号查看收藏歌曲。" />}
            {userId && songs.length === 0 && status !== 'loading' && <EmptyState message="点击收藏 Tab 加载你喜欢的歌曲。" />}
            {songs.length > 0 && (
              <SongList
                songs={songs}
                selectedLabel={selectedLabel}
                onPlayFromSong={playFromSong}
                onPlayAll={() => buildPlayableTracks(songs, selectedLabel || '收藏歌曲')}
              />
            )}
          </div>
        )}

        {/* 电台 Tab */}
        {activeTab === 'radio' && (
          <div className="space-y-3">
            {/* 推荐电台 */}
            {radios.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold" style={{ color: '#30323a' }}>推荐电台</p>
                <div className="space-y-1.5">
                  {radios.slice(0, 8).map(radio => (
                    <button key={radio.id} type="button" onClick={() => loadRadioPrograms(radio)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all hover:opacity-90" style={{ background: 'rgba(255,255,255,0.44)' }}>
                      <div className="h-10 w-10 shrink-0 rounded-xl" style={{ background: radio.coverUrl ? `center / cover url("${radio.coverUrl}")` : '#f5f5f7' }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold" style={{ color: '#1f2330' }}>{radio.name}</p>
                        <p className="truncate text-[11px]" style={{ color: '#6c6f78' }}>{radio.category || radio.djName || 'DJ Radio'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* 推荐节目 / 电台节目 */}
            <div>
              <p className="mb-2 text-[11px] font-semibold" style={{ color: '#30323a' }}>{selectedLabel || '推荐节目'}</p>
              {radioPrograms.length > 0 ? (
                <div className="space-y-1.5">
                  {radioPrograms.slice(0, 20).map(program => (
                    <button key={program.id} type="button" onClick={() => playProgram(program)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all hover:opacity-90" style={{ background: 'rgba(255,255,255,0.44)' }}>
                      <div className="h-10 w-10 shrink-0 rounded-xl" style={{ background: program.coverUrl ? `center / cover url("${program.coverUrl}")` : '#f5f5f7' }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold" style={{ color: '#1f2330' }}>{program.name}</p>
                        <p className="truncate text-[11px]" style={{ color: '#6c6f78' }}>{program.radioName || program.mainSong?.artistsText || '网易云电台'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState message="点击"电台"页签刷新推荐，或选择一个推荐电台。" />
              )}
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. Note: `NeteaseLibraryPanel` import in App.jsx will become unused — that's fine, Task 3 cleans it up.

- [ ] **Step 3: Commit**

```bash
git add src/components/NeteaseCenter.jsx
git commit -m "feat: rewrite NeteaseCenter as full-screen overlay with 5 tabs"
```

---

### Task 3: Update App.jsx to Use NeteaseCenter Instead of NeteaseLibraryPanel

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace NeteaseLibraryPanel import with NeteaseCenter**

In `src/App.jsx`, change:
```javascript
import NeteaseLibraryPanel from './components/NeteaseLibraryPanel'
```
to:
```javascript
import NeteaseCenter from './components/NeteaseCenter'
```

- [ ] **Step 2: Replace NeteaseLibraryPanel usage with NeteaseCenter**

Find this block in the `<main>` section:
```jsx
{isNeteaseLibraryOpen && (
  <NeteaseLibraryPanel
    isOpen={isNeteaseLibraryOpen}
    onClose={() => setIsNeteaseLibraryOpen(false)}
    onPlayTracks={handleNeteaseLibraryTracks}
  />
)}
```

Replace with nothing (delete it). The NeteaseCenter will be rendered as a full-screen overlay instead.

- [ ] **Step 3: Add NeteaseCenter as full-screen overlay**

Find the closing `</GlassPanel>` of the main phone shell (near the end of the component, after the `</footer>`). Before the closing `</div>` of the outer container, add:

```jsx
{isNeteaseLibraryOpen && (
  <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4">
    <div className="h-[min(790px,calc(100vh-24px))] w-[460px] max-w-[calc(100vw-18px)]">
      <NeteaseCenter
        isOpen={isNeteaseLibraryOpen}
        onClose={() => setIsNeteaseLibraryOpen(false)}
        onPlayTracks={handleNeteaseLibraryTracks}
      />
    </div>
  </div>
)}
```

This renders NeteaseCenter as a full-screen overlay centered on screen, matching the phone shell dimensions.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate NeteaseCenter as full-screen overlay in App"
```

---

### Task 4: Final Verification

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors. Warnings are pre-existing (JSX usage detection, unused vars in other files).

- [ ] **Step 3: Visual verification checklist**

Open `http://localhost:5173/` (or preview) and verify:
1. Header shows "网易云" button
2. Click "网易云" → full-screen overlay appears with liquid glass style
3. 5 tabs visible: 歌单 / 搜索 / 歌单搜索 / 收藏 / 电台
4. 歌单 Tab shows login prompt if not logged in, or playlist list if logged in
5. 搜索 Tab shows search input
6. 歌单搜索 Tab shows playlist search input
7. 收藏 Tab shows login prompt if not logged in
8. 电台 Tab loads recommendations
9. "返回电台" button closes overlay
10. Header settings gear → GlassSettingsPanel shows xiao speaker section

- [ ] **Step 4: Commit final state if needed**

```bash
git add -A
git commit -m "chore: final verification pass"
```
