export const CHAT_SESSION_COOKIE_NAME = 'otro_gpt_session_id';

export type ChatRole = 'assistant' | 'user';
export type ChatImageAspectRatio = '1:1' | '16:9' | '9:16' | 'auto';

export interface ChatTextMessageContent {
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

export type ChatMessageContent = ChatImageMessageContent | ChatTextMessageContent;

export interface ChatMessage {
  content: ChatMessageContent;
  role: ChatRole;
}

type SessionStore = Map<string, ChatMessage[]>;
type GlobalWithSessionStore = typeof globalThis & {
  otroGptSessionStore?: SessionStore;
};

const globalWithSessionStore = globalThis as GlobalWithSessionStore;

const sessionStore: SessionStore =
  globalWithSessionStore.otroGptSessionStore ?? new Map<string, ChatMessage[]>();

if (!globalWithSessionStore.otroGptSessionStore) {
  globalWithSessionStore.otroGptSessionStore = sessionStore;
}

export function appendSessionMessage(sessionId: string, message: ChatMessage): void {
  const existingMessages = sessionStore.get(sessionId) ?? [];
  sessionStore.set(sessionId, [...existingMessages, message]);
}

export function clearSessionMessages(sessionId: string): void {
  sessionStore.delete(sessionId);
}

export function getSessionMessages(sessionId?: string): ChatMessage[] {
  if (!sessionId) {
    return [];
  }

  return sessionStore.get(sessionId) ?? [];
}
