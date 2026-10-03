import { api } from './apiClient';

export interface CurrencyRates {
    base: 'USD';
    rates: Record<string, number>;
    updatedAt: string;
    /** 'fallback' means the live source was unreachable and rough built-in rates are in use. */
    source: 'live' | 'fallback';
}

export const getCurrencyRates = async (): Promise<CurrencyRates> => {
    const response = await api.get('/currency/rates');
    return (response.data?.data ?? response.data) as CurrencyRates;
};
