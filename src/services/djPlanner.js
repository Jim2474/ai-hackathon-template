import { localAudioLibrary } from '../data/localAudioLibrary';
import { generateDJPlanWithMiniMax } from './minimaxService';
import { normalizeDJPlan } from './planNormalizer';

function detectMood(userInput) {
  const lower = userInput.toLowerCase();
  if (lower.includes('困') || lower.includes('累') || lower.includes('想睡')) return 'tired';
  if (lower.includes('焦虑') || lower.includes('烦') || lower.includes('压力')) return 'anxious';
  if (lower.includes('困') || lower.includes('累') || lower.includes('疲劳')) return 'tired';
  if (lower.includes('睡') || lower.includes('晚安') || lower.includes('休息')) return 'sleepy';
  if (lower.includes('运动') || lower.includes('跑') || lower.includes('健身')) return 'energetic';
  if (lower.includes('学习') || lower.includes('工作') || lower.includes('专注')) return 'focus';
  return 'neutral';
}

function detectMode(userInput) {
  const lower = userInput.toLowerCase();
  if (lower.includes('睡觉') || lower.includes('睡前') || lower.includes('入眠') || lower.includes('晚安')) return 'sleep';
  if (lower.includes('运动') || lower.includes('健身') || lower.includes('提神') || lower.includes('燃')) return 'energy';
  if (lower.includes('焦虑') || lower.includes('烦') || lower.includes('压力') || lower.includes('放松') || lower.includes('安抚')) return 'calm';
  if (lower.includes('雨声') || lower.includes('白噪音') || lower.includes('自然声') || lower.includes('环境音')) return 'nature';
  return 'focus';
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function buildMockSongStory(track, mode, index) {
  const title = track.title || `Track ${index + 1}`;
  const background = track.songBackground || {};
  const listened = track.playCount ? `你之前听过它 ${track.playCount} 次，` : '';

  const presets = {
    focus: {
      intro: `现在这首是 ${title}。${background.story || '它的节奏稳定，声音不会太靠前。'} 我把它放在这里，是想先帮你把注意力慢慢收回来。`,
      reason: `${listened}${background.whyItFits || '它适合做低干扰的学习背景。'}`,
      in: `我先把 ${title} 放低一点，让桌面上的事情变得没那么难开始。`,
      out: '下一首我会继续保持稳定，不突然打断你的思路。'
    },
    calm: {
      intro: `现在这首是 ${title}。${background.story || '它的声音比较柔和，像一层不打扰人的背景。'} 先不用急着把情绪整理好，我们让它慢慢托住你。`,
      reason: `${listened}${background.whyItFits || '它适合在情绪紧的时候先把心跳放慢。'}`,
      in: `我先让 ${title} 进来，声音会轻一点。`,
      out: '接下来我会换成更松一点的声音，让这个缓下来的状态继续。'
    },
    sleep: {
      intro: `现在这首是 ${title}。${background.story || '它很慢，也留了很多空白。'} 我把它放在这里，是想让你的思绪不用再往前赶。`,
      reason: `${listened}${background.whyItFits || '它适合睡前降速，不会重新拉高注意力。'}`,
      in: `我先把 ${title} 放得很轻，你只要听见一点点就好。`,
      out: '下一首会更轻一点，让睡意自然接上。'
    },
    energy: {
      intro: `现在这首是 ${title}。${background.story || '它的节奏更靠前，能把身体轻轻叫醒。'} 我不会一下子推太猛，先让你慢慢热起来。`,
      reason: `${listened}${background.whyItFits || '它适合提神和启动身体。'}`,
      in: `我先用 ${title} 把节奏带起来一点。`,
      out: '下一首会继续往前走，但还是保持可控。'
    },
    nature: {
      intro: `现在这首是 ${title}。${background.story || '它有一点空间感，像把房间慢慢打开。'} 你可以先不用想太多，让呼吸跟着声音走。`,
      reason: `${listened}${background.whyItFits || '它适合离开屏幕、放松呼吸。'}`,
      in: `我先放一点 ${title}，让周围安静下来。`,
      out: '下一首我会继续保留这种空间感。'
    }
  };

  const preset = presets[mode] || presets.focus;

  return {
    songIntro: track.songIntro || preset.intro,
    personalReason: track.personalReason || preset.reason,
    transitionIn: track.transitionIn || preset.in,
    transitionOut: track.transitionOut || preset.out
  };
}

export function generateDJPlan(userInput, library = localAudioLibrary) {
  const mood = detectMood(userInput);
  const mode = detectMode(userInput);
  
  let tracks = [];
  
  if (library && library.length > 0) {
    let modeTracks = library.filter(t => t.mode === mode);
    if (modeTracks.length < 3) {
      let extraTracks = library.filter(t => t.mode === 'calm' || t.mode === 'nature');
      modeTracks = [...modeTracks, ...extraTracks];
    }
    
    modeTracks = shuffleArray(modeTracks);
    const numTracks = Math.min(5, Math.max(3, modeTracks.length));
    tracks = modeTracks.slice(0, numTracks).map((track, index) => {
      const story = buildMockSongStory(track, mode, index);
      return {
        ...track,
        phase: '默认',
        ...story,
        transition: story.transitionIn
      };
    });
  } else {
    tracks = [
      { id: 'fallback-1', title: 'Demo Track', artist: 'Claudio', mode: mode, audioUrl: `/audio/${mode}-demo.mp3`, phase: '默认', transition: '播放 Demo Track' }
    ];
  }
  
  let plan;
  
  if (mode === 'focus') {
    plan = {
      id: 'dj-focus-' + Date.now(),
      mode: 'focus',
      title: 'Deep Focus Wave',
      subtitle: '90min · Study Focus · Lofi Ambient',
      duration: 90,
      mood: mood,
      openingLine: '音乐先小声放着。我知道你是想进入学习状态，但我们不用一下子绷紧。先让这几分钟帮你把注意力慢慢收回来。',
      reason: '我会先选低刺激、节奏稳定的声音。它不会抢你的思路，只是在后面轻轻托住你。',
      phases: [
        { time: '0-10min', title: '进入状态' },
        { time: '10-70min', title: '稳定专注' },
        { time: '70-85min', title: '轻微提神' },
        { time: '85-90min', title: '柔和收尾' }
      ],
      tracks: tracks,
      transitions: [
        '这一首轻一点，先把呼吸放稳，再把注意力放回桌面。',
        '状态起来了，我让节奏继续在后面托着你，不打断你。',
        '最后慢慢收住，不用一下子停下来。'
      ],
      closingLine: '好了，这一段先到这里。你已经往前走了一点。',
      highlights: ['低刺激', '专注', '注意力', '节奏']
    };
  } else if (mode === 'sleep') {
    plan = {
      id: 'dj-sleep-' + Date.now(),
      mode: 'sleep',
      title: 'Night Relax Station',
      subtitle: '30min · Sleep · Soft Ambient',
      duration: 30,
      mood: mood,
      openingLine: '灯可以暗一点了。今天先放过自己，不用再把所有事都想完。音乐会放得很轻，我们慢慢安静下来。',
      reason: '睡前不需要被提醒太多。稳定、轻一点的声音，会更适合陪你把白天放远。',
      phases: [
        { time: '0-10min', title: '放松身体' },
        { time: '10-25min', title: '引导呼吸' },
        { time: '25-30min', title: '准备入眠' }
      ],
      tracks: tracks,
      transitions: [
        '先让身体慢下来，别急着睡着。',
        '呼吸跟着声音走就好，我会把节奏继续放轻。',
        '最后留一点很轻的声音，陪你入睡。'
      ],
      closingLine: '晚安。剩下的事，明天再说。',
      highlights: ['放松', '呼吸', '自然']
    };
  } else if (mode === 'calm') {
    plan = {
      id: 'dj-calm-' + Date.now(),
      mode: 'calm',
      title: 'Peaceful Mind',
      subtitle: '45min · Calm · Nature Sounds',
      duration: 45,
      mood: mood,
      openingLine: '先别急着处理所有事。你可以就坐在这里，让音乐先替你挡一下外面的声音。我们把心跳放慢一点。',
      reason: '我会选稳定、可预期的声音。不是为了让你马上振作，只是先让注意力慢慢落回当下。',
      phases: [
        { time: '0-15min', title: '平静思绪' },
        { time: '15-35min', title: '感受宁静' },
        { time: '35-45min', title: '恢复状态' }
      ],
      tracks: tracks,
      transitions: [
        '先让心跳慢一点，这首不用你用力听。',
        '这段旋律很轻，我想把注意力慢慢带回来。',
        '快结束了，我们慢慢回到房间里。'
      ],
      closingLine: '你不用一直撑着。停一下也可以。',
      highlights: ['平静', '自然', '安全']
    };
  } else if (mode === 'nature') {
    plan = {
      id: 'dj-nature-' + Date.now(),
      mode: 'nature',
      title: 'Nature Ambience',
      subtitle: '40min · Nature · Environmental Sounds',
      duration: 40,
      mood: mood,
      openingLine: '那就先离开屏幕一小会儿。我们去听一点风和雨，让房间变得远一点。你不用说很多，先待在这个声音里。',
      reason: '自然声不催你做什么。它只是把空间慢慢打开，让你有一点喘气的地方。',
      phases: [
        { time: '0-10min', title: '沉浸自然' },
        { time: '10-30min', title: '深度放松' },
        { time: '30-40min', title: '慢慢回来' }
      ],
      tracks: tracks,
      transitions: [
        '先听一点远处的自然声，让注意力松开一点。',
        '雨声进来了，空间会软一点，你可以慢一点呼吸。',
        '最后把声音放远，慢慢回来。'
      ],
      closingLine: '好了，先在这片安静里待一会儿。',
      highlights: ['自然', '放松', '环境']
    };
  } else { // energy
    plan = {
      id: 'dj-energy-' + Date.now(),
      mode: 'energy',
      title: 'Energy Boost Mix',
      subtitle: '60min · Workout · Rhythmic Beats',
      duration: 60,
      mood: mood,
      openingLine: '先让节奏轻轻起来。你不用一开始就很有状态，身体会慢慢跟上的。我先给你一点不刺耳的推动力。',
      reason: '我会让音乐慢慢加一点力。不一上来就把你推太快，先让身体自己醒过来。',
      phases: [
        { time: '0-10min', title: '热身' },
        { time: '10-45min', title: '保持动力' },
        { time: '45-60min', title: '放松拉伸' }
      ],
      tracks: tracks,
      transitions: [
        '先热起来，不用抢拍，让身体自己找到节奏。',
        '节奏上来了，跟住就好，我会继续往前推一点。',
        '最后慢下来，把身体还给呼吸。'
      ],
      closingLine: '很好，先喝口水。今晚的能量已经到了。',
      highlights: ['动力', '节奏', '坚持']
    };
  }
  
  return normalizeDJPlan(plan);
}

export async function generateSmartDJPlan(userInput, localAudioLibrary) {
  const useMiniMax = import.meta.env.VITE_USE_MINIMAX === "true";
  const hasKey = !!import.meta.env.VITE_MINIMAX_API_KEY;
  
  console.log('环境变量检查:', { 
    useMiniMax, 
    hasKey,
    VITE_USE_MINIMAX: import.meta.env.VITE_USE_MINIMAX,
    VITE_MINIMAX_API_KEY: import.meta.env.VITE_MINIMAX_API_KEY ? '已设置' : '未设置'
  });

  if (useMiniMax && hasKey) {
    try {
      const plan = await generateDJPlanWithMiniMax(userInput, localAudioLibrary);
      return {
        ...plan,
        source: "minimax"
      };
    } catch (error) {
      console.warn("MiniMax failed, fallback to mock:", error);
      return {
        ...generateDJPlan(userInput, localAudioLibrary),
        source: "mock"
      };
    }
  }

  return {
    ...generateDJPlan(userInput, localAudioLibrary),
    source: "mock"
  };
}

export default generateDJPlan;
