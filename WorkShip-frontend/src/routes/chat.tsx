import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import {
  fetchMessages,
  getTyping,
  initChat,
  markRead,
  sendMessage,
  subscribe,
  useConversations,
} from "@/lib/chat-store";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>) => ({ conv: typeof s.conv === "string" ? s.conv : undefined }),
  head: () => ({ meta: [{ title: "Messages — Workship" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { token } = useAuth();
  const { conv: convParam } = Route.useSearch();
  const conversations = useConversations();
  const [activeId, setActiveId] = useState<string | null>(convParam ?? null);
  const [, force] = useState(0);
  // Track whether we've already auto-selected the first conversation as fallback
  const fallbackSelected = useRef(false);

  // Initialise real chat store with the user's token — user view (guest/visitor side)
  useEffect(() => {
    if (token) void initChat(token, 'user');
  }, [token]);

  // Re-render on store changes (typing, new messages)
  useEffect(() => {
    const unsub = subscribe(() => force((n) => n + 1));
    return unsub;
  }, []);

  // convParam takes priority — always sync when it changes (e.g. navigating
  // from a workspace page to /chat?conv=<id>)
  useEffect(() => {
    if (convParam) {
      setActiveId(convParam);
      fallbackSelected.current = false;
    }
  }, [convParam]);

  // Fallback: auto-select first conversation only if no convParam and nothing selected yet
  useEffect(() => {
    if (!convParam && !activeId && conversations.length > 0 && !fallbackSelected.current) {
      fallbackSelected.current = true;
      setActiveId(conversations[0]._id);
    }
  }, [conversations, activeId, convParam]);

  // Fetch messages when switching conversations
  useEffect(() => {
    if (activeId) {
      markRead(activeId);
      void fetchMessages(activeId);
    }
  }, [activeId]);

  const active = conversations.find((c) => c._id === activeId);

  return (
    <ProtectedRoute>
      <div className="mx-auto h-full max-w-7xl md:p-6">
        <div className="flex h-full overflow-hidden border border-border bg-background md:rounded-3xl">
          {/* Sidebar — hidden on mobile when a chat is open */}
          <div className={`${active ? "hidden md:flex" : "flex"} h-full w-full md:w-auto`}>
            <ChatSidebar conversations={conversations} activeId={activeId} onSelect={setActiveId} />
          </div>

          {/* Chat window */}
          <div className={`${active ? "flex" : "hidden md:flex"} h-full flex-1`}>
            {active ? (
              <ChatWindow
                conversation={active}
                typing={getTyping(active._id)}
                onSend={(text) => sendMessage(active._id, text)}
                onBack={() => setActiveId(null)}
              />
            ) : (
              <div className="hidden flex-1 items-center justify-center md:flex">
                <div className="text-center">
                  <p className="font-display text-xl font-bold">Pick a conversation</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your chats with hosts appear here in real time.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
