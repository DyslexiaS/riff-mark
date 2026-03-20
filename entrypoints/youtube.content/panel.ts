import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { Mark } from '../../utils/storage';
import { getMarks, saveMarks } from '../../utils/storage';
import { getVideoId, getVideoElement } from '../../utils/youtube';
import { formatTime } from '../../utils/time';
import { stopLoop } from './loop-engine';
import { renderScrubberMarks, removeScrubberOverlay } from './scrubber-overlay';

const MAX_MARKS = 20;

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


export async function mountPanel(container: HTMLElement, ctx: ContentScriptContext): Promise<void> {
  const videoId = getVideoId();
  if (!videoId) return;

  state.marks = await getMarks(videoId);
  state.activeMarkId = null;

  render(container, videoId, ctx);

  const video = getVideoElement();
  if (video) {
    video.addEventListener('loadedmetadata', updateScrubber);
  }
}

// ─── Layout ──────────────────────────────────────────────────────────────────
//
//  ┌──────────────────────────────────────────────────────────────┐
//  │ ♩  [ ✦ DROP MARK ]  │  [Intro 0:00]  [Chorus 1:32]  ...    │  ← toolbar
//  ├──────────────────────────────────────────────────────────────┤
//  │ ● LOOPING: Chorus  1:32 → 3:05                  [RELEASE]  │  ← only when active
//  └──────────────────────────────────────────────────────────────┘

function render(container: HTMLElement, videoId: string, ctx: ContentScriptContext): void {
  container.innerHTML = '';

  const panel = document.createElement('div');
  panel.className = 'rm-panel';

  const toolbar = document.createElement('div');
  toolbar.className = 'rm-toolbar';

  const brand = document.createElement('span');
  brand.className = 'rm-brand';
  brand.textContent = '♩';
  brand.title = 'Riff Mark';

  const dropBtn = document.createElement('button');
  dropBtn.className = 'rm-drop-btn';
  dropBtn.innerHTML = '✦ DROP MARK';
  dropBtn.disabled = state.marks.length >= MAX_MARKS;
  if (state.marks.length >= MAX_MARKS) {
    dropBtn.title = 'Mark limit reached — ERASE a mark to add more.';
  }

  const divider = document.createElement('div');
  divider.className = 'rm-divider';

  const chips = document.createElement('div');
  chips.className = 'rm-chips';

  const loopStatus = document.createElement('div');
  loopStatus.className = 'rm-loop-status';
  loopStatus.style.display = 'none';

  dropBtn.addEventListener('click', () => onDropMark(videoId, dropBtn, chips, loopStatus, ctx));

  toolbar.append(brand, dropBtn, divider, chips);
  panel.append(toolbar, loopStatus);
  container.appendChild(panel);

  renderChips(chips, loopStatus, videoId, ctx);
  updateScrubber();
}

function renderChips(
  chips: HTMLElement,
  loopStatus: HTMLElement,
  videoId: string,
  ctx: ContentScriptContext,
): void {
  chips.innerHTML = '';

  if (state.marks.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'rm-empty-state';
    empty.textContent = 'Drop your first mark to begin.';
    chips.appendChild(empty);
    hideLoopStatus(loopStatus);
    return;
  }

  for (const mark of state.marks) {
    chips.appendChild(buildChip(mark, chips, loopStatus, videoId, ctx));
  }
}

function buildChip(
  mark: Mark,
  chips: HTMLElement,
  loopStatus: HTMLElement,
  videoId: string,
  ctx: ContentScriptContext,
): HTMLElement {
  const chip = document.createElement('div');
  chip.className = 'rm-chip';
  if (mark.id === state.activeMarkId) chip.classList.add('rm-chip--active');
  chip.dataset.markId = mark.id;

  // ── Clickable body: seek to time ──
  const body = document.createElement('div');
  body.className = 'rm-chip-body';

  const nameEl = document.createElement('span');
  nameEl.className = 'rm-chip-name';
  nameEl.textContent = mark.name;

  const timeEl = document.createElement('span');
  timeEl.className = 'rm-chip-time';
  timeEl.textContent = formatTime(mark.time);

  body.append(nameEl, timeEl);
  body.addEventListener('click', () => onSeekToMark(mark.id, chips));

  // ── Always-visible action icons ──
  const actions = document.createElement('div');
  actions.className = 'rm-chip-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'rm-chip-action';
  editBtn.textContent = '✎';
  editBtn.title = 'Edit name';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onInscribe(nameEl, mark, videoId);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'rm-chip-action rm-chip-action--delete';
  deleteBtn.textContent = '✕';
  deleteBtn.title = 'Delete mark';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onEraseMark(mark.id, chips, loopStatus, videoId, ctx);
  });

  actions.append(editBtn, deleteBtn);
  chip.append(body, actions);
  return chip;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function onDropMark(
  videoId: string,
  dropBtn: HTMLButtonElement,
  chips: HTMLElement,
  loopStatus: HTMLElement,
  ctx: ContentScriptContext,
): void {
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

  dropBtn.classList.remove('rm-pulse');
  void dropBtn.offsetWidth;
  dropBtn.classList.add('rm-pulse');
  dropBtn.addEventListener('animationend', () => dropBtn.classList.remove('rm-pulse'), { once: true });

  if (state.marks.length >= MAX_MARKS) {
    dropBtn.disabled = true;
    dropBtn.title = 'Mark limit reached — ERASE a mark to add more.';
  }

  renderChips(chips, loopStatus, videoId, ctx);
  updateScrubber();
}

function onSeekToMark(markId: string, chips: HTMLElement): void {
  const video = getVideoElement();
  if (!video) return;

  const mark = state.marks.find((m) => m.id === markId);
  if (!mark) return;

  video.currentTime = mark.time;

  chips.querySelectorAll<HTMLElement>('.rm-chip').forEach((chip) => {
    chip.classList.toggle('rm-chip--active', chip.dataset.markId === markId);
  });

  state.activeMarkId = markId;
  updateScrubber();
}

function onEraseMark(
  markId: string,
  chips: HTMLElement,
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

  const dropBtn = chips.closest('.rm-toolbar')?.querySelector<HTMLButtonElement>('.rm-drop-btn');
  if (dropBtn && state.marks.length < MAX_MARKS) {
    dropBtn.disabled = false;
    dropBtn.title = '';
  }

  renderChips(chips, loopStatus, videoId, ctx);
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

  // Guard against double-commit: blur fires after Enter replaces the input
  let committed = false;

  const commit = (value: string) => {
    if (committed) return;
    committed = true;
    mark.name = value.trim() || prevName;
    saveMarks(videoId, state.marks);
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

// ─── Loop status ──────────────────────────────────────────────────────────────

function showLoopStatus(
  loopStatus: HTMLElement,
  mark: Mark,
  endTime: number,
  chips: HTMLElement,
): void {
  loopStatus.style.display = 'flex';
  loopStatus.innerHTML = `
    <span class="rm-loop-dot"></span>
    <span class="rm-loop-text">
      LOOPING &nbsp;<strong>${mark.name}</strong>&nbsp;
      <code>${formatTime(mark.time)} → ${formatTime(endTime)}</code>
    </span>
    <span class="rm-loop-spacer"></span>
    <button class="rm-release-btn">RELEASE</button>
  `;

  loopStatus.querySelector('.rm-release-btn')?.addEventListener('click', () => {
    stopLoop();
    state.activeMarkId = null;
    hideLoopStatus(loopStatus);
    chips.querySelectorAll<HTMLElement>('.rm-chip').forEach((c) => c.classList.remove('rm-chip--active'));
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
