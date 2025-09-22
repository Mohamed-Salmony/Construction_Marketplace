import { api } from '@/lib/api';

export type CommissionRates = {
  success: boolean;
  rates: {
    products: number;
    projectsMerchants: number;
    servicesTechnicians: number;
    rentalsMerchants: number;
    currency: string;
  };
};

export async function getCommissionRates() {
  return api.get<CommissionRates>('/api/commissions/rates', { auth: true });
}
