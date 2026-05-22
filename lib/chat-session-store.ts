import { getIncludedChatAttachments } from '@/lib/chat-attachments';

import type { ChatAttachment, ChatAttachmentSnapshot } from '@/lib/chat-attachments';

export const CHAT_SESSION_COOKIE_NAME = 'otro_gpt_session_id';

export type ChatImageAspectRatio = '1:1' | '16:9' | '9:16' | 'auto';

export interface ChatTextMessageContent {
  attachments?: ChatAttachmentSnapshot[];
  text: string;
  type: 'text';
}

export interface ChatImageMessageContent {
  aspectRatio: ChatImageAspectRatio;
  imageBase64: string;
  mimeType: string;
  prompt: string;
  type: 'image';
}

export interface ChatMessage {
  content: ChatImageMessageContent | ChatTextMessageContent;
  role: 'assistant' | 'user';
}

interface ChatSessionState {
  attachments: ChatAttachment[];
  messages: ChatMessage[];
}

type SessionStore = Map<string, ChatSessionState>;
type GlobalWithSessionStore = typeof globalThis & {
  otroGptSessionStore?: SessionStore;
};

const globalWithSessionStore = globalThis as GlobalWithSessionStore;

const sessionStore: SessionStore =
  globalWithSessionStore.otroGptSessionStore ?? new Map<string, ChatSessionState>();

if (!globalWithSessionStore.otroGptSessionStore) {
  globalWithSessionStore.otroGptSessionStore = sessionStore;
}

function getOrCreateSessionState(sessionId: string): ChatSessionState {
  const existingSessionState = sessionStore.get(sessionId);

  if (existingSessionState) {
    return existingSessionState;
  }

  const nextState: ChatSessionState = {
    attachments: [],
    messages: [],
  };
  sessionStore.set(sessionId, nextState);

  return nextState;
}

export function appendSessionMessage(sessionId: string, message: ChatMessage): void {
  const sessionState = getOrCreateSessionState(sessionId);
  sessionState.messages.push(message);
}

export function addSessionAttachments(sessionId: string, attachments: ChatAttachment[]): void {
  if (!attachments.length) {
    return;
  }

  const sessionState = getOrCreateSessionState(sessionId);
  sessionState.attachments.push(...attachments);
}

export function removeSessionAttachment(
  sessionId: string,
  attachmentId: string
): ChatAttachment | null {
  const sessionState = sessionStore.get(sessionId);

  if (!sessionState) {
    return null;
  }

  const nextAttachments = sessionState.attachments.filter(
    (attachment) => attachment.id !== attachmentId
  );

  if (nextAttachments.length === sessionState.attachments.length) {
    return null;
  }

  const removedAttachment = sessionState.attachments.find(
    (attachment) => attachment.id === attachmentId
  );

  if (!removedAttachment) {
    return null;
  }

  sessionState.attachments = nextAttachments;

  return removedAttachment;
}

export function clearSessionData(sessionId: string): { fileIdsToDelete: string[] } {
  const existingSessionState = sessionStore.get(sessionId);

  if (!existingSessionState) {
    return { fileIdsToDelete: [] };
  }

  const fileIdsToDelete = existingSessionState.attachments.map((attachment) => attachment.fileId);

  sessionStore.delete(sessionId);

  return { fileIdsToDelete };
}

export function getSessionMessages(sessionId?: string): ChatMessage[] {
  if (!sessionId) {
    return [];
  }

  return sessionStore.get(sessionId)?.messages ?? [];
}

export function getSessionAttachments(sessionId?: string): ChatAttachment[] {
  if (!sessionId) {
    return [];
  }

  return sessionStore.get(sessionId)?.attachments ?? [];
}

export function getSessionContextAttachments(sessionId?: string): ChatAttachment[] {
  return getIncludedChatAttachments(getSessionAttachments(sessionId));
}

export function updateSessionAttachmentContext(
  sessionId: string,
  attachmentId: string,
  isIncludedInContext: boolean
): ChatAttachment | null {
  const sessionState = sessionStore.get(sessionId);

  if (!sessionState) {
    return null;
  }

  const attachment = sessionState.attachments.find((candidate) => candidate.id === attachmentId);

  if (!attachment) {
    return null;
  }

  attachment.isIncludedInContext = isIncludedInContext;
  return attachment;
}
