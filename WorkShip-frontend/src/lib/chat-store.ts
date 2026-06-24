/**
 * chat-store.ts
 *
 * Real-time chat store backed by the Workship REST API + Socket.io.
 *
 * Architecture:
 *  - Conversations and messages are fetched from /conversations via REST
 *  - New messages are sent via POST /conversations/:id/messages
 *  - Socket.io delivers incoming messages instantly without polling
 *  - The store is subscription-based so any component can re-render on change
 *
 * Both /chat (user) and /host-messages (host) share this same store.
 * The only difference is which JWT they authenticate with.
 */

import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { API_BASE } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatParticipant = {
  _id: string;
  name: string;
  profilePicture?: string;
};

export type ChatWorkspace = {
  _id: string;
  title: string;
  city?: string;
  image?: string;
};

export type ChatMessage = {
  _id: string;
  text: string;
  sender: { _id: string };
  read: boolean;
  createdAt: string;
};

export type Conversation = {
  _id: string;
  other: ChatParticipant | null;
  workspace: ChatWorkspace | null;
  lastMessage: { text: string; sender?: { _id: string }; at: string };
  unread: number;
  updatedAt: string;
  // Hydrated locally after fetch
  messages: ChatMessage[];
  typing: boolean;
};

// ─── Internal state ───────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }

export type ChatView = 'user' | 'host';

let conversations: Conversation[] = [];
let activeToken: string | null = null;
let activeView: ChatView = 'user';
let socket: Socket | null = null;
let initialized = false;

// ─── Subscriptions ─────────────────────────────────────────────────────────────

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// ─── Socket.io ────────────────────────────────────────────────────────────────

function connectSocket(token: string) {
  if (socket?.connected) return;

  socket = io(API_BASE, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    // Register in personal room so server can push targeted events
    const userId = getCurrentUserId();
    if (userId) socket!.emit('register:user', userId);
    // Re-join all known conversation rooms after reconnect
    conversations.forEach((c) => socket!.emit('join:conversation', c._id));
  });

  socket.on('message:new', ({ conversationId, message }: { conversationId: string; message: ChatMessage }) => {
    conversations = conversations.map((c) => {
      if (c._id !== conversationId) return c;
      
      const isMine = message.sender._id === getCurrentUserId();
      const alreadyExists = c.messages.some((m) => m._id === message._id);
      
      // If this message is from me and doesn't exist by ID, check for optimistic message
      // to replace (fixes race condition: socket arrives before API response)
      let newMessages: ChatMessage[];
      if (isMine && !alreadyExists) {
        // Replace the most recent optimistic message (opt-TIMESTAMP) with the real one
        const lastIdx = c.messages.length - 1;
        if (lastIdx >= 0 && c.messages[lastIdx]._id.startsWith('opt-')) {
          newMessages = [...c.messages];
          newMessages[lastIdx] = message;
        } else {
          // Fallback: just add it (shouldn't happen, but defensive)
          newMessages = [...c.messages, message];
        }
      } else if (alreadyExists) {
        // Message already exists, don't add
        newMessages = c.messages;
      } else {
        // From someone else, add it
        newMessages = [...c.messages, message];
      }
      
      return {
        ...c,
        messages: newMessages,
        unread: isMine ? c.unread : c.unread + 1,
        lastMessage: { text: message.text, at: message.createdAt },
        typing: false,
      };
    });
    emit();
  });

  // When the backend creates a new conversation (e.g. user contacts host),
  // both participants receive this event so their sidebar updates instantly.
  // We only add it to the local store if it belongs in the current view:
  //  - user-view: add if current user is NOT the hostParticipant
  //  - host-view: add if current user IS the hostParticipant
  socket.on('conversation:new', (conv: Omit<Conversation, 'messages' | 'typing'> & { hostParticipant?: string }) => {
    const exists = conversations.find((c) => c._id === conv._id);
    if (exists) return; // already in store

    const myId = getCurrentUserId();
    const imTheHost = conv.hostParticipant === myId;
    const belongsInThisView = activeView === 'host' ? imTheHost : !imTheHost;

    if (belongsInThisView) {
      conversations = [{ ...conv, messages: [], typing: false }, ...conversations];
      socket!.emit('join:conversation', conv._id);
      emit();
    }
  });

  socket.on('typing', ({ conversationId }: { conversationId: string }) => {
    conversations = conversations.map((c) =>
      c._id === conversationId ? { ...c, typing: true } : c
    );
    emit();

    // Clear after 3s
    setTimeout(() => {
      conversations = conversations.map((c) =>
        c._id === conversationId ? { ...c, typing: false } : c
      );
      emit();
    }, 3000);
  });
}

