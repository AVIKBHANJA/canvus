export type DropType = "TEXT" | "LINK" | "IMAGE" | "FILE";

/**
 * The Drop shape the UI consumes — camelCase.
 * Supabase returns snake_case from the `canvus_drops` table; we convert
 * at the boundary (see `fromRow` below) so the UI doesn't have to know.
 */
export type Drop = {
  id: string;
  userId: string;
  type: DropType;
  content: string | null;
  url: string | null;
  ogTitle: string | null;
  ogDesc: string | null;
  ogImage: string | null;
  filePath: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  thumbnail: string | null;
  tags: string[];
  deviceName: string | null;
  pinned: boolean;
  createdAt: string;
};

/** Raw row shape from `public.canvus_drops` (snake_case). */
export type DropRow = {
  id: string;
  user_id: string;
  type: DropType;
  content: string | null;
  url: string | null;
  og_title: string | null;
  og_desc: string | null;
  og_image: string | null;
  file_path: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
  thumbnail: string | null;
  tags: string[] | null;
  device_name: string | null;
  pinned: boolean;
  created_at: string;
};

export function fromRow(r: DropRow): Drop {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    content: r.content,
    url: r.url,
    ogTitle: r.og_title,
    ogDesc: r.og_desc,
    ogImage: r.og_image,
    filePath: r.file_path,
    fileName: r.file_name,
    fileMime: r.file_mime,
    fileSize: r.file_size,
    thumbnail: r.thumbnail,
    tags: r.tags ?? [],
    deviceName: r.device_name,
    pinned: r.pinned,
    createdAt: r.created_at,
  };
}
