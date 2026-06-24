import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HostProtectedRoute } from "@/components/HostProtectedRoute";
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
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/host-messages")({
  validateSearch: (s: Record<string, unknown>) => ({ conv: typeof s.conv === "string" ? s.conv : undefined }),
  head: () => ({ meta: [{ title: "Host Messages — Workship" }] }),
  component: HostMessagesPage,
});

function HostMessagesPage() {
  // Hosts authenticate with hostToken — same JWT structure, same middleware
  const { hostToken } = useAuth();
  const { conv: convParam } = Route.useSearch();
  const conversations = useConversations();
  const [activeId, setActiveId] = useState<string | null>(convParam ?? null);
  const [, force] = useState(0);
  const fallbackSelected = useRef(false);

  useEffect(() => {
    if (hostToken) void initChat(hostToken, 'host');
  }, [hostToken]);

  useEffect(() => {
    const unsub = subscribe(() => force((n) => n + 1));
    return unsub;
  }, []);

  // convParam takes priority — always sync when it changes
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

  useEffect(() => {
    if (activeId) {
      markRead(activeId);
      void fetchMessages(activeId);
    }
  }, [activeId]);

  const active = conversations.find((c) => c._id === activeId);

  return (
    <HostProtectedRoute>
      <div className="mx-auto h-full max-w-7xl md:p-6">
        <div className="flex h-full overflow-hidden border border-border bg-background md:rounded-3xl">
          {/* Sidebar */}
          <div className={`${active ? "hidden md:flex" : "flex"} h-full w-full md:w-auto`}>
            <ChatSidebar conversations={conversations} activeId={activeId} onSelect={setActiveId} />
          </div>

          {/* Window */}
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
                    Guest conversations appear here in real time.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HostProtectedRoute>
  );
}
