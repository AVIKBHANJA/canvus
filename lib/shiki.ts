"use client";

// `shiki/bundle/web` is a smaller, web-safe subset: no go/rust/sql. That's
// fine — code fences in a clipboard app skew heavily to ts/js/bash/md.
const LANGS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "bash",
  "shell",
  "md",
  "css",
  "html",
  "python",
  "yaml",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let singleton: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getHighlighter(): Promise<any> {
  if (singleton) return singleton;
  singleton = (async () => {
    const { createHighlighter } = await import("shiki/bundle/web");
    return createHighlighter({
      themes: ["github-dark-default"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      langs: LANGS as unknown as any,
    });
  })();
  return singleton;
}

export async function highlight(code: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  const use = (LANGS as readonly string[]).includes(lang) ? lang : "md";
  try {
    return hl.codeToHtml(code, {
      lang: use,
      theme: "github-dark-default",
    });
  } catch {
    // Unknown language — render plain.
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
