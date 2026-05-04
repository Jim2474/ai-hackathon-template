export function fadeVolume(audio, from, to, duration = 1000) {
  if (!audio) return Promise.resolve();

  if (audio.__fadeCancel) {
    audio.__fadeCancel();
  }

  const clamp = (value) => Math.min(1, Math.max(0, value));
  const startVolume = clamp(from);
  const endVolume = clamp(to);
  const startTime = performance.now();

  audio.volume = startVolume;

  return new Promise((resolve) => {
    let frameId;
    let cancelled = false;

    audio.__fadeCancel = () => {
      cancelled = true;
      if (frameId) cancelAnimationFrame(frameId);
      resolve();
    };

    const step = (now) => {
      if (cancelled) return;

      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      audio.volume = clamp(startVolume + (endVolume - startVolume) * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        audio.volume = endVolume;
        audio.__fadeCancel = null;
        resolve();
      }
    };

    frameId = requestAnimationFrame(step);
  });
}
