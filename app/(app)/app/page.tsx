import { createClient } from "@/lib/supabase/server";
import { Feed } from "@/components/feed";
import { fromRow, type DropRow } from "@/lib/types";
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

  // Prefill the composer if the page was opened via a PWA share_target GET
  // (some Android browsers implement it as GET) or a ?text=/?url= link.
  let prefill:
    | { text?: string; url?: string }
    | undefined;
  if (sp.url) {
    prefill = { url: sp.url };
  } else {
    const combined = [sp.title, sp.text].filter(Boolean).join("\n").trim();
    if (combined) {
      prefill = isUrl(combined) ? { url: combined } : { text: combined };
    }
  }

  // RLS restricts to current user — the filter is defense in depth.
  const { data, error } = await supabase
    .from("canvus_drops")
    .select("*")
    .eq("user_id", user.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[feed] fetch failed", error);
  }

  const drops = ((data ?? []) as DropRow[]).map(fromRow);

  return <Feed userId={user.id} initialDrops={drops} prefill={prefill} />;
}
