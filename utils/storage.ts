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

// All storage functions are wrapped in try/catch. When a content script is
// orphaned (extension reloaded while tab is open), browser.storage becomes
// inaccessible and WXT throws "browser.storage == null". We silently degrade
// rather than surface an unhandled error to the user.

export async function getMarks(videoId: string): Promise<Mark[]> {
  try {
    const data = await storage.getItem<VideoMarks>(getKey(videoId));
    return data?.marks ?? [];
  } catch {
    return [];
  }
}

export async function saveMarks(videoId: string, marks: Mark[]): Promise<void> {
  try {
    await storage.setItem(getKey(videoId), { marks });
  } catch {
    // orphaned context — ignore
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    return (await storage.getItem<HistoryEntry[]>(HISTORY_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function updateHistory(videoId: string, title: string): Promise<void> {
  try {
    const history = await getHistory();
    const rest = history.filter((e) => e.videoId !== videoId);
    await storage.setItem(HISTORY_KEY, [{ videoId, title, updatedAt: Date.now() }, ...rest].slice(0, 50));
  } catch {
    // orphaned context — ignore
  }
}
