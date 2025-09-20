import { api } from '@/lib/api';

export type ReviewDto = {
  id?: string;
  productId: string;
  userId?: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt?: string;
};

export async function getReviews(productId: string) {
  return api.get<{ success: boolean; items: ReviewDto[] }>(`/api/Reviews/${encodeURIComponent(productId)}`);
}

export async function addReview(productId: string, payload: { rating: number; comment?: string }) {
  return api.post(`/api/Reviews/${encodeURIComponent(productId)}`, payload, { auth: true });
}
