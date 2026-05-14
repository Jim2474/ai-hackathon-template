# Agent Progress

更新时间：2026-05-13 21:10（Asia/Shanghai）

## Completed Work

- 已接入 Claudio 到本机 xiaomusic 的基础闭环：Claudio 生成歌单和 DJ 文案后，可以通过本机代理调用 xiaomusic。
- 已新增小爱音箱控制面板，支持配置 xiaomusic 地址、HTTP Basic 用户名/密码、检测设备、选择设备、选择播放目标。
- 已支持三种播放目标：只在浏览器播放、只推送到小爱音箱、浏览器和小爱双端同时播放。
- 已支持小爱端常用控制：推送当前歌曲、停止、上一首、下一首、刷新状态、设置音量。
- 已把 DJ 文案接入小爱 TTS：开启“先播 DJ 文案”后，先调用 `/playtts`，再调用 `/playurl`。
- 已加入 Song Story 上下文窗口：根据用户输入、歌曲信息、歌词摘要、播放位置和本地记忆生成更像私人电台的串场词。
- 已修复 Vite dev server 启动时的依赖预打包崩溃：在 `vite.config.js` 中关闭 dev-only `optimizeDeps`。注意：Vite 构建时会提示 `optimizeDeps.disabled` 是旧写法，但当前 React 插件会自动注入 include，单独使用推荐写法仍会复现 dev 崩溃。
- 已验证 `npm run build` 可以完成，`npm run lint` 为 warning-only（0 errors）。
- 已验证 `http://127.0.0.1:5173/` 返回 200，开发服务器当前可访问。
- 已验证本机 xiaomusic 代理 `/api/xiaomusic/getsetting?need_device_list=true` 返回 200，并检测到 1 台设备：Xiaomi Sound。
- 已验证使用设备的 `miotDID` 调用 `/playingmusic` 可以返回状态；设备 ID 解析已改为优先使用 `miotDID`/`mi_did`。
- 已修复 `http://127.0.0.1:5173/` 白屏：白屏不是小爱播放逻辑导致，而是 dev/preview 过程中暴露出的两个前端初始化问题。
- 已移除 `liquid-glass-react` 的顶层运行时依赖，改成 `GlassPanel` 内部的 CSS 玻璃层，避免第三方 ESM/React runtime 兼容问题让首屏崩掉。
- 已修复 `normalizeXiaoMusicSettings(null)` 读取 `playbackTarget` 崩溃的问题，避免 localStorage 为空或旧数据时首屏白屏。
- 已用 Chrome DevTools 协议验证首屏 DOM 已渲染，能看到 Claudio、小爱音箱入口、网易云入口、输入框和播放器。
- 已把小爱推送改成“小爱播放”总开关：打开后设置 `playbackTarget: "speaker"`，并强制开启 `speakDjBeforeTrack` 和 `autoPushOnTrackChange`。
- 打开“小爱播放”开关会立即停止电脑端音频和浏览器 TTS，后续默认只推送小爱音箱播放，电脑不播放。
- 已验证开关点击后 localStorage 写入正确，页面状态从“未连接”变为“小爱播放”。
- 已把小爱详细设置从主界面移到右上角齿轮设置面板；主界面只保留“小爱音箱”状态条和总开关。
- 已把 DJ 文案推送后的等待从“按字数估算整段时长，最长 9 秒”改为可配置短缓冲 `ttsLeadMs`，默认 1.2 秒，避免推送音乐前等待太久。
- 已支持在右上角设置里调节“DJ 间隔”，如果 DJ 词被音乐盖住，可以把间隔调大；如果觉得推送慢，可以调小。
- 已修复底部播放/暂停按钮没有触发小爱停止的问题：现在暂停会统一调用 `pausePlayback()`，小爱模式下会向 xiaomusic 发送停止播放命令。
- 已再次验证 `npm run build` 通过；`npm run lint` 仍为 0 errors、22 warnings。
- 已验证 `http://localhost:5173/` 返回 200，本机 `http://127.0.0.1:58090/openapi.json` 返回 200。
- 已用本机 Chrome headless 验证首屏能看到 Claudio 和小爱音箱状态条；生产构建产物里已包含右上角设置中的“DJ 间隔/检测/推送”等小爱设置代码。
- 用户实测底部暂停键已经可以正常暂停小爱播放。
- 已把主界面的小爱音箱入口从一整块卡片改为标题区右侧的小胶囊开关，不再占用主内容区域。
- 已把小爱 DJ TTS 等待改为“用户设置的最短等待”和“按文案长度自动估算等待”两者取较大值，默认最短 2.8 秒，自动估算封顶 5.5 秒，避免 `/playurl` 太快打断 `/playtts`。
- 小爱状态现在会显示“DJ 文案已发送，X 秒后推歌...”，用于判断 Claudio 是否已经发出 TTS 请求。
- 已定位 Song Story/DJ 文案一直像本地生成的原因：当前运行的是 `vite preview`，但 MiniMax chat/TTS 代理只注册在 dev server，没有注册到 preview server，导致 `/api/minimax/chat` 返回 404，前端自动保留本地 fallback 文案。
- 已修复 `vite.config.js`，让 MiniMax chat/TTS 代理同时支持 `configureServer` 和 `configurePreviewServer`。
- 已重启 `http://localhost:5173/` 预览服务，并验证 `/api/minimax/chat` 从 404 变为 200，MiniMax 能正常返回内容。
- 已彻查小爱 DJ 推送链路：
  - MiniMax chat 代理返回 200；
  - xiaomusic 设备列表返回 200，检测到 `Xiaomi Sound`，`miotDID=501766893`；
  - 直接调用 `/api/xiaomusic/playtts?did=501766893&text=...` 返回 200 `{"ret":"OK"}`；
  - 用无头浏览器完整跑一轮 Claudio 小爱模式，网络请求中确认 `/api/minimax/chat` 返回 200，随后 `/api/xiaomusic/cmd` 返回 200，随后 `/api/xiaomusic/playtts` 返回 200，最后 `/api/xiaomusic/playurl` 返回 200。
