import { createClient } from "@/lib/supabase/server";
import { Feed } from "@/components/feed";
import {
  collectionFromRow,
  fromRow,
  type CollectionRow,
  type DropRow,
} from "@/lib/types";
import { isUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    title?: string;
    text?: string;
    url?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sp = await searchParams;

  let prefill: { text?: string; url?: string } | undefined;
  if (sp.url) {
    prefill = { url: sp.url };
  } else {
    const combined = [sp.title, sp.text].filter(Boolean).join("\n").trim();
    if (combined) {
      prefill = isUrl(combined) ? { url: combined } : { text: combined };
    }
  }

  const [dropsRes, collectionsRes] = await Promise.all([
    supabase
      .from("canvus_drops")
      .select("*")
      .eq("user_id", user.id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50),
    supabase
      .from("canvus_collections")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  if (dropsRes.error) {
    console.error("[feed] drops fetch failed", dropsRes.error);
  }
  if (collectionsRes.error) {
    console.error("[feed] collections fetch failed", collectionsRes.error);
  }

  const drops = ((dropsRes.data ?? []) as DropRow[]).map(fromRow);
  const collections = ((collectionsRes.data ?? []) as CollectionRow[]).map(
    collectionFromRow,
  );

  return (
    <Feed
      userId={user.id}
      initialDrops={drops}
      initialCollections={collections}
      prefill={prefill}
    />
  );
}
