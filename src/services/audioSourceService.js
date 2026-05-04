import { localAudioLibrary } from '../data/localAudioLibrary';

const mockCustomTracks = [
  {
    id: 'custom-focus-air',
    title: 'Custom Focus Air',
    artist: 'Custom Source Demo',
    mode: 'focus',
    audioUrl: '/audio/focus-01.mp3',
    tags: ['focus', 'custom', 'demo'],
    energy: 0.44,
    valence: 0.6,
    bpm: 92,
    addedAt: '2026-02-12',
    likedAt: '2026-03-01',
    lastPlayedAt: '2026-04-21',
    playCount: 12,
    userNote: '自定义音源接口示例，用来验证外部曲库进入 Claudio 的流程。',
    songBackground: {
      mood: 'steady, soft, personal',
      texture: 'custom source / lofi / light beat',
      story: '这首示例音源模拟来自用户自定义曲库，声音稳定、边缘柔和，适合放在专注开头。',
      whyItFits: '节奏稳定，不会抢走注意力。'
    },
    source: 'Custom Source Demo',
    sourceType: 'custom',
    license: 'User-provided or custom-source demo',
    externalUrl: '',
    coverUrl: '',
    playable: true
  }
];

function normalizeSourceTrack(track, defaults = {}) {
  return {
    ...defaults,
    ...track,
    tags: Array.isArray(track.tags) ? track.tags : [],
    playable: track.playable !== false && Boolean(track.audioUrl),
    source: track.source || defaults.source || 'Unknown Source',
    sourceType: track.sourceType || defaults.sourceType || 'custom',
    license: track.license || defaults.license || '',
    externalUrl: track.externalUrl || '',
    coverUrl: track.coverUrl || ''
  };
}

export async function localAudioSource() {
  return localAudioLibrary.map(track => normalizeSourceTrack(track, {
    source: 'Local Demo',
    sourceType: 'local',
    playable: true
  }));
}

export async function customSourceAdapter() {
  const enableMock = import.meta.env.VITE_ENABLE_MOCK_CUSTOM_SOURCE === 'true';
  if (!enableMock) return [];

  return mockCustomTracks.map(track => normalizeSourceTrack(track, {
    source: 'Custom Source Demo',
    sourceType: 'custom',
    playable: true
  }));
}

export async function getPlayableLibrary() {
  const localTracks = await localAudioSource();
  let customTracks = [];

  try {
    customTracks = await customSourceAdapter();
  } catch (error) {
    console.warn('Custom audio source failed, using local library only:', error);
  }

  const merged = [...customTracks, ...localTracks];
  const playableTracks = merged.filter(track => track.playable && track.audioUrl);

  return playableTracks.length > 0 ? playableTracks : localTracks.filter(track => track.audioUrl);
}

export function getSourceLabel(track) {
  switch (track?.sourceType) {
    case 'netease':
      return 'NetEase';
    case 'custom':
      return 'Custom';
    case 'open':
      return 'Open';
    case 'local':
      return 'Local';
    default:
      return track?.source ? track.source : 'Local';
  }
}