function joinConversation(convId: string) {
  socket?.emit('join:conversation', convId);
}

// ─── Current user helper (stored by auth on login) ───────────────────────────

function getCurrentUserId(): string {
  try {
    // Regular user session
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed._id) return parsed._id;
    }
    // Host session — stored as 'hostUser'
    const hostRaw = localStorage.getItem('hostUser');
    if (hostRaw) {
      const parsed = JSON.parse(hostRaw);
      if (parsed._id) return parsed._id;
    }
    return '';
  } catch {
    return '';
  }
}

// ─── Init / reset ─────────────────────────────────────────────────────────────

/**
 * Initialise (or re-initialise) the chat store for a given token and view.
 *
 * @param token - JWT for the current session.
 * @param view  - 'user' (default) for /chat, 'host' for /host-messages.
 *                When view changes, conversations are re-fetched with the
 *                correct ?view= filter even if the token is unchanged.
 */
export async function initChat(token: string, view: ChatView = 'user') {
  // Re-init whenever token OR view changes — ensures the right conversation
  // list is loaded when switching between Messages and Host Messages.
  if (initialized && token === activeToken && view === activeView) return;
  activeToken = token;
  activeView = view;
  initialized = true;

  connectSocket(token);
  await fetchConversations(token, view);
}

export function resetChat() {
  socket?.disconnect();
  socket = null;
  conversations = [];
  activeToken = null;
  activeView = 'user';
  initialized = false;
  emit();
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function authFetch(path: string, opts: RequestInit = {}) {
  const token = activeToken;
  if (!token) throw new Error('Not authenticated');
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });
}

// ─── Conversations ─────────────────────────────────────────────────────────────

