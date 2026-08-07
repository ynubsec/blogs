/**
 * Shared MDX sanitizer used by both the server renderer (preprocessMarkdown)
 * and the admin editors (on save / live preview).
 *
 * MDX follows JSX rules, so raw HTML void elements like <img>, <br> and <hr>
 * must be self-closed. Pasting HTML into the editor used to break the Vercel
 * build ("Expected a closing tag for <img>") — this keeps content safe.
 *
 * Pure function: no imports, safe to use on the client and the server.
 */
export function sanitizeMdxContent(content: string): string {
  if (!content) return content;

  // Remove HTML comments which MDX cannot parse.
  let processed = content.replace(/<!--[\s\S]*?-->/g, "");

  // Self-close unclosed HTML void elements (e.g. <img ...> → <img ... />).
  // Handles attribute values containing > inside quotes, skips tags that are
  // already self-closed, and never touches closing tags (</img>).
  const VOID_TAGS = "area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr";
  const voidElementRegex = new RegExp(
    `<(${VOID_TAGS})\\b((?:[^>"']|"[^"]*"|'[^']*')*?)(?<!/)>`,
    "gi",
  );
  processed = processed.replace(voidElementRegex, "<$1$2 />");

  return processed;
}
