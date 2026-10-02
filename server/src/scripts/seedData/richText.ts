/**
 * Builders for the editor's rich-text format (Novel / ProseMirror JSON).
 * The tour editor stores description / include / exclude as a JSON *string* of one of these docs;
 * the public page's RichTextRenderer and the dashboard's NovelEditor both read it back.
 */
type Node = Record<string, unknown>;

const text = (t: string): Node => ({ type: 'text', text: t });
const para = (t: string): Node => ({ type: 'paragraph', content: [text(t)] });
const heading = (t: string, level = 2): Node => ({ type: 'heading', attrs: { level }, content: [text(t)] });
const bullets = (items: string[]): Node => ({
  type: 'bulletList',
  content: items.map((i) => ({ type: 'listItem', content: [para(i)] })),
});

export const doc = (...nodes: Node[]): string => JSON.stringify({ type: 'doc', content: nodes });

export const rich = { text, para, heading, bullets, doc };

/** Heading + intro paragraphs + highlight bullets — the shape of a tour description. */
export function tourDescription(opts: { intro: string[]; highlightsTitle?: string; highlights: string[]; whoTitle?: string; who?: string; closing?: string }): string {
  const nodes: Node[] = [...opts.intro.map(para), heading(opts.highlightsTitle ?? 'Trip highlights', 3), bullets(opts.highlights)];
  if (opts.who) nodes.push(heading(opts.whoTitle ?? 'Who is this trip for?', 3), para(opts.who));
  if (opts.closing) nodes.push(para(opts.closing));
  return doc(...nodes);
}

/** A bulleted list as the inclusions / exclusions editors store it. */
export const bulletDoc = (items: string[]): string => doc(bullets(items));
