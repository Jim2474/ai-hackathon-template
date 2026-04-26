const focusSongs = [
  {
    id: 'f1',
    title: 'Soft Morning',
    artist: 'Ambient Works',
    album: 'Apple Music Library',
    duration: '4:23',
    phase: '进入状态'
  },
  {
    id: 'f2',
    title: 'Quiet Loop',
    artist: 'Study Beats',
    album: 'Apple Music Library',
    duration: '3:58',
    phase: '稳定专注'
  },
  {
    id: 'f3',
    title: 'Light Pulse',
    artist: 'Deep Focus',
    album: 'Apple Music Library',
    duration: '5:12',
    phase: '轻微提神'
  },
  {
    id: 'f4',
    title: 'Calm Afternoon',
    artist: 'Lo-Fi Station',
    album: 'Apple Music Library',
    duration: '4:05',
    phase: '稳定专注'
  },
  {
    id: 'f5',
    title: 'Soft Landing',
    artist: 'Chill Wave',
    album: 'Apple Music Library',
    duration: '3:41',
    phase: '柔和收尾'
  }
];

const sleepSongs = [
  {
    id: 's1',
    title: 'Ocean Breeze',
    artist: 'Nature Sounds',
    album: 'Apple Music Library',
    duration: '5:02',
    phase: '放松身体'
  },
  {
    id: 's2',
    title: 'Rainy Night',
    artist: 'Sleep Waves',
    album: 'Apple Music Library',
    duration: '4:35',
    phase: '引导呼吸'
  },
  {
    id: 's3',
    title: 'Distant Stars',
    artist: 'Ambient Dreams',
    album: 'Apple Music Library',
    duration: '5:48',
    phase: '准备入眠'
  },
  {
    id: 's4',
    title: 'Fade Away',
    artist: 'White Noise Lab',
    album: 'Apple Music Library',
    duration: '3:56',
    phase: '进入睡眠'
  }
];

const calmSongs = [
  {
    id: 'c1',
    title: 'Forest Walk',
    artist: 'Nature Scenes',
    album: 'Apple Music Library',
    duration: '4:22',
    phase: '平静思绪'
  },
  {
    id: 'c2',
    title: 'Inner Peace',
    artist: 'Meditation Music',
    album: 'Apple Music Library',
    duration: '4:50',
    phase: '感受宁静'
  },
  {
    id: 'c3',
    title: 'Soft Breeze',
    artist: 'Chill Beats',
    album: 'Apple Music Library',
    duration: '4:01',
    phase: '恢复状态'
  }
];

const workoutSongs = [
  {
    id: 'w1',
    title: 'Get Ready',
    artist: 'Energy Beats',
    album: 'Apple Music Library',
    duration: '3:42',
    phase: '热身'
  },
  {
    id: 'w2',
    title: 'Power Up',
    artist: 'Workout Station',
    album: 'Apple Music Library',
    duration: '4:11',
    phase: '运动'
  },
  {
    id: 'w3',
    title: 'Keep Going',
    artist: 'Motivation Mix',
    album: 'Apple Music Library',
    duration: '4:35',
    phase: '保持动力'
  },
  {
    id: 'w4',
    title: 'Cool Down',
    artist: 'Stretch Beats',
    album: 'Apple Music Library',
    duration: '3:58',
    phase: '放松'
  }
];

export function getMockSongs(mode) {
  switch (mode) {
    case 'focus':
      return focusSongs;
    case 'sleep':
      return sleepSongs;
    case 'calm':
      return calmSongs;
    case 'workout':
      return workoutSongs;
    default:
      return [...focusSongs, ...sleepSongs, ...calmSongs, ...workoutSongs];
  }
}

export default {
  focusSongs,
  sleepSongs,
  calmSongs,
  workoutSongs
};
