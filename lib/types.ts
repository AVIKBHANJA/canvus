export type DropType = "TEXT" | "LINK" | "IMAGE" | "FILE";

export type CollectionColor =
  | "chartreuse"
  | "cyan"
  | "amber"
  | "rose"
  | "violet"
  | "slate";

export const COLLECTION_COLORS: CollectionColor[] = [
  "chartreuse",
  "cyan",
  "amber",
  "rose",
  "violet",
  "slate",
];

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
  collectionId: string | null;
  createdAt: string;
  headline?: string;
};

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
  collection_id: string | null;
  created_at: string;
  headline?: string;
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
    collectionId: r.collection_id ?? null,
    createdAt: r.created_at,
    ...(r.headline ? { headline: r.headline } : {}),
  };
}

export type Collection = {
  id: string;
  userId: string;
  name: string;
  color: CollectionColor;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  color: CollectionColor;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function collectionFromRow(r: CollectionRow): Collection {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export type Device = {
  id: string;
  userId: string;
  deviceKey: string;
  name: string;
  ua: string | null;
  lastActiveAt: string;
  revokedAt: string | null;
  createdAt: string;
  isCurrent?: boolean;
};

export type DeviceRow = {
  id: string;
  user_id: string;
  device_key: string;
  name: string;
  ua: string | null;
  last_active_at: string;
  revoked_at: string | null;
  created_at: string;
};

export function deviceFromRow(
  r: DeviceRow,
  currentDeviceKey?: string | null,
): Device {
  return {
    id: r.id,
    userId: r.user_id,
    deviceKey: r.device_key,
    name: r.name,
    ua: r.ua,
    lastActiveAt: r.last_active_at,
    revokedAt: r.revoked_at,
    createdAt: r.created_at,
    isCurrent: currentDeviceKey != null && r.device_key === currentDeviceKey,
  };
}