export async function fetchConversations(token?: string, view: ChatView = 'user') {
  try {
    const t = token ?? activeToken;
    if (!t) return;
    // Pass ?view=host so the backend applies the right MongoDB filter.
    // Without the param (or with ?view=user) the backend returns non-host conversations.
    const url = `${API_BASE}/conversations${view === 'host' ? '?view=host' : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) return;
    const data: Omit<Conversation, 'messages' | 'typing'>[] = await res.json();

    // Preserve existing messages for convs already in store
    conversations = data.map((c) => {
      const existing = conversations.find((e) => e._id === c._id);
      return {
        ...c,
        messages: existing?.messages ?? [],
        typing: existing?.typing ?? false,
      };
    });

    // Join socket rooms for all conversations
    conversations.forEach((c) => joinConversation(c._id));
    emit();
  } catch {
    // Network error — keep existing data
  }
}

/**
 * Open or create a conversation for a workspace.
 * Returns the conversation _id so the caller can navigate to /chat.
 *
 * @param workspaceId - The workspace to start a conversation about.
 * @param explicitToken - Pass the token directly to avoid depending on initChat
 *                        having been called first (e.g. from workspace detail page).
 * @returns The conversation _id on success, or null on failure.
 * @throws string - The backend error message, so the caller can show it.
 */
export async function openConversation(
  workspaceId: string,
  explicitToken?: string
): Promise<string | null> {
  // Use an explicit token if provided (bypasses activeToken dependency),
  // otherwise fall back to the one set by initChat.
  const token = explicitToken ?? activeToken;
  if (!token) {
    console.error('[chat-store] openConversation: no auth token available');
    throw new Error('Not authenticated');
  }

  try {
    const res = await fetch(`${API_BASE}/conversations/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ workspaceId }),
    });

    if (!res.ok) {
      let errMsg = `Request failed with status ${res.status}`;
      try {
        const errBody = await res.json();
        errMsg = errBody.message ?? errMsg;
      } catch { /* response body not JSON */ }
      console.error('[chat-store] openConversation backend error:', errMsg);
      throw new Error(errMsg);
    }

    const conv: Omit<Conversation, 'messages' | 'typing'> = await res.json();

    // Also set activeToken so subsequent authFetch calls work
    if (!activeToken) activeToken = token;

    // Merge into store (upsert — socket may have already added it)
    const existingIdx = conversations.findIndex((c) => c._id === conv._id);
    if (existingIdx === -1) {
      conversations = [{ ...conv, messages: [], typing: false }, ...conversations];
    } else {
      // Update metadata (unread, lastMessage) but keep messages
      conversations = conversations.map((c) =>
        c._id === conv._id ? { ...c, ...conv } : c
      );
    }
    joinConversation(conv._id);
    emit();
    return conv._id;
  } catch (err) {
    // Re-throw so the caller can surface the real message
    throw err;
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function fetchMessages(convId: string) {
  try {
    const res = await authFetch(`/conversations/${convId}/messages`);
    if (!res.ok) return;
    const msgs: ChatMessage[] = await res.json();
    conversations = conversations.map((c) =>
      c._id === convId ? { ...c, messages: msgs, unread: 0 } : c
    );
    emit();
  } catch {
    // ignore
  }
}

export async function sendMessage(convId: string, text: string) {
  const myId = getCurrentUserId();
  // Optimistic message
  const optimisticId = `opt-${Date.now()}`;
  const optimistic: ChatMessage = {
    _id: optimisticId,
    text,
    sender: { _id: myId },
    read: false,
    createdAt: new Date().toISOString(),
  };
  conversations = conversations.map((c) =>
    c._id === convId
      ? { ...c, messages: [...c.messages, optimistic], lastMessage: { text, at: new Date().toISOString() } }
      : c
  );
  emit();

  try {
    const res = await authFetch(`/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      // Roll back optimistic
      conversations = conversations.map((c) =>
        c._id === convId
          ? { ...c, messages: c.messages.filter((m) => m._id !== optimisticId) }
          : c
      );
      emit();
      return;
    }
    const real: ChatMessage = await res.json();
    // Replace optimistic with real
    conversations = conversations.map((c) =>
      c._id === convId
        ? { ...c, messages: c.messages.map((m) => (m._id === optimisticId ? real : m)) }
        : c
    );
    emit();
  } catch {
    // Roll back
    conversations = conversations.map((c) =>
      c._id === convId
        ? { ...c, messages: c.messages.filter((m) => m._id !== optimisticId) }
        : c
    );
    emit();
  }
}

export async function sendTypingIndicator(convId: string) {
  socket?.emit('typing:start', { convId, userId: getCurrentUserId() });
}

export function markRead(convId: string) {
  conversations = conversations.map((c) =>
    c._id === convId ? { ...c, unread: 0 } : c
  );
  emit();
  // Tell backend to mark messages read
  authFetch(`/conversations/${convId}/messages`).catch(() => {});
}

export function getConversations() { return conversations; }
export function getTyping(convId: string) {
  return conversations.find((c) => c._id === convId)?.typing ?? false;
}

// ─── React hooks ──────────────────────────────────────────────────────────────

export function useConversations() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);
  return getConversations();
}

export function useTotalUnread() {
  const convs = useConversations();
  return convs.reduce((s, c) => s + c.unread, 0);
}

// ─── Keep backwards-compat stubs (used by Navbar) ────────────────────────────

export function startSimulation() {
  // No-op — replaced by real socket connection
}
