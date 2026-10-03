import { api } from './apiClient';

export interface EarningsSummary {
    commissionRate: number;
    currency: string;
    payable: { amount: number; bookings: number };
    upcoming: { amount: number; bookings: number };
    inPendingPayouts: number;
    paidOut: number;
}

export interface Payout {
    id: string;
    sellerId: string;
    sellerName?: string;
    sellerEmail?: string;
    amount: number;
    currency: string;
    bookingCount: number;
    status: 'pending' | 'paid';
    reference: string | null;
    notes: string | null;
    paidAt: string | null;
    createdAt: string;
}

export interface PayoutStatement extends Payout {
    items: Array<{
        id: string;
        bookingReference: string;
        tourTitle: string;
        departureDate: string;
        contactName: string;
        total: number;
        commissionRate: number | null;
        commissionAmount: number;
        sellerEarning: number;
    }>;
}

export interface SellerBalance {
    sellerId: string;
    name: string;
    email: string;
    commissionRate: number | null;
    amount: number;
    bookings: number;
}

const err = (e: any, fallback: string) => new Error(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? fallback);
const data = async <T,>(p: Promise<{ data: { data: T } }>, fallback: string): Promise<T> => {
    try { return (await p).data.data; } catch (e) { throw err(e, fallback); }
};

export const getEarningsSummary = () => data<EarningsSummary>(api.get('/payouts/me/summary'), 'Could not load your earnings.');
export const getMyPayouts = () => data<Payout[]>(api.get('/payouts/me'), 'Could not load your payouts.');
export const getPayoutStatement = (id: string) => data<PayoutStatement>(api.get(`/payouts/${id}`), 'Could not load that statement.');

export const getSellerBalances = () => data<SellerBalance[]>(api.get('/payouts/admin/balances'), 'Could not load seller balances.');
export const getAllPayouts = () => data<Payout[]>(api.get('/payouts/admin/all'), 'Could not load payouts.');
export const createPayout = (sellerId: string, notes?: string) => data<Payout>(api.post('/payouts', { sellerId, notes }), 'Could not create the payout.');
export const markPayoutPaid = (id: string, reference: string) => data<Payout>(api.patch(`/payouts/${id}/pay`, { reference }), 'Could not mark the payout as paid.');
export const deletePayout = async (id: string) => { try { await api.delete(`/payouts/${id}`); } catch (e) { throw err(e, 'Could not delete the payout.'); } };
export const getDefaultCommission = () => data<{ defaultRate: number }>(api.get('/payouts/admin/commission'), 'Could not load commission settings.');
export const setDefaultCommission = (defaultRate: number) => data<{ defaultRate: number }>(api.put('/payouts/admin/commission', { defaultRate }), 'Could not save the commission.');
export const setSellerCommission = (sellerId: string, rate: number | null) => data<{ rate: number | null }>(api.put(`/payouts/admin/sellers/${sellerId}/commission`, { rate }), 'Could not save the seller\'s commission.');
