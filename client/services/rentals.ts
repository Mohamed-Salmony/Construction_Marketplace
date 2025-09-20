import { api } from '@/lib/api';

export type RentalDto = {
  id: string;
  productId: string;
  productName?: string | null;
  customerId: string;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyRate: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  imageUrl?: string | null;
};

export type CreateRentalInput = {
  productId?: string;
  productName?: string;
  customerId: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  dailyRate: number;
  securityDeposit?: number;
  currency?: string;
  deliveryAddress?: string;
  requiresDelivery?: boolean;
  deliveryFee?: number;
  requiresPickup?: boolean;
  pickupFee?: number;
  specialInstructions?: string;
  usageNotes?: string;
  imageUrl?: string;
};

export async function listMyRentals() {
  return api.get<RentalDto[]>(`/api/Rentals/mine`, { auth: true });
}

export async function createRental(input: CreateRentalInput) {
  return api.post<{ id: string }>(`/api/Rentals`, input, { auth: true });
}

export async function listPublicRentals() {
  return api.get<RentalDto[]>(`/api/Rentals/public`);
}

export async function getRentalById(id: string | number) {
  return api.get<RentalDto>(`/api/Rentals/${encodeURIComponent(String(id))}`);
}

export async function deleteRental(id: string | number) {
  return api.del<void>(`/api/Rentals/${encodeURIComponent(String(id))}`, { auth: true });
}

export type UpdateRentalInput = {
  // Dates are optional: technician will set them later
  startDate?: string;
  endDate?: string;
  dailyRate?: number;
  securityDeposit?: number | null;
  currency?: string | null;
  specialInstructions?: string | null;
  usageNotes?: string | null;
  productId?: string | null;
  customerId?: string | null;
};

export async function updateRental(id: string | number, input: Partial<UpdateRentalInput>) {
  return api.put<void>(`/api/Rentals/${encodeURIComponent(String(id))}`, input, { auth: true });
}

export async function adjustRentalDays(id: string | number, days: number) {
  return api.post(`/api/Rentals/${encodeURIComponent(String(id))}/adjust-days`, { days }, { auth: true });
}

export type SendMessageInput = { name?: string; phone?: string; message: string };
export async function sendRentalMessage(id: string | number, input: SendMessageInput) {
  return api.post(`/api/Rentals/${encodeURIComponent(String(id))}/message`, input, { auth: true });
}

export async function listRentalMessages(id: string | number) {
  return api.get(`/api/Rentals/${encodeURIComponent(String(id))}/messages`, { auth: true });
}

export async function replyRentalMessage(id: string | number, message: string, toEmail?: string) {
  return api.post(`/api/Rentals/${encodeURIComponent(String(id))}/reply`, { message, toEmail }, { auth: true });
}

// Technician channel (vendor ↔ technician)
export async function listTechRentalMessages(id: string | number) {
  // add cache-busting param to avoid stale 304s in browsers
  return api.get(`/api/Rentals/${encodeURIComponent(String(id))}/tech/messages?v=2`, { auth: true });
}

export async function sendTechRentalMessage(id: string | number, input: SendMessageInput) {
  return api.post(`/api/Rentals/${encodeURIComponent(String(id))}/tech/message`, input, { auth: true });
}

// Admin endpoints
export async function getPendingRentals() {
  return api.get(`/api/Rentals/pending`, { auth: true });
}


export async function getAllRentals() {
  return api.get(`/api/Rentals/all`, { auth: true });
}

export async function approveRental(id: string) {
  return api.post(`/api/Rentals/${id}/approve`, {}, { auth: true });
}

export async function declineRental(id: string) {
  return api.post(`/api/Rentals/${id}/decline`, {}, { auth: true });

}

export async function removeRentalAdmin(id: string) {
  return api.del<void>(`/api/Rentals/${id}/remove`, { auth: true });
}

// Vendor utilities for notifications
export async function getVendorMessageCount() {
  return api.get(`/api/Rentals/message-count`, { auth: true });
}

export async function getRecentVendorMessages() {
  return api.get(`/api/Rentals/messages/recent`, { auth: true });
}

// Customer utilities for notifications
export async function getCustomerMessageCount() {
  return api.get(`/api/Rentals/customer/message-count`, { auth: true });
}

export async function getCustomerRecentMessages() {
  return api.get(`/api/Rentals/customer/messages/recent`, { auth: true });
}

// Recent rentals where current user authored messages (technician/vendor)
export async function getMyRecentMessages() {
  return api.get(`/api/Rentals/my/messages/recent`, { auth: true });
}

// Recent rentals where current user AND a technician/worker both participated
export async function getMyRecentTechMessages() {
  // add cache-busting param to avoid stale 304s in browsers
  return api.get(`/api/Rentals/my/messages/tech/recent?v=2`, { auth: true });
}

// Vendor-specific view of recent technician-channel rental messages
export async function getMyVendorRecentTechMessages() {
  return api.get(`/api/Rentals/my/messages/tech/recent/vendor?v=2`, { auth: true });
}
