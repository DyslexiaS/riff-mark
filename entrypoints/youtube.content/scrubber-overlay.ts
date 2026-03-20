import type { Mark } from '../../utils/storage';
import { formatTime } from '../../utils/time';
import { getProgressBarContainer } from '../../utils/youtube';

const OVERLAY_ID = 'riff-mark-scrubber-overlay';
const TRIANGLE_CLASS = 'rm-triangle';

function getOrCreateOverlay(progressBar: Element): HTMLElement {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return existing;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = `
    position: absolute;
    bottom: -14px;
    left: 0;
    right: 0;
    height: 14px;
    pointer-events: none;
    z-index: 9999;
  `;
  (progressBar as HTMLElement).style.position = 'relative';
  progressBar.appendChild(overlay);
  return overlay;
}

export function renderScrubberMarks(
  marks: Mark[],
  activeMarkId: string | null,
  video: HTMLVideoElement,
): void {
  const progressBar = getProgressBarContainer();
  if (!progressBar || !video.duration) return;

  const overlay = getOrCreateOverlay(progressBar);
  overlay.innerHTML = '';

  for (const mark of marks) {
    const pct = (mark.time / video.duration) * 100;
    const isActive = mark.id === activeMarkId;

    const triangle = document.createElement('div');
    triangle.className = TRIANGLE_CLASS;
    triangle.title = `${mark.name} · ${formatTime(mark.time)}`;
    triangle.style.cssText = `
      position: absolute;
      left: ${pct}%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 8px solid #F59E0B;
      opacity: ${isActive ? '1' : '0.45'};
      pointer-events: all;
      cursor: pointer;
      transition: opacity 0.15s;
    `;

    overlay.appendChild(triangle);
  }

  renderLoopHighlight(marks, activeMarkId, video, progressBar);
}

function renderLoopHighlight(
  marks: Mark[],
  activeMarkId: string | null,
  video: HTMLVideoElement,
  progressBar: Element,
): void {
  const existingHighlight = progressBar.querySelector('#rm-loop-highlight');
  if (existingHighlight) existingHighlight.remove();

  if (!activeMarkId || !video.duration) return;

  const activeIndex = marks.findIndex((m) => m.id === activeMarkId);
  if (activeIndex === -1) return;

  const startTime = marks[activeIndex].time;
  const endTime =
    activeIndex < marks.length - 1 ? marks[activeIndex + 1].time : startTime + 30;

  const startPct = (startTime / video.duration) * 100;
  const endPct = Math.min((endTime / video.duration) * 100, 100);

  const highlight = document.createElement('div');
  highlight.id = 'rm-loop-highlight';
  highlight.style.cssText = `
    position: absolute;
    top: 0;
    left: ${startPct}%;
    width: ${endPct - startPct}%;
    height: 100%;
    background: rgba(245, 158, 11, 0.2);
    pointer-events: none;
    z-index: 9998;
  `;

  (progressBar as HTMLElement).style.position = 'relative';
  progressBar.appendChild(highlight);
}

export function removeScrubberOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  document.getElementById('rm-loop-highlight')?.remove();
}