- 已修复首歌小爱 DJ 不读屏幕 Song Story 的代码问题：现在小爱推歌前会优先等待/获取当前歌曲的 Song Story，而不是只使用 `plan.openingLine`。
- 已在小爱播 DJ 前先发送停止播放命令并等待短暂停顿，降低当前音乐盖住 TTS 的概率。
- 已研究 xiaomusic 源码确认：`/playtts` 内部会生成 TTS 音频、推给音箱并按文案长度等待后才返回，所以 Claudio 不应该在 `/playtts` 返回后再按字数额外等待。
- 已把小爱推歌前的停止播放从异步 `/cmd` 口令改为 xiaomusic 的同步 `/device/stop`，减少“停止命令还没跑完，TTS/音乐已经继续推送”的竞态。
- 已把 `/playtts` 后的等待改成 0-1.5 秒的短“推歌缓冲”，默认 0.35 秒；旧 localStorage 里超过 1.5 秒的值会自动回到 0.35 秒，避免继续慢切歌。
- 已把首歌和网易云曲库首歌的小爱 `xiaoIntroText` 改为当前歌曲 Song Story，不再传 `plan.openingLine`。
- 已彻查“串场词没生成/没推送”的问题：
  - MiniMax chat 代理可返回 `{"story":"测试串场词"}`，AI 接口可用。
  - 页面实测显示 `MiniMax DJ generated the intro and track notes.`，说明 MiniMax 已生成开场和每首歌 track note。
  - 旧逻辑对网易云歌曲没有优先使用 `track.songIntro`，导致页面和小爱优先拿本地 Song Story 模板。
  - 旧本地 Song Story 缓存会挡住新的 MiniMax Song Story 生成。
  - 已修复：MiniMax 开启时忽略旧 local 缓存；有 `track.songIntro` 时优先作为串场词来源。
- 已新增小爱推送日志：每次推 DJ TTS 会打印来源、原文字数、实际朗读字数和预览文本。
- 已确认小爱现在收到的是 `source:"minimax-plan"` 的 AI 串场词。
- 已发现 xiaomusic 对长文本 TTS 极慢：111 字 AI 串场词会让 `/playtts` 到 `/playurl` 间隔超过 1 分钟。
- 已修复小爱朗读版串场词过长问题：屏幕保留完整 Song Story，小爱端自动抽取/压缩成短句朗读。实测 92 字原文被压到 27 字，随后新的音乐 URL 正常推送。

## Changed Files

