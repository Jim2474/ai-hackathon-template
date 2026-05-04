import { localAudioLibrary } from '../data/localAudioLibrary';
import { generateDJPlan } from './djPlanner';
import { generateDJScriptWithMiniMax, generateSearchPlanWithMiniMax } from './minimaxService';
import { buildNeteasePlaylist } from './neteaseService';

const defaultPlans = {
  focus: {
    title: '低阻力学习电台',
    subtitle: '90min · Focus · Light Instrumental',
    searchQueries: ['学习 纯音乐', '专注 轻音乐', 'lofi 学习'],
    energyCurve: 'low_to_mid',
    avoid: ['强人声', '高刺激', '过快节奏'],
    openingIntent: '先降低启动阻力，再逐渐进入专注。'
  },
  calm: {
    title: '情绪缓冲电台',
    subtitle: '45min · Calm · Soft Piano',
    searchQueries: ['治愈 轻音乐', '放松 钢琴', '安静 纯音乐'],
    energyCurve: 'low_stable',
    avoid: ['强节奏', '过亮人声', '压迫感'],
    openingIntent: '先把情绪接住，再慢慢放松。'
  },
  sleep: {
    title: '睡前降速电台',
    subtitle: '30min · Sleep · Gentle Ambient',
    searchQueries: ['睡前轻音乐', '助眠纯音乐', '自然声 放松'],
    energyCurve: 'low_to_lower',
    avoid: ['鼓点明显', '高刺激', '强人声'],
    openingIntent: '让白天慢慢退后，声音越来越轻。'
  },
  energy: {
    title: '有活力一点电台',
    subtitle: '45min · Energy · Bright Rhythm',
    searchQueries: ['活力 节奏', '动感 音乐', '提神 音乐', '电子 运动', '燃 音乐'],
    energyCurve: 'mid_to_high',
    avoid: ['太慢', '太散', '压抑'],
    openingIntent: '先把身体叫醒，再慢慢加一点推动力。'
  },
  nature: {
    title: '自然呼吸电台',
    subtitle: '40min · Nature · Ambient',
    searchQueries: ['雨声', '白噪音', '自然声'],
    energyCurve: 'low_open',
    avoid: ['强旋律', '强人声', '密集鼓点'],
    openingIntent: '把空间打开一点，让注意力慢慢松下来。'
  }
};

function detectMode(userInput) {
  const text = userInput.toLowerCase();
  if (text.includes('睡') || text.includes('晚安') || text.includes('入眠')) return 'sleep';
  if (text.includes('焦虑') || text.includes('烦') || text.includes('压力') || text.includes('放松') || text.includes('安抚')) return 'calm';
  if (
    text.includes('运动') ||
    text.includes('健身') ||
    text.includes('提神') ||
    text.includes('燃') ||
    text.includes('活力') ||
    text.includes('精神') ||
    text.includes('嗨') ||
    text.includes('带劲') ||
    text.includes('动感')
  ) return 'energy';
  if (text.includes('雨声') || text.includes('白噪音') || text.includes('自然声') || text.includes('环境音')) return 'nature';
  return 'focus';
}

function canUseMiniMax() {
  return import.meta.env.VITE_USE_MINIMAX === 'true' && Boolean(import.meta.env.VITE_MINIMAX_API_KEY);
}

function getShortErrorMessage(error) {
  const message = error?.message || 'unknown error';
  if (message.includes('timed out')) return 'request timed out';
  if (message.includes('Failed to parse JSON')) return 'invalid JSON response';
  if (message.includes('401') || message.includes('403')) return 'API key or permission error';
  if (message.includes('429')) return 'rate limited';
  if (message.includes('500') || message.includes('502') || message.includes('503')) return 'MiniMax service error';
  return message.slice(0, 80);
}

function createFallbackSearchPlan(userInput) {
  const mode = detectMode(userInput);
  return {
    mode,
    ...defaultPlans[mode]
  };
}

function createFallbackDJScript(userInput, searchPlan, tracks) {
  const modeText = {
    focus: '你现在需要的是一段低阻力的开始。',
    calm: '我们先不急着解决所有事，先让声音把情绪接住。',
    sleep: '现在可以慢一点了，让白天慢慢退后。',
    energy: '先让节奏轻轻起来，身体会慢慢跟上。',
    nature: '我先放一点有空间感的声音，让周围安静下来。'
  }[searchPlan.mode] || '我先帮你放一段适合此刻的声音。';

  const fitText = {
    focus: '它的存在感不会太抢，适合先铺在背景里，让注意力慢慢靠回来。',
    calm: '它更适合把情绪先放稳，不急着把你推向任何地方。',
    sleep: '它适合睡前慢慢降速，让声音把边界放柔一点。',
    energy: '它会把节奏往前推一点，让身体先被轻轻叫醒。',
    nature: '它留出的空间比较多，适合让呼吸和注意力都松一点。'
  }[searchPlan.mode] || '它放在这里，是为了先贴住你现在的状态。';

  const makeSongIntro = (track, index) => {
    const artistText = track.artist ? `${track.artist} 的` : '';
    const albumText = track.album ? `，来自《${track.album}》` : '';
    const positionText = index === 0
      ? '我把它放在开头，是想先把房间的气氛调好。'
      : index === tracks.length - 1
        ? '放在最后，是想让这段电台慢慢收住。'
        : '放在这一段，是想让能量继续稳定往前走。';

    return `接下来这首是 ${artistText}《${track.title}》${albumText}。${fitText} ${positionText}`;
  };

  return {
    openingLine: `${modeText} 音乐先放轻一点，我会陪你慢慢进入状态。`,
    reason: searchPlan.openingIntent || '这几首会先做背景，不抢走你的注意力。',
    tracks: tracks.map((track, index) => ({
      id: track.id,
      phase: index === 0 ? '进入状态' : index === tracks.length - 1 ? '柔和收尾' : '稳定推进',
      songIntro: makeSongIntro(track, index),
      transition: index === tracks.length - 1 ? '最后慢慢收住，不用一下子停下来。' : '下一首我会继续沿着这个方向走。'
    })),
    closingLine: '这一段就到这里。接下来你只需要跟着音乐往前走。'
  };
}

