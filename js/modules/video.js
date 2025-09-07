// video.js
// Provide generic video event handlers that can be bound with dependencies.
export function createVideoHandlers(videoEl, { programType, videoUrl, onShowAnimatedProgram } = {}) {
  const onLoaded = () => {
    try {
      const p = videoEl.play();
      if (p && p.catch) p.catch(e => console.warn('play() catch:', e));
    } catch (e) {
      console.warn('play() error', e);
    }
  };

  const onEnded = () => {
    console.log('📺 ended');
    try {
      videoEl.pause();
      videoEl.currentTime = 0;
    } catch {}
  };

  const onError = () => {
    const err = videoEl.error;
    console.warn('❌ video error', {
      code: err && err.code,
      networkState: videoEl.networkState,
      readyState: videoEl.readyState,
      url: videoUrl
    });
    if (typeof onShowAnimatedProgram === 'function') {
      onShowAnimatedProgram(programType);
    }
  };
  return { onLoaded, onEnded, onError };
}

export function wireVideoEvents(videoEl, handlers) {
  if (!videoEl || !handlers) return;
  const { onLoaded, onEnded, onError } = handlers;
  if (onLoaded) videoEl.addEventListener('loadeddata', onLoaded, { once: true });
  if (onEnded) videoEl.addEventListener('ended', onEnded);
  if (onError) videoEl.addEventListener('error', onError);
}
