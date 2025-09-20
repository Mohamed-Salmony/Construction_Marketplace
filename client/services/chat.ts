import { api } from '@/lib/api';

export type ConversationDto = {
  id: string;
  serviceRequestId: string;
  vendorId: string;
  technicianId: string;
};

export type MessageDto = {
  id: string;
  from: string; // senderId
  text: string;
  createdAt: string;
};

export async function createConversation(serviceRequestId: string | number, technicianId?: string) {
  const body: any = { serviceRequestId: String(serviceRequestId) };
  if (technicianId) body.technicianId = technicianId;
  return api.post<{ id: string }>(`/api/Chat/conversations`, body, { auth: true });
}

export async function getConversation(id: string | number) {
  return api.get<ConversationDto>(`/api/Chat/conversations/${encodeURIComponent(String(id))}`, { auth: true });
}

export async function getConversationByKeys(serviceRequestId: string | number, technicianId: string) {
  const sid = encodeURIComponent(String(serviceRequestId));
  return api.get<{ id: string }>(`/api/Chat/conversations/by?serviceRequestId=${sid}&technicianId=${encodeURIComponent(technicianId)}`, { auth: true });
}

export async function listMessages(conversationId: string | number) {
  return api.get<MessageDto[]>(`/api/Chat/conversations/${encodeURIComponent(String(conversationId))}/messages`, { auth: true });
}

export async function sendMessage(conversationId: string | number, text: string) {
  return api.post<{ id: string }>(`/api/Chat/conversations/${encodeURIComponent(String(conversationId))}/messages`, { text }, { auth: true });
}

export async function getMyConversations() {
  return api.get<Array<{ id: string; serviceRequestId: string; vendorId: string; technicianId: string; updatedAt?: string; createdAt: string }>>(`/api/Chat/mine`, { auth: true });
}

export async function getConversationByService(serviceRequestId: string | number) {
  return api.get<{ id: string; serviceRequestId: string }>(`/api/Chat/by-service/${encodeURIComponent(String(serviceRequestId))}`, { auth: true });
}
