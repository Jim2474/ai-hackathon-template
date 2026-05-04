import { normalizeDJPlan } from './planNormalizer';

const SYSTEM_PROMPT = `你是 Claudio 的深夜私人电台女 DJ。背景音乐已经很轻地响起，你正在和用户慢慢聊天。
只返回严格 JSON，不要 Markdown、解释、代码块或多余文字。
从给定 localAudioLibrary 里选 3 首可播放歌曲，tracks 的 id/title/artist/audioUrl 必须完全照抄，不要虚构歌曲。
你可以读取 addedAt/likedAt/lastPlayedAt/playCount/userNote/songBackground/sourceType，但不要说“根据数据显示”。
如果歌曲是本地 demo 或自定义源，只能介绍声音特点、用户关系和当前场景，不要编造真实发行年份、歌手故事、专辑背景。
mode 规则：学习/写代码/专注=focus；焦虑/压力/放松=calm；睡前/入眠=sleep；运动/提神/有活力/精神一点/嗨一点/带劲/动感=energy；雨声/自然声=nature。
语气：像私人电台 DJ，不是客服、导航、系统提示或报告。要有交流感，像在回应用户此刻的状态。
台词长度：openingLine 2-3 个短句；reason 1-2 个短句；每首歌 songIntro 2 个短句；transition 1 个短句。不要长篇，不要密集分析。
表达方式：可以说“我先给你放...”“这首放在这里，是因为...”“你不用马上进入状态”。要自然、有陪伴感、有一点留白。
禁止：客服腔、鸡血、撒娇、感叹号、“根据您的需求”、“以下是方案”、“为您生成”。
输出字段：
{"title":"","subtitle":"","mode":"","mood":"","openingLine":"","reason":"","phases":[{"time":"0-10min","title":""}],"tracks":[{"id":"","title":"","artist":"","mode":"","audioUrl":"","phase":"","songIntro":"","personalReason":"","transitionIn":"","transitionOut":"","transition":""}],"transitions":[""],"closingLine":"","highlights":[""]}`;

const SEARCH_PLAN_SYSTEM_PROMPT = `你是 Moodwave 的私人 AI DJ 和音乐搜索规划器。
用户会输入当前状态、情绪、目标或场景。
你的任务是判断用户需要什么样的声音环境，并生成适合网易云搜索的关键词。
你必须只返回严格 JSON，不要 Markdown，不要代码块，不要解释。
输出 JSON 格式：
{"mode":"focus","title":"低阻力学习电台","subtitle":"90min · Focus · Light Instrumental","searchQueries":["学习 纯音乐","专注 轻音乐","lofi 学习"],"energyCurve":"low_to_mid","avoid":["强人声","高刺激","过快节奏"],"openingIntent":"先降低启动阻力，再逐渐进入专注。"}
mode 只能是 focus、calm、sleep、energy、nature。
searchQueries 返回 3 到 5 个，适合网易云中文搜索，每个 query 2 到 8 个字或短词组合。
focus 优先：学习 纯音乐 / 专注 轻音乐 / lofi 学习。
sleep 优先：睡前轻音乐 / 助眠纯音乐 / 自然声 放松。
calm 优先：治愈 轻音乐 / 放松 钢琴 / 安静 纯音乐。
energy 优先：活力 节奏 / 动感 音乐 / 提神 音乐 / 电子 运动 / 燃 音乐。
nature 优先：雨声 / 白噪音 / 自然声。`;

const DJ_SCRIPT_SYSTEM_PROMPT = `你是 Moodwave 的私人 AI DJ。
现在系统已经根据用户状态从网易云找到了几首歌。
你的任务是为这段音乐生成自然、短、有电台感的 DJ 台词，像真正电台一样介绍即将播放的音乐。
你必须只返回严格 JSON，不要 Markdown，不要代码块，不要解释。
输出 JSON：
{"openingLine":"","reason":"","tracks":[{"id":"","phase":"","songIntro":"","transition":""}],"closingLine":""}
规则：
必须像 DJ 一样介绍音乐背景，但只能使用输入里真实给出的信息：歌名、歌手、专辑名、时长、用户状态、当前模式。
可以说“接下来听到的是某歌手的《某歌名》”“这首来自专辑《...》”“歌名里有...的气质”“这首曲子的名字给人的听感更适合...”，但不要编造发行年份、创作故事、歌手经历、专辑历史。
每首 songIntro 2 到 3 句：第 1 句介绍歌名/歌手/专辑，第 2 句说明听感或场景匹配，第 3 句可选地说明为什么放在这一段。
transition 1 句，openingLine 1 到 3 句。
不要说“根据您的需求”“以下是方案”。
语气像温柔私人电台 DJ，不像客服。
返回的 tracks id 必须和 selectedTracks 一致。`;

function parseJSONSafely(content) {
  let cleanedContent = content;
  
  // 移除 MiniMax 可能返回的 <think> 标签内容
  if (cleanedContent.includes('<think>')) {
    cleanedContent = cleanedContent.replace(/<think>[\s\S]*?<\/think>/g, '');
    console.log('已移除 <think> 标签内容');
  }
  
  try {
    return JSON.parse(cleanedContent);
  } catch (e) {
    try {
      const firstBrace = cleanedContent.indexOf('{');
      const lastBrace = cleanedContent.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonString = cleanedContent.slice(firstBrace, lastBrace + 1);
        return JSON.parse(jsonString);
      }
    } catch (e2) {
      console.error('Failed to parse JSON even after extraction:', e2);
    }
    throw new Error('Failed to parse JSON response from MiniMax');
  }
}

