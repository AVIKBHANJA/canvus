"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { highlight } from "@/lib/shiki";

/** Code block with lazy Shiki highlighting. */
function CodeBlock({
  code,
  lang,
}: {
  code: string;
  lang: string;
}) {
  const [html, setHtml] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    highlight(code, lang).then((h) => {
      if (!cancelled) setHtml(h);
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  if (!html) {
    return (
      <pre className="mono overflow-x-auto rounded-[12px] border border-[var(--color-border-mute)] bg-[var(--color-surface-2)] p-3 text-xs leading-relaxed text-[var(--color-fg)]">
        <code>{code}</code>
      </pre>
    );
  }
  return (
    <div
      className="markdown-code"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MarkdownBody({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("canvus-prose", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: c, children, ...props }) {
            const match = /language-(\w+)/.exec(c || "");
            const code = String(children ?? "").replace(/\n$/, "");
            const isBlock = code.includes("\n") || !!match;
            if (!isBlock) {
              return (
                <code
                  className="mono rounded-[6px] border border-[var(--color-border-mute)] bg-[var(--color-surface-2)] px-1.5 py-[1px] text-[0.9em] text-[var(--color-fg)]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock code={code} lang={match?.[1] ?? "md"} />;
          },
          a({ href, children, ...props }) {
            const isExternal = !!href && /^https?:\/\//i.test(href);
            return (
              <a
                {...props}
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={(e) => e.stopPropagation()}
                className="group inline-flex items-center gap-0.5 text-[var(--color-accent)] underline decoration-[color-mix(in_oklch,var(--color-accent)_50%,transparent)] underline-offset-4 hover:decoration-[var(--color-accent)]"
              >
                {children}
                {isExternal && (
                  <ExternalLink className="ml-0.5 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
