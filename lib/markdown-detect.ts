/**
 * Heuristic markdown detector for plain-text drops.
 * Returns true when ≥ 2 distinct markdown signals are present — avoids
 * false-positive-rendering of casual snippets that happen to include "**".
 */
export function looksLikeMarkdown(s: string): boolean {
  if (!s || s.length < 4) return false;
  const signals: boolean[] = [
    /^#{1,6}\s/m.test(s), // heading
    /^```/m.test(s), // fenced code
    /^[-*+]\s/m.test(s), // unordered list
    /^\d+\.\s/m.test(s), // ordered list
    /^>\s/m.test(s), // blockquote
    /\*\*[^*\n]+\*\*/.test(s), // bold
    /(^|\s)_[^_\n]+_(\s|$)/.test(s), // italics
    /\[[^\]]+\]\([^)]+\)/.test(s), // link
    /`[^`\n]+`/.test(s), // inline code
    /^\|.*\|.*$/m.test(s) && /\n\|[-: |]+\|/.test(s), // table
  ];
  return signals.filter(Boolean).length >= 2;
}
