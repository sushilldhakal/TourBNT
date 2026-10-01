/**
 * Merges duplicate admin <-> person 'direct' conversations into one thread per pair.
 *
 *   npx ts-node -T src/scripts/mergeDuplicateDirectChats.ts          # dry run
 *   npx ts-node -T src/scripts/mergeDuplicateDirectChats.ts --apply  # merge
 *
 * Keeps the most recently active thread, moves the other threads' messages into it, deletes the rest.
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { eq, and, inArray, ne } from 'drizzle-orm';
import { db, conversations, conversationParticipants, conversationMessages } from '@tourbnt/db';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const apply = process.argv.includes('--apply');
  const direct = await db.select().from(conversations).where(eq(conversations.type, 'direct'));
  const parts = direct.length
    ? await db.select().from(conversationParticipants).where(inArray(conversationParticipants.conversationId, direct.map((c) => c.id)))
    : [];

  const groups = new Map<string, typeof direct>();
  for (const c of direct) {
    const target = parts.find((p) => p.conversationId === c.id && p.userId !== c.fromUserId)?.userId;
    if (!target || !c.fromUserId) continue;
    const key = `${c.fromUserId}|${target}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }

  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    list.sort((a, b) => +new Date(b.lastMessageAt ?? b.createdAt) - +new Date(a.lastMessageAt ?? a.createdAt));
    const [keep, ...dupes] = list;
    console.log(`${key}: keep "${keep.subject}", merge ${dupes.map((d) => `"${d.subject}"`).join(', ')}`);
    if (!apply) continue;
    const dupeIds = dupes.map((d) => d.id);
    await db.update(conversationMessages).set({ conversationId: keep.id }).where(inArray(conversationMessages.conversationId, dupeIds));
    await db.delete(conversations).where(and(inArray(conversations.id, dupeIds), ne(conversations.id, keep.id)));
  }
  console.log(apply ? 'Done.' : 'Dry run only — pass --apply to merge.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
