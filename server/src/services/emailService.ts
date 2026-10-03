import nodemailer, { type Transporter } from 'nodemailer';
import { asc, eq, inArray } from 'drizzle-orm';
import { db, bookings, tours, tourAuthors, users, conversations, conversationMessages } from '../db';
import { config } from '../config/config';

/**
 * Transactional email for bookings and enquiries.
 *
 * Every public function here is best-effort: it logs and returns, it never throws, so an SMTP outage
 * can never fail a booking, cancellation or enquiry. Callers fire these without awaiting
 * (`void notifyX(...)`), after the database write has succeeded.
 *
 * (Account verification and password-reset emails live in controller/maileroo.ts.)
 */

type BookingRow = typeof bookings.$inferSelect;

// ---------------------------------------------------------------------------
// sending
// ---------------------------------------------------------------------------
let transporter: Transporter | null | undefined;
let warnedUnconfigured = false;

/** Test hook: swap the SMTP transport (e.g. nodemailer's jsonTransport) to capture messages. */
export function setEmailTransportForTests(t: Transporter | null | undefined) {
  transporter = t;
}

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const user = process.env.MAILEROO_SMTP_USER;
  const pass = process.env.MAILEROO_SMTP_PASS;
  if (!user || !pass) {
    if (!warnedUnconfigured) {
      console.warn('[email] MAILEROO_SMTP_USER / MAILEROO_SMTP_PASS are not set — transactional emails are skipped.');
      warnedUnconfigured = true;
    }
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.MAILEROO_SMTP_HOST || 'smtp.maileroo.com',
    port: parseInt(process.env.MAILEROO_SMTP_PORT || '587', 10),
    secure: false, // STARTTLS on 587
    auth: { user, pass },
  });
  return transporter;
}

const fromAddress = () => process.env.MAILEROO_FROM_EMAIL || process.env.MAILEROO_SMTP_USER || 'info@tourbnt.com';

