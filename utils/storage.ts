import { storage } from 'wxt/utils/storage';

export interface Mark {
  id: string;
  name: string;
  time: number;
  createdAt: number;
}

interface VideoMarks {
  marks: Mark[];
}

export interface HistoryEntry {
  videoId: string;
  title: string;
  updatedAt: number;
}

const HISTORY_KEY = 'local:history' as const;
const getKey = (videoId: string) => `local:marks:${videoId}` as const;

// When a content script is orphaned (extension reloaded while tab is open),
// chrome.runtime.id throws and browser.storage becomes null. Guard every
// storage call so the WXT driver never reaches its "browser.storage == null"
// throw path — prevents noisy console errors even though try/catch would
// swallow them.
function isContextValid(): boolean {
  try {
    return !!browser.runtime.id;
  } catch {
    return false;
  }
}

export async function getMarks(videoId: string): Promise<Mark[]> {
  if (!isContextValid()) return [];
  try {
    const data = await storage.getItem<VideoMarks>(getKey(videoId));
    return data?.marks ?? [];
  } catch {
    return [];
  }
}

export async function saveMarks(videoId: string, marks: Mark[]): Promise<void> {
  if (!isContextValid()) return;
  try {
    await storage.setItem(getKey(videoId), { marks });
  } catch {
    // orphaned context — ignore
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  if (!isContextValid()) return [];
  try {
    return (await storage.getItem<HistoryEntry[]>(HISTORY_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function updateHistory(videoId: string, title: string): Promise<void> {
  if (!isContextValid()) return;
  try {
    const history = await getHistory();
    const rest = history.filter((e) => e.videoId !== videoId);
    await storage.setItem(HISTORY_KEY, [{ videoId, title, updatedAt: Date.now() }, ...rest].slice(0, 50));
  } catch {
    // orphaned context — ignore
  }
}