- `src/App.jsx`：接入小爱播放目标、Song Story 生成、DJ 文案推送、切歌时自动推送小爱。
- `src/App.jsx`：优化小爱 DJ TTS 后推歌速度，修复底部暂停键无法停止小爱播放的问题。
- `src/App.jsx`：小爱推歌前现在等待当前歌曲 Song Story，并在 `/playtts` 前先停止小爱当前播放，确保 DJ 文案请求发生在音乐 URL 推送之前。
- `src/components/XiaoMusicPanel.jsx`：主界面改为精简小爱状态条和总开关；导出右上角设置面板使用的完整小爱控制区。
- `src/components/XiaoMusicPanel.jsx`：主界面小爱入口进一步压缩为标题区小胶囊，右上角设置里的 DJ 间隔最大值提高到 8 秒。
- `src/components/GlassSettingsPanel.jsx`：右上角齿轮设置新增小爱音箱详细设置、检测、推送、停止、音量和 DJ 间隔。
- `src/services/xiaoMusicService.js`：新增 xiaomusic 客户端、设置持久化、设备/播放/TTS/音量/状态接口。
- `src/services/xiaoMusicService.js`：新增 `ttsLeadMs` 设置项，用于控制 DJ TTS 和音乐推送之间的短缓冲。
- `src/services/xiaoMusicService.js`：`stopXiaoMusic()` 改为调用 `/device/stop`，并把 `ttsLeadMs` 默认值/上限调整为适配 xiaomusic `/playtts` 同步等待机制。
- `src/components/XiaoMusicPanel.jsx`：右上角设置里的“最短DJ间隔”改为“推歌缓冲”，范围从 0-8 秒改为 0-1.5 秒。
- `src/services/songStoryService.js`：MiniMax 开启时不再复用旧 local Song Story 缓存；网易云歌曲也会优先使用 `track.songIntro`。
- `src/App.jsx`：小爱 TTS 使用 `buildXiaoDjTtsText()` 把长串场词压成适合音箱朗读的短句；控制台日志输出 `source/originalChars/chars/preview`。
- `vite.config.js`：新增 `/api/xiaomusic` 代理；复用请求体读取函数；关闭 dev 依赖预打包以避开 Vite 启动崩溃。
- `src/components/GlassPanel.jsx`：移除 `liquid-glass-react` 顶层导入，保留纯 CSS 玻璃视觉层，解决首屏白屏。
- `src/services/contextBuilder.js`：新增 Song Story context window 组装。
- `src/services/moodProfileService.js`：新增本地用户状态和歌曲播放记忆。
- `src/services/songStoryService.js`：新增歌词摘要、Song Story 缓存、MiniMax 生成和本地 fallback。
- `src/services/minimaxService.js`：新增 Song Story 专用 MiniMax prompt 和调用函数。
- `src/services/ttsService.js`：新增 DJ 声音预设，并调整浏览器/MiniMax TTS 默认语速和声线。
- `vite.config.js`：MiniMax chat/TTS 代理现在同时挂载到 dev 和 preview，避免预览模式下 AI 文案接口 404。

## Current Problems

- 用户反馈小爱音箱已经成功播放过测试音频，说明路线和本机服务配置方向可行。
- 用户反馈推送音乐速度慢，已定位到原逻辑最长等待 9 秒；后续 1.2 秒又过短，可能导致音乐打断 DJ TTS。当前改为默认最短 2.8 秒、自动估算封顶 5.5 秒。
- 用户反馈 DJ 词仍没有在小爱音箱播放；本轮已定位为两个前端问题叠加：AI track note 没被优先用于网易云 Song Story，以及小爱朗读文本过长导致 `/playtts` 阻塞很久。当前已修复并用浏览器日志确认 `source:"minimax-plan"` 进入小爱 TTS，且短句 TTS 后跟随新的 `/playurl`。
- 用户反馈电脑暂停键不能暂停小爱；已修复，用户已确认正常暂停。
- xiaomusic 的 `/cmd` 是否能完全等价“暂停”取决于音箱和 xiaomusic 版本；如果 `停止播放` 无效，下一步要改成更贴合该版本的控制接口或命令文本。
- 如果歌曲地址是 `/audio/...`、`blob:` 或本机 localhost 地址，小爱音箱通常访问不到；当前逻辑会阻止这类 URL 推送，并提示原因。
- `npm run lint` 仍可能有 warning，主要是项目原有 ESLint 配置不会把 JSX 使用计入 `no-unused-vars`，不是构建阻塞。

## Next Steps

1. 打开 `http://localhost:5173/`，点击右上角齿轮，确认小爱音箱详细设置在设置面板里。
2. 在小爱播放开关打开时生成歌单，观察页面是否出现“DJ 文案已发送，X 秒后推歌...”，同时听小爱是否播 DJ 词。
3. 如果页面出现该状态但音箱仍不说话，下一步不要继续改 Claudio 前端请求链路；应测试 xiaomusic 原生 Web UI 的 TTS 是否出声，或改成 MiniMax TTS 生成音频后再推 `/playurl`。
4. 用户下一次实测时，重点听“小爱先说一句短串场，再播歌”。如果仍然完全不出声，直接看浏览器控制台 `[Claudio XiaoMusic] pushing DJ TTS ...` 那一行的 `preview` 和 `chars`。
5. 如果日志显示已经推了短句但音箱无声，再测试 xiaomusic 原生 Web UI 的 TTS 是否出声；若原生也不出声，优先检查 xiaomusic 的 TTS 设置/音箱型号兼容。
