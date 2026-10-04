import { api, apiErrorMessage } from './apiClient';

export interface PromoCode {
    id: string;
    code: string;
    description: string | null;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxDiscountAmount: number | null;
    minBookingAmount: number | null;
    startsAt: string | null;
    expiresAt: string | null;
    maxUses: number | null;
    usedCount: number;
    isActive: boolean;
    ownerId: string;
    tourIds: string[] | null;
    createdAt: string;
}

export type PromoInput = Partial<Pick<PromoCode, 'code' | 'description' | 'discountType' | 'discountValue' | 'maxDiscountAmount' | 'minBookingAmount' | 'startsAt' | 'expiresAt' | 'maxUses' | 'isActive' | 'tourIds'>>;

const message = (e: unknown, fallback: string) => new Error(apiErrorMessage(e, fallback));

export const listPromoCodes = async (): Promise<PromoCode[]> => {
    try { return (await api.get('/promo-codes')).data.data; } catch (e) { throw message(e, 'Could not load promo codes.'); }
};
export const createPromoCode = async (input: PromoInput): Promise<PromoCode> => {
    try { return (await api.post('/promo-codes', input)).data.data; } catch (e) { throw message(e, 'Could not create the promo code.'); }
};
export const updatePromoCode = async (id: string, input: PromoInput): Promise<PromoCode> => {
    try { return (await api.patch(`/promo-codes/${id}`, input)).data.data; } catch (e) { throw message(e, 'Could not update the promo code.'); }
};
export const deletePromoCode = async (id: string): Promise<void> => {
    try { await api.delete(`/promo-codes/${id}`); } catch (e) { throw message(e, 'Could not delete the promo code.'); }
};
