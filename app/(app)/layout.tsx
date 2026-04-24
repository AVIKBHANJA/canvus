import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "@/components/ui/toast";
import { AppHeader } from "@/components/app-header";
import { OfflineFlusher } from "@/components/offline-flusher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName =
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    null;

  return (
    <>
      <div className="relative z-10 flex min-h-dvh flex-col">
        <AppHeader email={user.email ?? ""} name={displayName} />
        <main className="flex-1">{children}</main>
      </div>
      <OfflineFlusher />
      <Toaster />
      <ServiceWorkerMount />
    </>
  );
}

function ServiceWorkerMount() {
  // Client-side SW registration, dropped inline to avoid an extra file.
  // The `?v=` query pins the cache name to the current build — whenever it
  // changes, the new SW activates a fresh cache and drops old ones.
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
  const escaped = buildId.replace(/[^a-zA-Z0-9._-]/g, "");
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function(){ navigator.serviceWorker.register('/sw.js?v=${escaped}').catch(function(){}); }); }`,
      }}
    />
  );
}
