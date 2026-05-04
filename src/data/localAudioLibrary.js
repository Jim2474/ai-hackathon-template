const baseLocalAudioLibrary = [
  {
    id: "focus-01",
    title: "Focus 01",
    artist: "Local Demo Audio",
    mode: "focus",
    audioUrl: "/audio/focus-01.mp3",
    tags: ["focus", "study", "hiphop"],
    energy: 0.48,
    valence: 0.62,
    vocal: true,
    bpm: 95
  },
  {
    id: "focus-02",
    title: "Focus 02",
    artist: "Local Demo Audio",
    mode: "focus",
    audioUrl: "/audio/focus-02.mp3",
    tags: ["focus", "instrumental", "playful"],
    energy: 0.42,
    valence: 0.58,
    vocal: false,
    bpm: 88
  },
  {
    id: "calm-01",
    title: "Calm 01",
    artist: "Local Demo Audio",
    mode: "calm",
    audioUrl: "/audio/calm-01.mp3",
    tags: ["calm", "relax", "playful"],
    energy: 0.35,
    valence: 0.52,
    vocal: false,
    bpm: 75
  },
  {
    id: "calm-02",
    title: "Calm 02",
    artist: "Local Demo Audio",
    mode: "calm",
    audioUrl: "/audio/calm-02.mp3",
    tags: ["calm", "dramatic", "instrumental"],
    energy: 0.38,
    valence: 0.45,
    vocal: false,
    bpm: 80
  },
  {
    id: "sleep-01",
    title: "Sleep 01",
    artist: "Local Demo Audio",
    mode: "sleep",
    audioUrl: "/audio/sleep-01.mp3",
    tags: ["sleep", "meditation", "low"],
    energy: 0.22,
    valence: 0.38,
    vocal: false,
    bpm: 65
  },
  {
    id: "energy-01",
    title: "Energy 01",
    artist: "Local Demo Audio",
    mode: "energy",
    audioUrl: "/audio/energy-01.mp3",
    tags: ["energy", "sport", "action"],
    energy: 0.82,
    valence: 0.68,
    vocal: false,
    bpm: 130
  },
  {
    id: "energy-02",
    title: "Energy 02",
    artist: "Local Demo Audio",
    mode: "energy",
    audioUrl: "/audio/energy-02.mp3",
    tags: ["energy", "percussion", "powerful"],
    energy: 0.78,
    valence: 0.65,
    vocal: false,
    bpm: 125
  },
  {
    id: "energy-03",
    title: "Energy 03",
    artist: "Local Demo Audio",
    mode: "energy",
    audioUrl: "/audio/energy-03.mp3",
    tags: ["energy", "percussion", "powerful"],
    energy: 0.76,
    valence: 0.63,
    vocal: false,
    bpm: 122
  },
  {
    id: "energy-04",
    title: "Energy 04",
    artist: "Local Demo Audio",
    mode: "energy",
    audioUrl: "/audio/energy-04.mp3",
    tags: ["energy", "rock", "sport"],
    energy: 0.88,
    valence: 0.72,
    vocal: false,
    bpm: 138
  },
  {
    id: "nature-01",
    title: "Nature 01",
    artist: "Local Demo Audio",
    mode: "nature",
    audioUrl: "/audio/nature-01.mp3",
    tags: ["nature", "percussion", "ambient"],
    energy: 0.25,
    valence: 0.42,
    vocal: false,
    bpm: 0
  },
  {
    id: "nature-02",
    title: "Nature 02",
    artist: "Local Demo Audio",
    mode: "nature",
    audioUrl: "/audio/nature-02.mp3",
    tags: ["nature", "percussion", "ambient"],
    energy: 0.23,
    valence: 0.40,
    vocal: false,
    bpm: 0
  }
];

const modeBackgrounds = {
  focus: {
    mood: "steady, low distraction, focused",
    texture: "lofi / light beat / soft electronic",
    story: "这类声音以稳定节奏和低干扰铺底为主，适合学习、写作或需要慢慢进入状态的场景。",
    whyItFits: "节奏稳定、情绪不过度起伏，不会频繁打断思路。"
  },
  calm: {
    mood: "soft, reassuring, low energy",
    texture: "soft keys / warm ambience / gentle rhythm",
    story: "这类声音更像一层柔和的背景，不急着推进情绪，适合焦虑或压力较高时慢慢缓下来。",
    whyItFits: "能量较低、声音边缘柔和，可以先把情绪接住。"
  },
  sleep: {
    mood: "slow, quiet, minimal",
    texture: "ambient / meditation / low pulse",
    story: "这类声音以慢速和留白为主，适合作为睡前或夜晚放松的背景。",
    whyItFits: "速度慢、低刺激，不会把注意力重新拉得太紧。"
  },
  energy: {
    mood: "bright, rhythmic, forward",
    texture: "percussion / sport beat / rock pulse",
    story: "这类声音有更明确的节奏推动感，适合运动、提神或需要启动身体的时候。",
    whyItFits: "节奏更靠前，能量更高，但仍然保持可控，不会过度吵闹。"
  },
  nature: {
    mood: "open, airy, grounding",
    texture: "nature / ambience / environmental sound",
    story: "这类声音更强调空间感和环境感，适合离开屏幕、放松呼吸或做轻度背景声。",
    whyItFits: "没有强旋律压力，能给注意力留出一点空间。"
  }
};

const userNotes = {
  focus: "适合低阻力启动学习时使用。",
  calm: "适合情绪需要慢慢放稳的时候。",
  sleep: "适合睡前把声音放得很轻。",
  energy: "适合不想太吵但需要提神的时候。",
  nature: "适合想离开屏幕、听一点空间感的时候。"
};

function enrichTrack(track, index) {
  const mode = track.mode || "focus";
  const day = String(10 + index).padStart(2, "0");

  return {
    ...track,
    addedAt: `2025-12-${day}`,
    likedAt: index % 2 === 0 ? `2026-01-${String(5 + index).padStart(2, "0")}` : undefined,
    lastPlayedAt: `2026-04-${String(8 + index).padStart(2, "0")}`,
    playCount: 6 + index * 3,
    userNote: userNotes[mode] || "适合需要一点声音陪伴的时候。",
    songBackground: modeBackgrounds[mode] || modeBackgrounds.focus,
    source: "Local Demo",
    sourceType: "local",
    license: "Demo audio for hackathon use",
    externalUrl: "",
    coverUrl: "",
    playable: true
  };
}

export const localAudioLibrary = baseLocalAudioLibrary.map(enrichTrack);
