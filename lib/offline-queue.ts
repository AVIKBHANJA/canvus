"use client";

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "canvus-offline";
const STORE = "pending-drops";
const VERSION = 1;

export type PendingKind = "text-link";

export type PendingDrop = {
  id: string; // client-side UUID
  createdAt: number;
  kind: PendingKind;
  body: Record<string, unknown>;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueDrop(
  kind: PendingKind,
  body: Record<string, unknown>,
): Promise<PendingDrop> {
  const drop: PendingDrop = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    kind,
    body,
  };
  const db = await getDb();
  await db.put(STORE, drop);
  notifyListeners();
  return drop;
}

export async function listPending(): Promise<PendingDrop[]> {
  const db = await getDb();
  return (await db.getAll(STORE)) as PendingDrop[];
}

export async function countPending(): Promise<number> {
  const db = await getDb();
  return await db.count(STORE);
}

export async function removePending(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
  notifyListeners();
}

/** POST a single pending drop. Returns the created drop on success, or null. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function flushOne(p: PendingDrop): Promise<any | null> {
  try {
    const res = await fetch("/api/drops", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(p.body),
    });
    if (!res.ok) return null;
    const json = await res.json();
    await removePending(p.id);
    return json.drop ?? null;
  } catch {
    return null;
  }
}

/** Flush every queued drop. Returns number of successes. */
export async function flushAll(): Promise<number> {
  const items = await listPending();
  let ok = 0;
  for (const p of items) {
    const res = await flushOne(p);
    if (res) ok++;
  }
  return ok;
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function onPendingChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* no-op */
    }
  });
  // Cross-tab sync — BroadcastChannel makes other tabs refresh their count.
  try {
    const ch = new BroadcastChannel("canvus-offline");
    ch.postMessage({ t: "change" });
    ch.close();
  } catch {
    /* no-op */
  }
}
