import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { Mark } from '../../utils/storage';
import { getMarks, saveMarks } from '../../utils/storage';
import { getVideoId, getVideoElement } from '../../utils/youtube';
import { formatTime } from '../../utils/time';
import { startLoop, stopLoop } from './loop-engine';
import { renderScrubberMarks, removeScrubberOverlay } from './scrubber-overlay';

const MAX_MARKS = 20;
const LAST_MARK_LOOP_DURATION = 30;

interface PanelState {
  marks: Mark[];
  activeMarkId: string | null;
}

const state: PanelState = {
  marks: [],
  activeMarkId: null,
};

function createMarkId(): string {
  return `mark_${Date.now()}`;
}

function getLoopEnd(marks: Mark[], activeMarkId: string): number {
  const idx = marks.findIndex((m) => m.id === activeMarkId);
  if (idx === -1) return 0;
  return idx < marks.length - 1
    ? marks[idx + 1].time
    : marks[idx].time + LAST_MARK_LOOP_DURATION;
}

export async function mountPanel(container: HTMLElement, ctx: ContentScriptContext): Promise<void> {
  const videoId = getVideoId();
  if (!videoId) return;

  state.marks = await getMarks(videoId);
  state.activeMarkId = null;

  render(container, videoId, ctx);

  // Re-render scrubber when video metadata is ready
  const video = getVideoElement();
  if (video) {
    video.addEventListener('loadedmetadata', () => {
      updateScrubber();
    });
  }
}

function render(container: HTMLElement, videoId: string, ctx: ContentScriptContext): void {
  container.innerHTML = '';

  const panel = document.createElement('div');
  panel.className = 'rm-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'rm-header';

  const logo = document.createElement('span');
  logo.className = 'rm-logo';
  logo.textContent = '♩ RIFF MARK';

  const dot = document.createElement('span');
  dot.className = 'rm-logo-dot';
  dot.textContent = '·';

  const videoTitle = document.createElement('span');
  videoTitle.className = 'rm-video-title';
  videoTitle.textContent = document.title.replace(' - YouTube', '').trim();

  const dropBtn = document.createElement('button');
  dropBtn.className = 'rm-drop-btn';
  dropBtn.innerHTML = '<span class="rm-drop-btn-icon">✦</span> DROP MARK';
  dropBtn.disabled = state.marks.length >= MAX_MARKS;
  if (state.marks.length >= MAX_MARKS) {
    dropBtn.title = 'Mark limit reached — ERASE a mark to add more.';
  }

  dropBtn.addEventListener('click', () => onDropMark(videoId, dropBtn, chipsRow, loopStatus, ctx));

  header.append(logo, dot, videoTitle, dropBtn);

  // Chips row
  const chipsRow = document.createElement('div');
  chipsRow.className = 'rm-chips-row';

  // Loop status (hidden initially)
  const loopStatus = document.createElement('div');
  loopStatus.className = 'rm-loop-status';
  loopStatus.style.display = 'none';

  renderChips(chipsRow, loopStatus, videoId, ctx);

  panel.append(header, chipsRow, loopStatus);
  container.appendChild(panel);

  updateScrubber();
}

function renderChips(
  chipsRow: HTMLElement,
  loopStatus: HTMLElement,
  videoId: string,
  ctx: ContentScriptContext,
): void {
  chipsRow.innerHTML = '';

  if (state.marks.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'rm-empty-state';
    empty.textContent = 'Drop your first mark to begin.';
    chipsRow.appendChild(empty);
    hideLoopStatus(loopStatus);
    return;
  }

  for (const mark of state.marks) {
    const chip = buildChip(mark, chipsRow, loopStatus, videoId, ctx);
    chipsRow.appendChild(chip);
  }
}

function buildChip(
  mark: Mark,
  chipsRow: HTMLElement,
  loopStatus: HTMLElement,
  videoId: string,
  ctx: ContentScriptContext,
): HTMLElement {
  const chip = document.createElement('div');
  chip.className = 'rm-chip';
  if (mark.id === state.activeMarkId) chip.classList.add('rm-chip--active');
  chip.dataset.markId = mark.id;

  const nameEl = document.createElement('span');
  nameEl.className = 'rm-chip-name';
  nameEl.textContent = mark.name;

  const timeEl = document.createElement('span');
  timeEl.className = 'rm-chip-time';
  timeEl.textContent = formatTime(mark.time);

  const eraseBtn = document.createElement('button');
  eraseBtn.className = 'rm-chip-erase';
  eraseBtn.textContent = '✕';
  eraseBtn.title = 'ERASE';

  eraseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onEraseMark(mark.id, chipsRow, loopStatus, videoId, ctx);
  });

  // Single click → loop this section
  chip.addEventListener('click', () => {
    onActivateMark(mark.id, chipsRow, loopStatus, ctx);
  });

  // Double click on name → INSCRIBE mode
  nameEl.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    onInscribe(nameEl, mark, videoId);
  });

  chip.append(nameEl, timeEl, eraseBtn);
  return chip;
}

