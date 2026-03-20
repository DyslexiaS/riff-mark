import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { Mark } from '../../utils/storage';
import { getMarks, saveMarks, updateHistory } from '../../utils/storage';
import { getVideoId, getVideoElement } from '../../utils/youtube';
import { startLoop, stopLoop } from './loop-engine';
import { renderScrubberMarks, removeScrubberOverlay } from './scrubber-overlay';
import { createPanelLayout, createChip, createLoopStatusBar, createEmptyState } from './dom';

const MAX_MARKS = 20;

interface PanelContext {
  videoId: string;
  ctx: ContentScriptContext;
  elements: {
    container: HTMLElement;
    dropBtn: HTMLButtonElement;
    chips: HTMLElement;
    loopStatus: HTMLElement;
  };
}

interface PanelState {
  marks: Mark[];
  activeMarkId: string | null;
}

let panelCtx: PanelContext | null = null;
const state: PanelState = { marks: [], activeMarkId: null };
let videoCleanup: (() => void) | null = null;

function createMarkId(): string {
  return `mark_${Date.now()}`;
}

// ─── Mount / Cleanup ─────────────────────────────────────────────────────────

export async function mountPanel(container: HTMLElement, ctx: ContentScriptContext): Promise<void> {
  const videoId = getVideoId();
  if (!videoId) return;

  state.marks = await getMarks(videoId);
  if (ctx.signal.aborted) return;
  state.activeMarkId = null;

  if (state.marks.length > 0) {
    updateHistory(videoId, document.title.replace(' - YouTube', '').trim());
  }

  const layout = createPanelLayout(state.marks.length);
  container.innerHTML = '';
  container.appendChild(layout.panel);

  panelCtx = {
    videoId,
    ctx,
    elements: {
      container,
      dropBtn: layout.dropBtn,
      chips: layout.chips,
      loopStatus: layout.loopStatus,
    },
  };

  layout.dropBtn.addEventListener('click', dropMark);
  rerender();

  const video = getVideoElement();
  if (video) {
    video.addEventListener('loadedmetadata', updateScrubber);
    videoCleanup = () => video.removeEventListener('loadedmetadata', updateScrubber);
  }
}

export function cleanupPanel(): void {
  stopLoop();
  removeScrubberOverlay();
  videoCleanup?.();
  videoCleanup = null;
  state.activeMarkId = null;
  panelCtx = null;
}

// ─── Render ──────────────────────────────────────────────────────────────────

function rerender(): void {
  if (!panelCtx) return;
  const { chips, loopStatus, dropBtn } = panelCtx.elements;

  chips.innerHTML = '';

  if (state.marks.length === 0) {
    chips.appendChild(createEmptyState());
    hideLoopStatus(loopStatus);
    updateScrubber();
    return;
  }

  for (const mark of state.marks) {
    const { chip, body, nameEl, editBtn, deleteBtn } = createChip(mark, mark.id === state.activeMarkId);

    body.addEventListener('click', () => seekAndLoop(mark.id));
    editBtn.addEventListener('click', (e: MouseEvent) => { e.stopPropagation(); inscribeMark(nameEl, mark); });
    deleteBtn.addEventListener('click', (e: MouseEvent) => { e.stopPropagation(); eraseMark(mark.id); });

    chips.appendChild(chip);
  }

  dropBtn.disabled = state.marks.length >= MAX_MARKS;
  dropBtn.title = state.marks.length >= MAX_MARKS ? 'Mark limit reached \u2014 ERASE a mark to add more.' : '';

  updateScrubber();
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function dropMark(): void {
  if (!panelCtx) return;
  const { videoId, elements: { dropBtn } } = panelCtx;

  const video = getVideoElement();
  const time = video?.currentTime ?? 0;

  const newMark: Mark = {
    id: createMarkId(),
    name: `Mark ${state.marks.length + 1}`,
    time,
    createdAt: Date.now(),
  };

  state.marks = [...state.marks, newMark].sort((a, b) => a.time - b.time);
  saveMarks(videoId, state.marks);

  if (state.marks.length === 1) {
    updateHistory(videoId, document.title.replace(' - YouTube', '').trim());
  }

  dropBtn.classList.remove('rm-pulse');
  void dropBtn.offsetWidth;
  dropBtn.classList.add('rm-pulse');
  dropBtn.addEventListener('animationend', () => dropBtn.classList.remove('rm-pulse'), { once: true });

  rerender();
}

function seekAndLoop(markId: string): void {
  if (!panelCtx) return;
  const video = getVideoElement();
  if (!video) return;

  const mark = state.marks.find((m) => m.id === markId);
  if (!mark) return;

  state.activeMarkId = markId;
  const endTime = getLoopEnd(markId);

  startLoop(panelCtx.ctx, video, mark.time, endTime, updateScrubber);
  showLoopStatus(mark, endTime);
  rerender();
}

function eraseMark(markId: string): void {
  if (!panelCtx) return;

  if (state.activeMarkId === markId) {
    releaseLoop();
  }

  state.marks = state.marks.filter((m) => m.id !== markId);
  saveMarks(panelCtx.videoId, state.marks);
  rerender();
}

function inscribeMark(nameEl: HTMLElement, mark: Mark): void {
  if (!panelCtx) return;
  const prevName = mark.name;
  const input = document.createElement('input');
  input.className = 'rm-chip-input';
  input.value = prevName;
  input.maxLength = 24;

  nameEl.replaceWith(input);
  input.select();
  input.focus();

  let committed = false;

  const commit = (value: string) => {
    if (committed) return;
    committed = true;
    mark.name = value.trim() || prevName;
    saveMarks(panelCtx!.videoId, state.marks);
    input.replaceWith(nameEl);
    nameEl.textContent = mark.name;
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(input.value); }
    else if (e.key === 'Escape') { committed = true; input.replaceWith(nameEl); nameEl.textContent = prevName; }
    e.stopPropagation();
  });

  input.addEventListener('blur', () => commit(input.value));
  input.addEventListener('click', (e) => e.stopPropagation());
}

function releaseLoop(): void {
  if (!panelCtx) return;
  stopLoop();
  state.activeMarkId = null;
  hideLoopStatus(panelCtx.elements.loopStatus);
  rerender();
}

// ─── Loop helpers ────────────────────────────────────────────────────────────

function getLoopEnd(markId: string): number {
  const idx = state.marks.findIndex((m) => m.id === markId);
  if (idx === -1) return 0;
  return idx < state.marks.length - 1 ? state.marks[idx + 1].time : state.marks[idx].time + 30;
}

function showLoopStatus(mark: Mark, endTime: number): void {
  if (!panelCtx) return;
  const { loopStatus } = panelCtx.elements;

  loopStatus.style.display = 'flex';
  loopStatus.innerHTML = '';

  const { fragment, releaseBtn } = createLoopStatusBar(mark.name, mark.time, endTime);
  releaseBtn.addEventListener('click', releaseLoop);
  loopStatus.appendChild(fragment);
}

function hideLoopStatus(loopStatus: HTMLElement): void {
  loopStatus.style.display = 'none';
  loopStatus.innerHTML = '';
}

function updateScrubber(): void {
  const video = getVideoElement();
  if (!video) return;
  renderScrubberMarks(state.marks, state.activeMarkId, video);
}
