import { api } from '@/lib/api';

export type ProjectConversationDto = {
  id: string;
  projectId: string;
  customerId: string;
  customerName?: string;
  merchantId: string;
  merchantName?: string;
};

export type ProjectMessageDto = {
  id: string;
  from: string;
  text: string;
  createdAt: string;
};

export async function createProjectConversation(projectId: string, merchantId: string) {
  return api.post<{ id: string }>(`/api/ProjectChat/conversations`, { projectId, merchantId }, { auth: true });
}

export async function getProjectConversation(id: string) {
  return api.get<ProjectConversationDto>(`/api/ProjectChat/conversations/${id}`, { auth: true });
}

export async function getProjectConversationByKeys(projectId: string, merchantId: string) {
  return api.get<{ id: string }>(`/api/ProjectChat/by?projectId=${projectId}&merchantId=${encodeURIComponent(merchantId)}`, { auth: true });
}

export async function listProjectMessages(conversationId: string) {
  return api.get<ProjectMessageDto[]>(`/api/ProjectChat/conversations/${conversationId}/messages`, { auth: true });
}

export async function sendProjectMessage(conversationId: string, text: string) {
  return api.post<{ id: string }>(`/api/ProjectChat/conversations/${conversationId}/messages`, { text }, { auth: true });
}

// Notifications helpers for ProjectChat
export async function getVendorProjectMessageCount() {
  return api.get<{ count: number }>(`/api/ProjectChat/message-count`, { auth: true });
}

export async function getVendorProjectRecentMessages() {
  return api.get<Array<{ conversationId: string; projectId: string; message: string; at: string; from: string }>>(`/api/ProjectChat/messages/recent`, { auth: true });
}

export async function getCustomerProjectMessageCount() {
  return api.get<{ count: number }>(`/api/ProjectChat/customer/message-count`, { auth: true });
}

export async function getCustomerProjectRecentMessages() {
  return api.get<Array<{ conversationId: string; projectId: string; message: string; at: string; from: string }>>(`/api/ProjectChat/customer/messages/recent`, { auth: true });
}

// Admin/participant-agnostic fallback: list all conversations for a project where current user is a participant
export async function getConversationsByProject(projectId: string) {
  return api.get<Array<{ id: string; projectId: string; customerId: string; merchantId: string; createdAt?: string }>>(`/api/ProjectChat/project/${encodeURIComponent(projectId)}/conversations`, { auth: true });
}