function onDropMark(
  videoId: string,
  dropBtn: HTMLButtonElement,
  chipsRow: HTMLElement,
  loopStatus: HTMLElement,
  ctx: ContentScriptContext,
): void {
  const video = getVideoElement();
  const time = video?.currentTime ?? 0;
  const name = `Mark ${state.marks.length + 1}`;

  const newMark: Mark = {
    id: createMarkId(),
    name,
    time,
    createdAt: Date.now(),
  };

  state.marks = [...state.marks, newMark].sort((a, b) => a.time - b.time);
  saveMarks(videoId, state.marks);

  // Pulse animation
  dropBtn.classList.remove('rm-pulse');
  void dropBtn.offsetWidth; // reflow to restart animation
  dropBtn.classList.add('rm-pulse');
  dropBtn.addEventListener('animationend', () => dropBtn.classList.remove('rm-pulse'), { once: true });

  if (state.marks.length >= MAX_MARKS) {
    dropBtn.disabled = true;
    dropBtn.title = 'Mark limit reached — ERASE a mark to add more.';
  }

  renderChips(chipsRow, loopStatus, videoId, ctx);
  updateScrubber();
}

function onActivateMark(
  markId: string,
  chipsRow: HTMLElement,
  loopStatus: HTMLElement,
  ctx: ContentScriptContext,
): void {
  const video = getVideoElement();
  if (!video) return;

  const mark = state.marks.find((m) => m.id === markId);
  if (!mark) return;

  state.activeMarkId = markId;

  const endTime = getLoopEnd(state.marks, markId);
  startLoop(ctx, video, mark.time, endTime, () => updateScrubber());

  // Update chip styles
  chipsRow.querySelectorAll<HTMLElement>('.rm-chip').forEach((chip) => {
    chip.classList.toggle('rm-chip--active', chip.dataset.markId === markId);
  });

  showLoopStatus(loopStatus, mark, endTime);
  updateScrubber();
}

function onEraseMark(
  markId: string,
  chipsRow: HTMLElement,
  loopStatus: HTMLElement,
  videoId: string,
  ctx: ContentScriptContext,
): void {
  if (state.activeMarkId === markId) {
    stopLoop();
    state.activeMarkId = null;
    hideLoopStatus(loopStatus);
  }

  state.marks = state.marks.filter((m) => m.id !== markId);
  saveMarks(videoId, state.marks);

  const dropBtn = chipsRow
    .closest('.rm-panel')
    ?.querySelector<HTMLButtonElement>('.rm-drop-btn');
  if (dropBtn && state.marks.length < MAX_MARKS) {
    dropBtn.disabled = false;
    dropBtn.title = '';
  }

  renderChips(chipsRow, loopStatus, videoId, ctx);
  updateScrubber();
}

function onInscribe(nameEl: HTMLElement, mark: Mark, videoId: string): void {
  const prevName = mark.name;
  const input = document.createElement('input');
  input.className = 'rm-chip-input';
  input.value = prevName;
  input.maxLength = 24;

  nameEl.replaceWith(input);
  input.select();
  input.focus();

  const confirm = () => {
    const newName = input.value.trim() || prevName;
    mark.name = newName;
    saveMarks(videoId, state.marks);
    input.replaceWith(nameEl);
    nameEl.textContent = newName;
  };

  const cancel = () => {
    input.replaceWith(nameEl);
    nameEl.textContent = prevName;
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirm();
    } else if (e.key === 'Escape') {
      cancel();
    }
    e.stopPropagation();
  });

  input.addEventListener('blur', confirm);
  input.addEventListener('click', (e) => e.stopPropagation());
}

function showLoopStatus(loopStatus: HTMLElement, mark: Mark, endTime: number): void {
  loopStatus.style.display = 'flex';
  loopStatus.innerHTML = `
    <span class="rm-loop-icon">🔁</span>
    <span class="rm-loop-label">LOOPING:</span>
    <span class="rm-loop-name">${mark.name}</span>
    <span class="rm-loop-range">(${formatTime(mark.time)} → ${formatTime(endTime)})</span>
    <span class="rm-loop-spacer"></span>
    <button class="rm-release-btn">RELEASE</button>
  `;

  loopStatus.querySelector('.rm-release-btn')?.addEventListener('click', () => {
    stopLoop();
    state.activeMarkId = null;
    hideLoopStatus(loopStatus);

    loopStatus
      .closest('.rm-panel')
      ?.querySelectorAll<HTMLElement>('.rm-chip')
      .forEach((chip) => chip.classList.remove('rm-chip--active'));

    updateScrubber();
  });
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

export function cleanupPanel(): void {
  stopLoop();
  removeScrubberOverlay();
  state.activeMarkId = null;
}
