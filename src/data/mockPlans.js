const plans = [
  {
    id: 'focus-1',
    mode: 'focus',
    title: 'Deep Focus Wave',
    subtitle: '90min · Study Focus · Lofi Ambient',
    duration: 90,
    durationText: '01:30:00',
    segments: [
      { time: '0:00', text: '我会先用低刺激音乐帮你进入状态。', active: true },
      { time: '0:10', text: '前 10 分钟，我们只让注意力慢慢回来。', active: true },
      { time: '10:00', text: '现在进入稳定专注阶段，减少歌词干扰。', active: false },
      { time: '45:00', text: '中段保持稳定节奏，避免疲劳感上来。', active: false },
      { time: '80:00', text: '最后 10 分钟，让状态慢慢回落。', active: false }
    ],
    highlights: ['低刺激', '专注', '注意力', '节奏']
  },
  {
    id: 'sleep-1',
    mode: 'sleep',
    title: 'Night Relax Station',
    subtitle: '30min · Sleep · Soft Ambient',
    duration: 30,
    durationText: '00:30:00',
    segments: [
      { time: '0:00', text: '我们从柔和的海浪声开始。', active: true },
      { time: '5:00', text: '加入雨声，慢慢引导呼吸。', active: false },
      { time: '15:00', text: '音量渐渐降低，准备入眠。', active: false },
      { time: '25:00', text: '最后只剩下轻微的白噪音。', active: false }
    ],
    highlights: ['放松', '入眠', '呼吸']
  },
  {
    id: 'calm-1',
    mode: 'calm',
    title: 'Peaceful Mind',
    subtitle: '45min · Calm · Nature Sounds',
    duration: 45,
    durationText: '00:45:00',
    segments: [
      { time: '0:00', text: '先让你的思绪慢慢停下来。', active: true },
      { time: '10:00', text: '加入森林声音，感受自然的宁静。', active: false },
      { time: '30:00', text: '过渡到冥想音乐，让内心更平静。', active: false }
    ],
    highlights: ['平静', '自然', '冥想']
  },
  {
    id: 'workout-1',
    mode: 'workout',
    title: 'Energy Boost Mix',
    subtitle: '60min · Workout · Rhythmic Beats',
    duration: 60,
    durationText: '01:00:00',
    segments: [
      { time: '0:00', text: '热身阶段，节奏慢慢起来。', active: true },
      { time: '10:00', text: '进入运动状态，保持动力。', active: false },
      { time: '45:00', text: '渐渐减速，准备拉伸放松。', active: false }
    ],
    highlights: ['节奏', '动力', '运动']
  }
]

export function generatePlan(input) {
  const randomIndex = Math.floor(Math.random() * plans.length)
  return plans[randomIndex]
}

export default plans
