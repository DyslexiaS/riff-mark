import type { ContentScriptContext } from 'wxt/utils/content-script-context';

let currentIntervalId: number | null = null;

export function startLoop(
  ctx: ContentScriptContext,
  video: HTMLVideoElement,
  startTime: number,
  endTime: number,
  onTick: () => void,
): void {
  stopLoop();
  video.currentTime = startTime;
  video.play();

  currentIntervalId = ctx.setInterval(() => {
    if (video.currentTime >= endTime) {
      video.currentTime = startTime;
    }
    onTick();
  }, 100);
}

export function stopLoop(): void {
  if (currentIntervalId !== null) {
    clearInterval(currentIntervalId);
    currentIntervalId = null;
  }
}

export function isLooping(): boolean {
  return currentIntervalId !== null;
}
