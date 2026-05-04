import { getSongUrl, searchSongs } from './neteaseApi';

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_TARGET_COUNT = 3;
const DEFAULT_MAX_TRACKS = 5;

function withTimeout(promise, timeoutMs = DEFAULT_TIMEOUT_MS, label = 'NetEase request') {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function normalizeNeteaseSong(song) {
  return {
    id: `netease-${song.id}`,
    neteaseId: song.id,
    title: song.name,
    artist: song.artistsText,
    album: song.albumName,
    duration: Math.round((song.duration || 0) / 1000),
    source: 'netease',
    sourceType: 'netease',
    audioUrl: null,
    coverUrl: song.raw?.album?.picUrl || song.raw?.al?.picUrl || '',
    raw: song.raw || song
  };
}

export async function searchNeteaseSongs(query, limit = 10) {
  const songs = await withTimeout(
    searchSongs(query, { limit }),
    DEFAULT_TIMEOUT_MS,
    `NetEase search "${query}"`
  );

  return songs.map(normalizeNeteaseSong);
}

export async function getNeteaseSongUrl(songId) {
  const cleanId = String(songId || '').replace(/^netease-/, '');
  if (!cleanId) return null;

  try {
    const result = await withTimeout(
      getSongUrl(cleanId, { br: 320000 }),
      DEFAULT_TIMEOUT_MS,
      `NetEase song url "${cleanId}"`
    );
    return result?.playable ? result.url : null;
  } catch (error) {
    console.warn('NetEase song url failed:', error);
    return null;
  }
}

export async function buildNeteasePlaylist(searchQueries, options = {}) {
  const targetCount = options.targetCount || DEFAULT_TARGET_COUNT;
  const maxTracks = options.maxTracks || DEFAULT_MAX_TRACKS;
  const searchLimit = options.searchLimit || 8;
  const queries = Array.isArray(searchQueries)
    ? searchQueries.map(query => String(query || '').trim()).filter(Boolean)
    : [];

  if (queries.length === 0) {
    throw new Error('No NetEase search queries');
  }

  const selected = [];
  const seenIds = new Set();

  for (const query of queries) {
    if (selected.length >= targetCount) break;

    const candidates = await searchNeteaseSongs(query, searchLimit);
    for (const candidate of candidates) {
      if (selected.length >= maxTracks) break;
      if (seenIds.has(candidate.neteaseId)) continue;
      seenIds.add(candidate.neteaseId);

      const audioUrl = await getNeteaseSongUrl(candidate.neteaseId);
      if (!audioUrl) continue;

      selected.push({
        ...candidate,
        audioUrl,
        phase: candidate.phase || '进入状态',
        transition: candidate.transition || `接下来我会把 ${candidate.title} 接进来。`
      });

      if (selected.length >= targetCount) break;
    }
  }

  if (selected.length === 0) {
    throw new Error('NetEase returned no playable tracks');
  }

  return selected.slice(0, maxTracks);
}

