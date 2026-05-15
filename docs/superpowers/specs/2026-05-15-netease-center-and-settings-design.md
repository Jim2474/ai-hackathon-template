# Netease Center UI + GlassSettingsPanel Xiao Fix

## Summary

Two changes:
1. Fix GlassSettingsPanel to include Xiao speaker settings (currently missing because App.jsx doesn't pass xiao props)
2. Redesign Netease Center as a full-screen overlay with 5 tabs and subcategories

## Change 1: GlassSettingsPanel Xiao Settings

### Problem
GlassSettingsPanel has `{xiaoSettings && <XiaoMusicSettingsControls ... />}` but App.jsx doesn't pass xiao-related props, so the section never renders.

### Solution
- Add minimal xiao settings state to App.jsx (just the settings object, no playback control logic)
- Pass xiao settings + empty stubs for control handlers to GlassSettingsPanel
- Xiao speaker playback control is out of scope (user said "先不做小爱音箱的技能")
- Only show the settings UI (device detection, address config, speaker toggle)

### Files
- `src/App.jsx` — add xiao settings state, pass to GlassSettingsPanel
- `src/components/GlassSettingsPanel.jsx` — no changes needed (already handles conditional rendering)

## Change 2: Netease Center Full-Screen Overlay

### Layout
```
┌─────────────────────────────────────────┐
│ 网易云中心                    [返回电台] │
│ 状态文字 (已登录/未登录/错误信息)        │
├─────────────────────────────────────────┤
│ [歌单] [搜索] [歌单搜索] [收藏] [电台]  │  ← 5 Tab 顶栏
├─────────────────────────────────────────┤
│                                         │
│  歌单 Tab:                              │
│  ├── 我的歌单 (用户歌单列表)            │
│  └── 推荐歌单 (个性化推荐，若已登录)    │
│  点击歌单 → 原地展开歌曲列表            │
│                                         │
│  搜索 Tab:                              │
│  ├── 歌曲搜索输入框 + 搜歌按钮          │
│  └── 搜索结果列表                       │
│                                         │
│  歌单搜索 Tab:                          │
│  ├── 歌单搜索输入框 + 搜歌单按钮        │
│  └── 歌单搜索结果列表                   │
│                                         │
│  收藏 Tab:                              │
│  └── 我喜欢的音乐 (需登录)              │
│                                         │
│  电台 Tab:                              │
│  ├── 推荐电台                           │
│  ├── 推荐节目                           │
│  └── 我订阅的电台 (若已登录)            │
│                                         │
├─────────────────────────────────────────┤
│ 底部操作栏: [播放前N首] / 状态消息      │
└─────────────────────────────────────────┘
```

### Visual Style
- 全屏覆盖层，z-index 高于主界面
- 使用 GlassPanel `preset="panel"` 液态玻璃风格
- 背景半透明，能看到底层主界面
- Tab 栏用玻璃胶囊按钮，active tab 用紫色高亮
- 歌曲列表项用玻璃卡片样式
- 专辑封面 40x40 rounded-xl
- 颜色与主界面一致：深色文字 #171820，次要文字 #6c6f78，强调色 #4a318e

### Interaction
- 点击歌单 → 原地展开歌曲列表（不跳转新视图）
- 点击歌曲 → 获取播放 URL → 加入队列并播放
- "播放前N首" 按钮 → 批量获取 URL 并加入队列
- 返回按钮 → 关闭覆盖层
- 歌曲正在获取 URL 时显示 loading 状态
- 无数据时显示空状态提示

### Files
- `src/components/NeteaseCenter.jsx` — rewrite with 5 tabs, subcategories, full-screen overlay
- `src/App.jsx` — change NeteaseCenter integration from modal to full-screen overlay

### Existing Code Reuse
- `src/services/neteaseApi.js` — all API calls already exist (searchSongs, searchPlaylists, getUserPlaylists, getLikedSongs, getPlaylistDetail, getSongUrl, getDjPrograms, getDjRecommendations, getPersonalizedDjPrograms)
- `src/components/GlassPanel.jsx` — glass styling
- `src/components/NeteaseLoginPanel.jsx` — login panel (reuse inside NeteaseCenter when not logged in)

## Out of Scope
- Xiao speaker playback control (only settings UI)
- React Router (no new routes)
- New backend endpoints
- Playlist creation/editing
- User profile display