function applyDJScript(tracks, script) {
  const scriptById = new Map((script.tracks || []).map(item => [item.id, item]));

  return tracks.map((track, index) => {
    const item = scriptById.get(track.id) || {};
    const phase = item.phase || track.phase || (index === 0 ? '进入状态' : '稳定推进');
    const songIntro = item.songIntro || track.songIntro || `这首是 ${track.title}。它会先做一层稳定的背景。`;
    const transition = item.transition || track.transition || '下一首我会继续保持这个状态。';

    return {
      ...track,
      phase,
      songIntro,
      personalReason: track.personalReason || '',
      transition,
      transitionIn: track.transitionIn || transition,
      transitionOut: track.transitionOut || transition
    };
  });
}

function normalizeLocalTrack(track) {
  return {
    ...track,
    album: track.album || 'Local Demo',
    source: 'local',
    sourceType: 'local',
    duration: track.duration || 0
  };
}

export function createLocalFallbackSession(userInput, reasonMessage = '') {
  const plan = generateDJPlan(userInput, localAudioLibrary);
  const tracks = (plan.tracks || []).map(normalizeLocalTrack);

  return {
    ...plan,
    sessionId: `session-local-${Date.now()}`,
    source: 'mock+local',
    searchPlanSource: 'mock',
    djSource: 'mock',
    sourceType: 'local',
    tracks,
    chatMessages: [
      ...(reasonMessage ? [{ type: 'system', text: reasonMessage }] : []),
      { type: 'system', text: `Found ${tracks.length} tracks · Local library fallback` }
    ],
    searchPlan: createFallbackSearchPlan(userInput)
  };
}

export async function createMoodwaveSession(userInput) {
  let searchPlan = createFallbackSearchPlan(userInput);
  let searchPlanSource = 'mock';

  if (canUseMiniMax()) {
    try {
      searchPlan = await generateSearchPlanWithMiniMax(userInput);
      searchPlanSource = 'minimax';
    } catch (error) {
      console.warn('MiniMax search plan failed, using fallback search plan:', error);
    }
  }

  let neteaseTracks;
  try {
    neteaseTracks = await buildNeteasePlaylist(searchPlan.searchQueries, {
      targetCount: 3,
      maxTracks: 5,
      searchLimit: 8
    });
  } catch (error) {
    console.warn('NetEase playlist failed, switching to local library:', error);
    return createLocalFallbackSession(userInput, 'NetEase unavailable, switching to local library.');
  }

  let djScript;
  let djSource = 'mock';
  let djStatusMessage = 'Using local DJ fallback.';
  if (canUseMiniMax()) {
    try {
      djScript = await generateDJScriptWithMiniMax(userInput, searchPlan, neteaseTracks);
      djSource = 'minimax';
      djStatusMessage = 'MiniMax DJ generated the intro and track notes.';
    } catch (error) {
      console.warn('MiniMax DJ script failed, using fallback DJ script:', error);
      djStatusMessage = `MiniMax DJ failed (${getShortErrorMessage(error)}), using local DJ fallback.`;
    }
  } else {
    djStatusMessage = 'MiniMax DJ is not enabled, using local DJ fallback.';
  }

  if (!djScript) {
    djScript = createFallbackDJScript(userInput, searchPlan, neteaseTracks);
  }

  const tracks = applyDJScript(neteaseTracks, djScript);

  return {
    sessionId: `session-netease-${Date.now()}`,
    id: `session-netease-${Date.now()}`,
    source: `${djSource === 'minimax' ? 'minimax' : 'mock'}+netease`,
    searchPlanSource,
    djSource,
    sourceType: 'netease',
    mode: searchPlan.mode,
    title: searchPlan.title || defaultPlans[searchPlan.mode]?.title || 'Moodwave Radio',
    subtitle: searchPlan.subtitle || defaultPlans[searchPlan.mode]?.subtitle || 'AI DJ · NetEase',
    openingLine: djScript.openingLine,
    reason: djScript.reason,
    tracks,
    transitions: tracks.map(track => track.transition).filter(Boolean),
    closingLine: djScript.closingLine,
    phases: tracks.map((track, index) => ({
      time: `${index * 10}-${(index + 1) * 10}min`,
      title: track.phase
    })),
    highlights: ['网易云', '私人电台', '低音量', '状态'],
    chatMessages: [
      { type: 'system', text: 'Searching NetEase...' },
      { type: 'system', text: `Found ${tracks.length} tracks · NetEase Cloud Music` },
      { type: 'system', text: djStatusMessage }
    ],
    searchPlan
  };
}
