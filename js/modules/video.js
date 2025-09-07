// video.js
export const onLoaded = () => {
    console.log('✅ loadeddata:', { readyState: video.readyState });
    video.loop = false;
    const p = video.play();
    if (p && p.catch) p.catch(e => console.warn('play() catch:', e));
  };
export const onError = () => {
    const err = video.error;
    console.warn('❌ video error', {
      code: err && err.code,
      networkState: video.networkState,
      readyState: video.readyState,
      url: videoUrl
    });
    if (typeof this.showAnimatedProgram === 'function') {
      this.showAnimatedProgram(programType);
    }
  };
export const onEnded = () => {
    console.log('📺 ended');
    video.pause();
    video.currentTime = 0;
  };

export function wireVideoEvents(videoEl) {
  if (!videoEl) return;
  videoEl.addEventListener('loadeddata', onLoaded);
  videoEl.addEventListener('error', onError);
  videoEl.addEventListener('ended', onEnded);
}
