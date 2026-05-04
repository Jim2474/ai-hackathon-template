const fallbackHighlights = {
  focus: ['低刺激', '专注', '注意力', '节奏'],
  sleep: ['放松', '呼吸', '自然'],
  calm: ['平静', '自然', '安全'],
  nature: ['自然', '放松', '环境'],
  energy: ['动力', '节奏', '坚持']
};

function normalizePhase(phase, index) {
  if (!phase || typeof phase !== 'object') {
    return {
      time: `${index * 10}-${(index + 1) * 10}min`,
      title: `阶段 ${index + 1}`
    };
  }

  const hasStartEnd = phase.start !== undefined && phase.end !== undefined;
  const time = phase.time || (hasStartEnd ? `${phase.start}-${phase.end}min` : `${index * 10}-${(index + 1) * 10}min`);

  return {
    ...phase,
    time,
    title: phase.title || `阶段 ${index + 1}`
  };
}

function buildSongStory(track) {
  const title = track.title || '这首歌';
  const background = track.songBackground || {};
  const whyItFits = background.whyItFits || '它的声音比较稳定，适合放在这里承接当前状态。';
  const story = background.story || '它更像一层轻轻铺开的背景声，不急着把你推向哪里。';
  const playCountText = track.playCount ? `你已经听过它 ${track.playCount} 次了，` : '';

  return {
    songIntro: track.songIntro || `现在这首是 ${title}。${story}`,
    personalReason: track.personalReason || `${playCountText}${whyItFits}`,
    transitionIn: track.transitionIn || `我先把 ${title} 放进来，让这一段慢慢接上。`,
    transitionOut: track.transitionOut || '接下来我会换一个声音，让这个状态继续往下走。'
  };
}

function normalizeTrack(track, index) {
  const safeTrack = track || {};
  const story = buildSongStory(safeTrack);

  return {
    ...safeTrack,
    phase: safeTrack.phase || '默认',
    ...story,
    transition: safeTrack.transition || story.transitionIn || `播放 ${safeTrack.title || `Track ${index + 1}`}`
  };
}

function getDurationFromPhases(phases) {
  const lastPhase = phases[phases.length - 1];
  if (!lastPhase) return 30;

  const endMatch = String(lastPhase.time).match(/-(\d+)min/);
  return endMatch ? Number(endMatch[1]) : 30;
}

export function normalizeDJPlan(plan, options = {}) {
  const tracks = Array.isArray(plan.tracks) ? plan.tracks.map(normalizeTrack) : [];
  const phases = Array.isArray(plan.phases) ? plan.phases.map(normalizePhase) : [];
  const transitions = Array.isArray(plan.transitions) && plan.transitions.length > 0
    ? plan.transitions
    : tracks.map(track => track.transition).filter(Boolean);

  const mode = plan.mode || options.mode || 'focus';

  return {
    ...plan,
    id: plan.id || options.id || `dj-plan-${Date.now()}`,
    mode,
    duration: Number(plan.duration) || getDurationFromPhases(phases),
    highlights: Array.isArray(plan.highlights) && plan.highlights.length > 0
      ? plan.highlights
      : options.highlights || fallbackHighlights[mode] || fallbackHighlights.focus,
    phases,
    tracks,
    transitions
  };
}
