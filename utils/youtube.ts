export function getVideoId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

export function getVideoElement(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('video.html5-main-video');
}

export function getProgressBarContainer(): Element | null {
  return document.querySelector('.ytp-progress-bar-container');
}
