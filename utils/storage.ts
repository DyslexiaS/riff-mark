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

export async function getMarks(videoId: string): Promise<Mark[]> {
  const data = await storage.getItem<VideoMarks>(getKey(videoId));
  return data?.marks ?? [];
}

export async function saveMarks(videoId: string, marks: Mark[]): Promise<void> {
  await storage.setItem(getKey(videoId), { marks });
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return (await storage.getItem<HistoryEntry[]>(HISTORY_KEY)) ?? [];
}

export async function updateHistory(videoId: string, title: string): Promise<void> {
  const history = await getHistory();
  const rest = history.filter((e) => e.videoId !== videoId);
  await storage.setItem(HISTORY_KEY, [{ videoId, title, updatedAt: Date.now() }, ...rest].slice(0, 50));
}
