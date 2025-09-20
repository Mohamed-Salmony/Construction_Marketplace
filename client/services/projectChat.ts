import { api } from '@/lib/api';

export type ProjectConversationDto = {
  id: number;
  projectId: number;
  customerId: string;
  customerName?: string;
  merchantId: string;
  merchantName?: string;
};

export type ProjectMessageDto = {
  id: number;
  from: string;
  text: string;
  createdAt: string;
};

export async function createProjectConversation(projectId: number, merchantId: string) {
  return api.post<{ id: number }>(`/api/ProjectChat/conversations`, { projectId, merchantId }, { auth: true });
}

export async function getProjectConversation(id: number) {
  return api.get<ProjectConversationDto>(`/api/ProjectChat/conversations/${id}`, { auth: true });
}

export async function getProjectConversationByKeys(projectId: number, merchantId: string) {
  return api.get<{ id: number }>(`/api/ProjectChat/by?projectId=${projectId}&merchantId=${encodeURIComponent(merchantId)}`, { auth: true });
}

export async function listProjectMessages(conversationId: number) {
  return api.get<ProjectMessageDto[]>(`/api/ProjectChat/conversations/${conversationId}/messages`, { auth: true });
}

export async function sendProjectMessage(conversationId: number, text: string) {
  return api.post<{ id: number }>(`/api/ProjectChat/conversations/${conversationId}/messages`, { text }, { auth: true });
}

// Notifications helpers for ProjectChat
export async function getVendorProjectMessageCount() {
  return api.get<{ count: number }>(`/api/ProjectChat/message-count`, { auth: true });
}

export async function getVendorProjectRecentMessages() {
  return api.get<Array<{ conversationId: number; projectId: number; message: string; at: string; from: string }>>(`/api/ProjectChat/messages/recent`, { auth: true });
}

export async function getCustomerProjectMessageCount() {
  return api.get<{ count: number }>(`/api/ProjectChat/customer/message-count`, { auth: true });
}

export async function getCustomerProjectRecentMessages() {
  return api.get<Array<{ conversationId: number; projectId: number; message: string; at: string; from: string }>>(`/api/ProjectChat/customer/messages/recent`, { auth: true });
}