export interface OutgoingEmail {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/** Sends one email. Returns whether it was handed to the mail server; never throws. */
export async function sendEmail(mail: OutgoingEmail): Promise<boolean> {
  const to = (Array.isArray(mail.to) ? mail.to : [mail.to]).map((e) => e?.trim()).filter((e): e is string => !!e && e.includes('@'));
  if (to.length === 0) return false;
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({ from: `"TourBNT" <${fromAddress()}>`, to, subject: mail.subject, text: mail.text, html: mail.html, replyTo: mail.replyTo });
    return true;
  } catch (err) {
    console.error(`[email] Failed to send "${mail.subject}" to ${to.join(', ')}:`, (err as Error).message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// template helpers
// ---------------------------------------------------------------------------
/** Everything interpolated into HTML goes through this — names, messages and titles are user input. */
const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** The public site address, from FRONTEND_DOMAIN (which may list several comma-separated origins). */
export function siteUrl(): string {
  const first = (config.frontendDomain ?? '').split(',').map((d) => d.trim()).find((d) => /^https?:\/\//.test(d));
  return (first ?? 'https://tourbnt.com').replace(/\/+$/, '');
}

const money = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount ?? 0);

const dateLong = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

type Row = [label: string, value: string];

interface Layout {
  heading: string;
  intro: string;
  rows?: Row[];
  cta?: { label: string; url: string };
  outro?: string;
}

/** One consistent look for every email; returns matching HTML and plain-text bodies. */
function render(l: Layout): { html: string; text: string } {
  const rows = (l.rows ?? []).filter(([, v]) => v !== '');
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(l.heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" style="border-collapse:collapse;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" style="width:100%;max-width:600px;border-collapse:collapse;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
<tr><td style="padding:28px 30px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);text-align:center;">
<div style="color:#ffffff;font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.85;">TourBNT</div>
<h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;line-height:1.3;">${esc(l.heading)}</h1></td></tr>
<tr><td style="padding:30px;">
<p style="margin:0 0 20px;color:#444444;font-size:16px;line-height:1.6;">${l.intro}</p>
${rows.length ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 24px;border:1px solid #eeeeee;border-radius:6px;">${rows
    .map(([k, v], i) => `<tr style="background:${i % 2 ? '#ffffff' : '#fafafa'};"><td style="padding:10px 14px;color:#888888;font-size:14px;width:38%;vertical-align:top;">${esc(k)}</td><td style="padding:10px 14px;color:#222222;font-size:14px;font-weight:600;">${v}</td></tr>`)
    .join('')}</table>` : ''}
${l.cta ? `<p style="margin:0 0 24px;text-align:center;"><a href="${esc(l.cta.url)}" style="display:inline-block;padding:13px 28px;background:#667eea;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">${esc(l.cta.label)}</a></p>` : ''}
${l.outro ? `<p style="margin:0;color:#777777;font-size:14px;line-height:1.6;">${l.outro}</p>` : ''}
</td></tr>
<tr><td style="padding:18px 30px;background:#fafafa;text-align:center;color:#999999;font-size:12px;line-height:1.6;">
You are receiving this because of activity on your TourBNT account or a booking made with this email address.<br>
<a href="${esc(siteUrl())}" style="color:#667eea;text-decoration:none;">${esc(siteUrl().replace(/^https?:\/\//, ''))}</a>
</td></tr></table></td></tr></table></body></html>`;

  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const text = [
    l.heading, '', strip(l.intro), '',
    ...rows.map(([k, v]) => `${k}: ${strip(v)}`), rows.length ? '' : null,
    l.cta ? `${l.cta.label}: ${l.cta.url}` : null, l.cta ? '' : null,
    l.outro ? strip(l.outro) : null,
  ].filter((x): x is string => x !== null).join('\n');
  return { html, text };
}

// ---------------------------------------------------------------------------
// bookings
// ---------------------------------------------------------------------------
interface BookingContext {
  booking: BookingRow;
  tourTitle: string;
  sellers: Array<{ name: string; email: string }>;
}

async function loadBookingContext(bookingId: string): Promise<BookingContext | null> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return null;
  const [tour] = await db.select({ title: tours.title }).from(tours).where(eq(tours.id, booking.tourId)).limit(1);
  const authorIds = (await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(eq(tourAuthors.tourId, booking.tourId))).map((a) => a.userId);
  const sellers = authorIds.length
    ? await db.select({ name: users.name, email: users.email }).from(users).where(inArray(users.id, authorIds))
    : [];
  return { booking, tourTitle: tour?.title ?? booking.tourTitle, sellers };
}

const travellersLine = (b: BookingRow) => {
  const p = b.participants;
  return [p.adults ? `${p.adults} adult${p.adults > 1 ? 's' : ''}` : '', p.children ? `${p.children} child${p.children > 1 ? 'ren' : ''}` : '', p.infants ? `${p.infants} infant${p.infants > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
};

const paymentTermsLine = (b: BookingRow) => {
  const pr = b.pricing;
  if (b.paymentType === 'pay_on_arrival') return `Pay on arrival — ${money(pr.totalPrice, pr.currency)}`;
  if (b.paymentType === 'deposit_percentage') return `${pr.depositPercentage ?? ''}% deposit (${money(pr.amountDueNow, pr.currency)}) now, ${money(pr.amountDueLater, pr.currency)} later`;
  return `Full payment — ${money(pr.totalPrice, pr.currency)}`;
};

const bookingRows = (c: BookingContext): Row[] => {
  const b = c.booking;
  return [
    ['Booking reference', esc(b.bookingReference)],
    ['Tour', esc(c.tourTitle)],
    ['Departure date', esc(dateLong(b.departureDate))],
    ['Travellers', esc(travellersLine(b))],
    ['Total price', esc(money(b.pricing.totalPrice, b.pricing.currency))],
    ['Payment terms', esc(paymentTermsLine(b))],
  ];
};

const bookingLink = (b: BookingRow) => `${siteUrl()}/booking/confirmation/${b.id}`;

/** New booking: confirmation to the traveller, alert to the tour's seller(s). */
export async function notifyBookingCreated(bookingId: string): Promise<void> {
  try {
    const c = await loadBookingContext(bookingId);
    if (!c) return;
    const b = c.booking;

    const traveller = render({
      heading: 'Your booking request is in',
      intro: `Hi ${esc(b.contactName)}, thank you for booking <strong>${esc(c.tourTitle)}</strong>. Your booking is now <strong>${esc(b.status)}</strong> and we have let the tour operator know.`,
      rows: [...bookingRows(c), ['Payment status', esc(b.paymentStatus === 'paid' ? 'Paid' : 'Unpaid — you will get a receipt when payment is received')]],
      cta: { label: 'View your booking', url: bookingLink(b) },
      outro: b.specialRequests ? `Your note to the operator: “${esc(b.specialRequests)}”.<br>Keep your booking reference handy if you contact us.` : 'Keep your booking reference handy if you contact us.',
    });
    await sendEmail({ to: b.contactEmail, subject: `Booking received: ${c.tourTitle} (${b.bookingReference})`, ...traveller });

    if (c.sellers.length) {
      const seller = render({
        heading: 'You have a new booking',
        intro: `A traveller just booked <strong>${esc(c.tourTitle)}</strong>. Review it in your dashboard and confirm or follow up.`,
        rows: [...bookingRows(c), ['Traveller', esc(b.contactName)], ['Email', esc(b.contactEmail)], ['Phone', esc(b.contactPhone)], ['Special requests', esc(b.specialRequests ?? '')]],
        cta: { label: 'Open bookings', url: `${siteUrl()}/dashboard/tours/bookings` },
      });
      await sendEmail({ to: c.sellers.map((s) => s.email), subject: `New booking: ${c.tourTitle} on ${new Date(b.departureDate).toISOString().slice(0, 10)} (${b.bookingReference})`, replyTo: b.contactEmail, ...seller });
    }
  } catch (err) {
    console.error('[email] notifyBookingCreated failed:', (err as Error).message);
  }
}

/** Operator confirmed the booking. */
export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  try {
    const c = await loadBookingContext(bookingId);
    if (!c) return;
    const b = c.booking;
    const m = render({
      heading: 'Your booking is confirmed',
      intro: `Good news, ${esc(b.contactName)} — <strong>${esc(c.tourTitle)}</strong> is confirmed for ${esc(dateLong(b.departureDate))}.`,
      rows: bookingRows(c),
      cta: { label: 'View booking and voucher', url: bookingLink(b) },
      outro: 'Your voucher is available from the booking page. Have a wonderful trip!',
    });
    await sendEmail({ to: b.contactEmail, subject: `Confirmed: ${c.tourTitle} (${b.bookingReference})`, ...m });
  } catch (err) {
    console.error('[email] notifyBookingConfirmed failed:', (err as Error).message);
  }
}

/** Cancellation: notice to the traveller and the seller(s). */
export async function notifyBookingCancelled(bookingId: string): Promise<void> {
  try {
    const c = await loadBookingContext(bookingId);
    if (!c) return;
    const b = c.booking;
    const reason = b.cancellationReason ? `Reason given: “${esc(b.cancellationReason)}”.` : '';
    const refundNote = b.paidAmount > 0 ? `You have paid ${esc(money(b.paidAmount, b.pricing.currency))} on this booking; any refund follows the tour's cancellation policy and will be arranged separately.` : '';

    const traveller = render({
      heading: 'Your booking was cancelled',
      intro: `Hi ${esc(b.contactName)}, your booking for <strong>${esc(c.tourTitle)}</strong> has been cancelled. ${reason}`,
      rows: bookingRows(c),
      cta: { label: 'Browse other tours', url: `${siteUrl()}/tours` },
      outro: [refundNote, 'If this was a mistake, please contact the operator or reply to this email.'].filter(Boolean).join('<br>'),
    });
    await sendEmail({ to: b.contactEmail, subject: `Cancelled: ${c.tourTitle} (${b.bookingReference})`, ...traveller });

    if (c.sellers.length) {
      const seller = render({
        heading: 'A booking was cancelled',
        intro: `The booking for <strong>${esc(c.tourTitle)}</strong> on ${esc(dateLong(b.departureDate))} was cancelled. ${reason}`,
        rows: [...bookingRows(c), ['Traveller', esc(b.contactName)]],
        cta: { label: 'Open bookings', url: `${siteUrl()}/dashboard/tours/bookings` },
      });
      await sendEmail({ to: c.sellers.map((s) => s.email), subject: `Cancelled: ${c.tourTitle} (${b.bookingReference})`, ...seller });
    }
  } catch (err) {
    console.error('[email] notifyBookingCancelled failed:', (err as Error).message);
  }
}

/** Payment received (paid or partial): the receipt. Called whenever a booking's payment status moves to one of those. */
export async function notifyPaymentReceived(bookingId: string): Promise<void> {
  try {
    const c = await loadBookingContext(bookingId);
    if (!c) return;
    const b = c.booking;
    const remaining = Math.max(0, b.pricing.totalPrice - b.paidAmount);
    const m = render({
      heading: 'Payment received',
      intro: `Hi ${esc(b.contactName)}, we have received your payment for <strong>${esc(c.tourTitle)}</strong>. Thank you!`,
      rows: [
        ['Booking reference', esc(b.bookingReference)],
        ['Amount paid', esc(money(b.paidAmount, b.pricing.currency))],
        ['Balance remaining', esc(remaining > 0 ? money(remaining, b.pricing.currency) : 'None — paid in full')],
        ['Payment method', esc(b.paymentMethod ?? '')],
        ['Transaction ID', esc(b.transactionId ?? '')],
        ['Date', esc(dateLong(new Date()))],
      ],
      cta: { label: 'View booking', url: bookingLink(b) },
      outro: 'Keep this email as your receipt.',
    });
    await sendEmail({ to: b.contactEmail, subject: `Receipt: ${c.tourTitle} (${b.bookingReference})`, ...m });
  } catch (err) {
    console.error('[email] notifyPaymentReceived failed:', (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// enquiries and contact form
// ---------------------------------------------------------------------------
async function adminEmails(): Promise<string[]> {
  const configured = (process.env.ADMIN_NOTIFY_EMAIL ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  if (configured.length) return configured;
  const rows = await db.select({ email: users.email }).from(users).where(eq(users.role, 'admin')).limit(5);
  return rows.map((r) => r.email);
}

/**
 * A tour enquiry or contact-form message: alert to the seller(s) (enquiry) or admins (contact), and a
 * short acknowledgement to the sender. Reply-To on the alert is the sender, so replying just works.
 */
export async function notifyEnquiryCreated(conversationId: string): Promise<void> {
  try {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    if (!conv) return;

    let senderName = conv.guestName ?? 'A visitor';
    let senderEmail = conv.guestEmail ?? '';
    if (conv.fromUserId) {
      const [u] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, conv.fromUserId)).limit(1);
      if (u) { senderName = u.name; senderEmail = u.email; }
    }

    const [first] = await db.select({ content: conversationMessages.content }).from(conversationMessages).where(eq(conversationMessages.conversationId, conv.id)).orderBy(asc(conversationMessages.createdAt)).limit(1);
    const messageBody = (first?.content ?? '').slice(0, 1500);
    let tourTitle = '';
    let recipients: string[] = [];
    if (conv.type === 'enquiry' && conv.tourId) {
      const [t] = await db.select({ title: tours.title }).from(tours).where(eq(tours.id, conv.tourId)).limit(1);
      tourTitle = t?.title ?? '';
      const authors = await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(eq(tourAuthors.tourId, conv.tourId));
      recipients = authors.length ? (await db.select({ email: users.email }).from(users).where(inArray(users.id, authors.map((a) => a.userId)))).map((r) => r.email) : [];
    }
    if (recipients.length === 0) recipients = await adminEmails(); // contact form, or an enquiry on a tour with no author

    const alert = render({
      heading: conv.type === 'enquiry' ? 'New tour enquiry' : 'New message from the contact form',
      intro: `${esc(senderName)} wrote:<br><br><span style="white-space:pre-wrap;">${esc(messageBody)}</span>`,
      rows: [['Subject', esc(conv.subject)], ['From', esc(senderName)], ['Email', esc(senderEmail)], ['Tour', esc(tourTitle)]],
      cta: { label: 'Read and reply', url: `${siteUrl()}/dashboard/message` },
      outro: 'You can reply from your dashboard, or reply to this email to write to them directly.',
    });
    await sendEmail({ to: recipients, subject: conv.type === 'enquiry' ? `Enquiry: ${tourTitle || conv.subject}` : `Contact form: ${conv.subject}`, replyTo: senderEmail || undefined, ...alert });

    if (senderEmail) {
      const ack = render({
        heading: 'We got your message',
        intro: `Hi ${esc(senderName)}, thanks for getting in touch${tourTitle ? ` about <strong>${esc(tourTitle)}</strong>` : ''}. ${conv.type === 'enquiry' ? 'The tour operator has been notified and will reply soon.' : 'Our team will reply as soon as we can.'}`,
        rows: [['Your subject', esc(conv.subject)]],
        cta: conv.tourId ? { label: 'Back to the tour', url: `${siteUrl()}/tours/${conv.tourId}` } : { label: 'Explore tours', url: `${siteUrl()}/tours` },
      });
      await sendEmail({ to: senderEmail, subject: 'We received your message', ...ack });
    }
  } catch (err) {
    console.error('[email] notifyEnquiryCreated failed:', (err as Error).message);
  }
}

/** Exposed for tests and for previewing templates without a database. */
export const __testing = { render, esc, money };
