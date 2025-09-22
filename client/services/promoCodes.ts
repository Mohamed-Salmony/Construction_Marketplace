import { api } from '@/lib/api';

export interface PromoCode {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  currentUses: number;
  maxUsesPerUser: number;
  startDate: Date;
  endDate?: Date;
  minOrderAmount: number;
  isActive: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  usedBy: Array<{
    userId: string;
    usedAt: Date;
    orderAmount: number;
    discountAmount: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoCodeStats {
  total: number;
  active: number;
  expired: number;
  totalUsages: number;
}

export interface CreatePromoCodeInput {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  minOrderAmount?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ValidatePromoCodeResponse {
  success: boolean;
  message: string;
  data?: {
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    finalAmount: number;
  };
}

export interface PromoCodeListResponse {
  success: boolean;
  data: PromoCode[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: PromoCodeStats;
}

// Admin functions
export async function createPromoCode(data: CreatePromoCodeInput) {
  return api.post<{ success: boolean; message: string; data: PromoCode }>('/api/promo-codes', data, { auth: true });
}

export async function getPromoCodes(params?: {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.status) searchParams.append('status', params.status);
  if (params?.search) searchParams.append('search', params.search);

  const url = `/api/promo-codes${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  return api.get<PromoCodeListResponse>(url, { auth: true });
}

export async function updatePromoCode(id: string, data: Partial<CreatePromoCodeInput>) {
  return api.put<{ success: boolean; message: string; data: PromoCode }>(`/api/promo-codes/${id}`, data, { auth: true });
}

export async function deletePromoCode(id: string) {
  return api.del<{ success: boolean; message: string }>(`/api/promo-codes/${id}`, { auth: true });
}

// Customer functions
export async function validatePromoCode(code: string, orderAmount: number) {
  return api.post<ValidatePromoCodeResponse>('/api/promo-codes/validate', {
    code,
    orderAmount
  }, { auth: true });
}

export async function applyPromoCode(id: string, orderAmount: number) {
  return api.post<{
    success: boolean;
    message: string;
    data: {
      discountAmount: number;
      finalAmount: number;
    };
  }>(`/api/promo-codes/apply/${id}`, { orderAmount }, { auth: true });
}
