import type { Mark } from '../../utils/storage';
import { formatTime } from '../../utils/time';

const MAX_MARKS = 20;

interface PanelLayout {
  panel: HTMLElement;
  toolbar: HTMLElement;
  brand: HTMLElement;
  dropBtn: HTMLButtonElement;
  divider: HTMLElement;
  chips: HTMLElement;
  loopStatus: HTMLElement;
}

export function createPanelLayout(markCount: number): PanelLayout {
  const panel = document.createElement('div');
  panel.className = 'rm-panel';

  const toolbar = document.createElement('div');
  toolbar.className = 'rm-toolbar';

  const brand = document.createElement('span');
  brand.className = 'rm-brand';
  brand.textContent = '\u266A';
  brand.title = 'Riff Mark';

  const dropBtn = document.createElement('button');
  dropBtn.className = 'rm-drop-btn';
  dropBtn.innerHTML = '\u2726 DROP MARK';
  dropBtn.disabled = markCount >= MAX_MARKS;
  if (markCount >= MAX_MARKS) {
    dropBtn.title = 'Mark limit reached \u2014 ERASE a mark to add more.';
  }

  const divider = document.createElement('div');
  divider.className = 'rm-divider';

  const chips = document.createElement('div');
  chips.className = 'rm-chips';

  const loopStatus = document.createElement('div');
  loopStatus.className = 'rm-loop-status';
  loopStatus.style.display = 'none';

  toolbar.append(brand, dropBtn, divider, chips);
  panel.append(toolbar, loopStatus);

  return { panel, toolbar, brand, dropBtn, divider, chips, loopStatus };
}

interface ChipElements {
  chip: HTMLElement;
  body: HTMLElement;
  nameEl: HTMLElement;
  editBtn: HTMLButtonElement;
  deleteBtn: HTMLButtonElement;
}

export function createChip(mark: Mark, isActive: boolean): ChipElements {
  const chip = document.createElement('div');
  chip.className = 'rm-chip';
  if (isActive) chip.classList.add('rm-chip--active');
  chip.dataset.markId = mark.id;

  const body = document.createElement('div');
  body.className = 'rm-chip-body';

  const nameEl = document.createElement('span');
  nameEl.className = 'rm-chip-name';
  nameEl.textContent = mark.name;

  const timeEl = document.createElement('span');
  timeEl.className = 'rm-chip-time';
  timeEl.textContent = formatTime(mark.time);

  body.append(nameEl, timeEl);

  const actions = document.createElement('div');
  actions.className = 'rm-chip-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'rm-chip-action';
  editBtn.textContent = '\u270E';
  editBtn.title = 'Edit name';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'rm-chip-action rm-chip-action--delete';
  deleteBtn.textContent = '\u2715';
  deleteBtn.title = 'Delete mark';

  actions.append(editBtn, deleteBtn);
  chip.append(body, actions);

  return { chip, body, nameEl, editBtn, deleteBtn };
}

interface LoopStatusElements {
  fragment: DocumentFragment;
  releaseBtn: HTMLButtonElement;
}

export function createLoopStatusBar(markName: string, startTime: number, endTime: number): LoopStatusElements {
  const fragment = document.createDocumentFragment();

  const dot = document.createElement('span');
  dot.className = 'rm-loop-dot';

  const text = document.createElement('span');
  text.className = 'rm-loop-text';
  text.innerHTML = `LOOPING &nbsp;<strong>${markName}</strong>&nbsp; <code>${formatTime(startTime)} \u2192 ${formatTime(endTime)}</code>`;

  const spacer = document.createElement('span');
  spacer.className = 'rm-loop-spacer';

  const releaseBtn = document.createElement('button');
  releaseBtn.className = 'rm-release-btn';
  releaseBtn.textContent = 'RELEASE';

  fragment.append(dot, text, spacer, releaseBtn);

  return { fragment, releaseBtn };
}

export function createEmptyState(): HTMLElement {
  const empty = document.createElement('span');
  empty.className = 'rm-empty-state';
  empty.textContent = 'Drop your first mark to begin.';
  return empty;
}
