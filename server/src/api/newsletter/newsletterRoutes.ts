import express from 'express';
import createHttpError from 'http-errors';
import { count, desc, eq, isNull } from 'drizzle-orm';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { asyncAuthHandler } from '../../utils/routeWrapper';
import { sendSuccess } from '../../utils/apiResponse';
import { db, newsletters, subscribers } from '../../db';
import { renderNewsletter, sendEmail } from '../../services/emailService';

const router = express.Router();
router.use(authenticate, authorizeRoles('admin'));

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GAP_MS = 120; // pace sending so the mail provider's rate limits are respected

/** Past campaigns, newest first, plus how many people a send would reach right now. */
router.get('/', asyncAuthHandler(async (_req, res) => {
  const [items, [{ active }]] = await Promise.all([
    db.select().from(newsletters).orderBy(desc(newsletters.createdAt)).limit(50),
    db.select({ active: count() }).from(subscribers).where(isNull(subscribers.unsubscribedAt)),
  ]);
  sendSuccess(res, { items, activeSubscribers: Number(active) }, 'Newsletters');
}));

/**
 * POST /api/v1/newsletters  { subject, body, testEmail? }
 *  - with testEmail: sends one copy to that address only (nothing is recorded) so you can see how it looks;
 *  - otherwise: sends to every subscriber who has not unsubscribed. Returns straight away; delivery continues in the
 *    background and the counts on the newsletter record fill in as it goes.
 * `body` is plain text; a blank line starts a new paragraph.
 */
router.post('/', asyncAuthHandler(async (req, res) => {
  const subject = String(req.body?.subject ?? '').trim();
  const body = String(req.body?.body ?? '').trim();
  if (subject.length < 3 || subject.length > 150) throw createHttpError(400, 'Subject must be between 3 and 150 characters.');
  if (body.length < 10) throw createHttpError(400, 'Write a message first.');

  const testEmail = req.body?.testEmail ? String(req.body.testEmail).trim() : '';
  if (testEmail) {
    if (!EMAIL_REGEX.test(testEmail)) throw createHttpError(400, 'Enter a valid test email address.');
    const mail = renderNewsletter({ subject: `[Test] ${subject}`, body, unsubscribeToken: 'test-token-not-a-real-subscriber' });
    const ok = await sendEmail({ ...mail, to: testEmail });
    if (!ok) throw createHttpError(502, 'The test email could not be sent. Check the email settings on the server.');
    return sendSuccess(res, { sent: 1 }, 'Test email sent');
  }

  const recipients = await db.select({ email: subscribers.email, token: subscribers.unsubscribeToken }).from(subscribers).where(isNull(subscribers.unsubscribedAt));
  if (recipients.length === 0) throw createHttpError(400, 'There are no active subscribers to send to.');

  const [record] = await db.insert(newsletters).values({ subject, body, sentBy: req.user!.id, recipientCount: recipients.length }).returning();

  void (async () => {
    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      const ok = await sendEmail({ ...renderNewsletter({ subject, body, unsubscribeToken: r.token }), to: r.email });
      if (ok) sent++; else failed++;
      // Keep the record roughly current without a write per email.
      if ((sent + failed) % 20 === 0) await db.update(newsletters).set({ sentCount: sent, failedCount: failed, updatedAt: new Date() }).where(eq(newsletters.id, record.id)).catch(() => undefined);
      await new Promise((r2) => setTimeout(r2, GAP_MS));
    }
    await db.update(newsletters).set({ sentCount: sent, failedCount: failed, status: sent === 0 ? 'failed' : 'sent', sentAt: new Date(), updatedAt: new Date() }).where(eq(newsletters.id, record.id)).catch(() => undefined);
    console.log(`[newsletter] "${subject}" delivered: ${sent} sent, ${failed} failed of ${recipients.length}`);
  })();

  sendSuccess(res, record, 'Newsletter is being sent', 202);
}));

export default router;
