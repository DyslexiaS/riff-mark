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

const getKey = (videoId: string) => `local:marks:${videoId}` as const;

export async function getMarks(videoId: string): Promise<Mark[]> {
  const data = await storage.getItem<VideoMarks>(getKey(videoId));
  return data?.marks ?? [];
}

export async function saveMarks(videoId: string, marks: Mark[]): Promise<void> {
  await storage.setItem(getKey(videoId), { marks });
}
