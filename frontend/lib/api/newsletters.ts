import { api } from './apiClient';

export interface Newsletter {
    id: string;
    subject: string;
    body: string;
    status: 'sending' | 'sent' | 'failed';
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    sentAt: string | null;
    createdAt: string;
}

export interface NewsletterHistory {
    items: Newsletter[];
    activeSubscribers: number;
}

const message = (e: any, fallback: string) => new Error(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? fallback);

export const listNewsletters = async (): Promise<NewsletterHistory> => {
    try { return (await api.get('/newsletters')).data.data; } catch (e) { throw message(e, 'Could not load newsletters.'); }
};

/** Sends one copy to `testEmail` only (nothing is recorded). */
export const sendTestNewsletter = async (input: { subject: string; body: string; testEmail: string }): Promise<void> => {
    try { await api.post('/newsletters', input); } catch (e) { throw message(e, 'Could not send the test email.'); }
};

/** Sends to every active subscriber; delivery continues on the server after this returns. */
export const sendNewsletter = async (input: { subject: string; body: string }): Promise<Newsletter> => {
    try { return (await api.post('/newsletters', input)).data.data; } catch (e) { throw message(e, 'Could not send the newsletter.'); }
};
