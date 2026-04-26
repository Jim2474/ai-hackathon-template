import { localAudioLibrary } from '../data/localAudioLibrary';
import { generateDJPlanWithMiniMax } from './minimaxService';

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

export function generateDJPlan(userInput) {
  const mood = detectMood(userInput);
  const mode = detectMode(userInput);
  
  let tracks = [];
  
  if (localAudioLibrary && localAudioLibrary.length > 0) {
    let modeTracks = localAudioLibrary.filter(t => t.mode === mode);
    if (modeTracks.length < 3) {
      let extraTracks = localAudioLibrary.filter(t => t.mode === 'calm' || t.mode === 'nature');
      modeTracks = [...modeTracks, ...extraTracks];
    }
    
    modeTracks = shuffleArray(modeTracks);
    const numTracks = Math.min(5, Math.max(3, modeTracks.length));
    tracks = modeTracks.slice(0, numTracks).map((track, index) => ({
      ...track,
      phase: '默认',
      transition: `播放 ${track.title}`
    }));
  } else {
    tracks = [
      { id: 'fallback-1', title: 'Demo Track', artist: 'Moodwave', mode: mode, audioUrl: `/audio/${mode}-demo.mp3`, phase: '默认', transition: '播放 Demo Track' }
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
      openingLine: '听起来你现在想专注做点事情。没关系，我们先不硬冲，我会用低刺激的音乐帮你慢慢进入状态。',
      reason: '你现在需要集中注意力，但不想一开始就太紧张，所以我会避开太吵和歌词太强的歌，先用稳定、轻柔、低干扰的声音降低启动阻力。',
      phases: [
        { time: '0-10min', title: '进入状态' },
        { time: '10-70min', title: '稳定专注' },
        { time: '70-85min', title: '轻微提神' },
        { time: '85-90min', title: '柔和收尾' }
      ],
      tracks: tracks,
      transitions: [
        '第一首先轻一点，你只需要把书打开，让注意力慢慢回来。',
        '接下来我们进入稳定部分，我会减少人声干扰，让节奏待在后台。',
        '最后这段稍微收住，不让大脑突然掉线。'
      ],
      closingLine: '这一段结束了。你不需要立刻满血，但至少状态已经被拉回来了。',
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
      openingLine: '看起来你想放松下来睡个好觉。我会用越来越轻的声音帮你把一天的事放下。',
      reason: '睡前不需要刺激，需要的是安全感和呼吸节奏，所以我会选越来越安静、自然的声音，配合你的入睡过程。',
      phases: [
        { time: '0-10min', title: '放松身体' },
        { time: '10-25min', title: '引导呼吸' },
        { time: '25-30min', title: '准备入眠' }
      ],
      tracks: tracks,
      transitions: [
        '我们先从平缓的声音开始，让身体慢慢软下来。',
        '现在让呼吸跟着节奏走，你会越来越放松。',
        '最后只剩下一点点声音，不知不觉就能睡着了。'
      ],
      closingLine: '晚安。希望你能睡个安稳觉，明天醒来状态饱满。',
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
      openingLine: '我感觉到你现在想平静下来。没关系，我们一起把节奏慢下来，听点自然的声音。',
      reason: '焦虑的时候，我们需要的是确定感，所以我会选稳定、可预期的声音，让你感觉安全。',
      phases: [
        { time: '0-15min', title: '平静思绪' },
        { time: '15-35min', title: '感受宁静' },
        { time: '35-45min', title: '恢复状态' }
      ],
      tracks: tracks,
      transitions: [
        '先听点自然的声音，让心跳慢慢平稳下来。',
        '我们慢慢加入一些轻柔的旋律，让注意力回到当下。',
        '最后稍微动一动，准备回到现实，但感觉会好很多。'
      ],
      closingLine: '好一点了吗？记住，你不需要时刻完美，偶尔停下来是对的。',
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
      openingLine: '你想听听大自然的声音！我会为你准备一些能让你放松的环境音。',
      reason: '自然声音能让我们感到安全和放松，帮助减轻压力和焦虑。',
      phases: [
        { time: '0-10min', title: '沉浸自然' },
        { time: '10-30min', title: '深度放松' },
        { time: '30-40min', title: '慢慢回来' }
      ],
      tracks: tracks,
      transitions: [
        '先从森林的声音开始，让你仿佛置身于自然中。',
        '加入一些雨声，让整个氛围更舒适。',
        '最后声音慢慢变小，让你温柔地回到现实。'
      ],
      closingLine: '感觉怎么样？希望这段自然之声能让你放松下来。',
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
      openingLine: '准备动一动！我会选节奏刚好的歌，让你能跟上，但又不会太赶。',
      reason: '运动时需要动力，但太急反而容易累，所以我会让节奏慢慢起来，中间保持稳定，最后再慢慢收。',
      phases: [
        { time: '0-10min', title: '热身' },
        { time: '10-45min', title: '保持动力' },
        { time: '45-60min', title: '放松拉伸' }
      ],
      tracks: tracks,
      transitions: [
        '第一首先热个身，让身体慢慢醒过来。',
        '现在节奏上来了，保持住，你可以的！',
        '最后我们慢下来，好好拉伸，别伤了身体。'
      ],
      closingLine: '太棒了！你坚持下来了。记得喝口水，好好休息。',
      highlights: ['动力', '节奏', '坚持']
    };
  }
  
  return plan;
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
        ...generateDJPlan(userInput),
        source: "mock"
      };
    }
  }

  return {
    ...generateDJPlan(userInput),
    source: "mock"
  };
}

export default generateDJPlan;