function validatePlan(plan, library) {
  if (!plan.tracks || !Array.isArray(plan.tracks) || plan.tracks.length === 0) {
    throw new Error('Invalid plan: no tracks');
  }
  
  for (const track of plan.tracks) {
    const exists = library.some(t => t.id === track.id);
    if (!exists) {
      throw new Error('Invalid plan: track not found in library');
    }
  }
  
  return true;
}

function compactLibraryForPrompt(library) {
  return library.map(track => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    mode: track.mode,
    tags: track.tags,
    audioUrl: track.audioUrl,
    energy: track.energy,
    valence: track.valence,
    bpm: track.bpm,
    addedAt: track.addedAt,
    likedAt: track.likedAt,
    lastPlayedAt: track.lastPlayedAt,
    playCount: track.playCount,
    userNote: track.userNote,
    songBackground: track.songBackground,
    sourceType: track.sourceType
  }));
}

function hydratePlanTracks(plan, library) {
  const tracks = Array.isArray(plan.tracks) ? plan.tracks : [];
  return {
    ...plan,
    tracks: tracks.map(track => {
      const libraryTrack = library.find(item => item.id === track.id) || {};
      return {
        ...libraryTrack,
        ...track
      };
    })
  };
}

async function callMiniMaxJSON({ systemPrompt, userContent, timeoutMs = 12000, temperature = 0.7 }) {
  const apiKey = import.meta.env.VITE_MINIMAX_API_KEY;
  const endpoint = (import.meta.env.VITE_MINIMAX_CHAT_ENDPOINT || '/api/minimax/chat').trim().replace(/[`'"]/g, '');
  const baseUrl = (import.meta.env.VITE_MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1').trim().replace(/[`'"]/g, '');
  const model = import.meta.env.VITE_MINIMAX_MODEL || 'MiniMax-M2.7-highspeed';
  const usesLocalProxy = endpoint.startsWith('/');

  if (!usesLocalProxy && !apiKey) {
    throw new Error('MiniMax API key is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(usesLocalProxy ? endpoint : `${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: usesLocalProxy
        ? { 'Content-Type': 'application/json' }
        : {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Invalid MiniMax response');
    }

    return parseJSONSafely(content);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('MiniMax API request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateSearchPlanWithMiniMax(userInput) {
  const timeoutMs = Number(import.meta.env.VITE_MINIMAX_SEARCH_TIMEOUT_MS || 12000);
  const plan = await callMiniMaxJSON({
    systemPrompt: SEARCH_PLAN_SYSTEM_PROMPT,
    userContent: `用户输入：${userInput}`,
    timeoutMs,
    temperature: 0.45
  });

  const allowedModes = ['focus', 'calm', 'sleep', 'energy', 'nature'];
  const mode = allowedModes.includes(plan.mode) ? plan.mode : 'focus';
  const searchQueries = Array.isArray(plan.searchQueries)
    ? plan.searchQueries.map(query => String(query || '').trim()).filter(Boolean).slice(0, 5)
    : [];

  if (searchQueries.length === 0) {
    throw new Error('MiniMax search plan has no queries');
  }

  return {
    ...plan,
    mode,
    searchQueries
  };
}

export async function generateDJScriptWithMiniMax(userInput, searchPlan, selectedTracks) {
  const configuredTimeoutMs = Number(import.meta.env.VITE_MINIMAX_DJ_TIMEOUT_MS || import.meta.env.VITE_MINIMAX_TIMEOUT_MS || 30000);
  const timeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? Math.max(configuredTimeoutMs, 30000)
    : 30000;
  const compactTracks = selectedTracks.map(track => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    source: track.source,
    duration: track.duration,
    rawName: track.raw?.name,
    rawArtists: track.raw?.artists?.map(artist => artist.name).filter(Boolean),
    rawAlbum: track.raw?.album?.name
  }));

  const script = await callMiniMaxJSON({
    systemPrompt: DJ_SCRIPT_SYSTEM_PROMPT,
    userContent: JSON.stringify({
      userInput,
      searchPlan,
      selectedTracks: compactTracks
    }),
    timeoutMs,
    temperature: 0.65
  });

  return {
    openingLine: script.openingLine || '',
    reason: script.reason || '',
    tracks: Array.isArray(script.tracks) ? script.tracks : [],
    closingLine: script.closingLine || ''
  };
}

export async function generateDJPlanWithMiniMax(userInput, localAudioLibrary) {
  const apiKey = import.meta.env.VITE_MINIMAX_API_KEY;
  const baseUrl = (import.meta.env.VITE_MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1').trim().replace(/[`'"]/g, '');
  const model = import.meta.env.VITE_MINIMAX_MODEL || 'MiniMax-M2.7-highspeed';
  const timeoutMs = Number(import.meta.env.VITE_MINIMAX_TIMEOUT_MS || 25000);
  
  console.log('MiniMax API 调用参数:', { baseUrl, model, timeoutMs });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const libraryStr = JSON.stringify(compactLibraryForPrompt(localAudioLibrary));
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `用户输入：${userInput}\nlocalAudioLibrary：${libraryStr}`
          }
        ],
        temperature: 0.7
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('MiniMax 响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiniMax 错误响应:', errorText);
      throw new Error(`MiniMax API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('MiniMax 完整响应:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid MiniMax response');
    }
    
    const assistantContent = data.choices[0].message.content;
    console.log('MiniMax 内容:', assistantContent);
    
    const plan = hydratePlanTracks(parseJSONSafely(assistantContent), localAudioLibrary);
    
    validatePlan(plan, localAudioLibrary);
    
    return normalizeDJPlan(plan, {
      id: 'dj-minimax-' + Date.now(),
      highlights: ['MiniMax', 'AI', '私人 DJ']
    });
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('MiniMax API request timed out');
    }
    throw error;
  }
}
