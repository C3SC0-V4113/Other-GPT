export const CHAT_SESSION_COOKIE_NAME = 'otro_gpt_session_id';

export type ChatRole = 'assistant' | 'user';

export interface ChatMessage {
  content: string;
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
