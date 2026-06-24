import { ArrowLeft, Building2, ExternalLink, MoreHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Conversation, ChatMessage } from "@/lib/chat-store";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";

const FALLBACK_AVATAR = "https://i.pravatar.cc/80";

function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    return JSON.parse(raw)._id ?? "";
  } catch {
    return "";
  }
}

export function ChatWindow({
  conversation,
  typing,
  onSend,
  onBack,
}: {
  conversation: Conversation;
  typing: boolean;
  onSend: (text: string) => void;
  onBack?: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const myId = getCurrentUserId();
  const name = conversation.other?.name ?? "Host";
  const avatar = conversation.other?.profilePicture ?? FALLBACK_AVATAR;
  const workspaceImg = conversation.workspace?.image;
  const workspaceId = conversation.workspace?._id;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [conversation.messages.length, typing]);

  function msgFrom(msg: ChatMessage): "me" | "them" {
    return msg.sender._id === myId ? "me" : "them";
  }

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-surface px-3 py-3 md:px-5">
        {onBack && (
          <button onClick={onBack} className="rounded-full p-2 hover:bg-secondary md:hidden" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {/* Avatar with workspace thumbnail badge */}
        <div className="relative shrink-0">
          <img
            src={avatar}
            alt={name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
          {workspaceImg ? (
            <img
              src={workspaceImg}
              alt=""
              width={16}
              height={16}
              className="absolute -bottom-1 -right-1 h-4 w-4 rounded-sm border-2 border-surface object-cover"
            />
          ) : (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-sm border-2 border-surface bg-primary">
              <Building2 className="h-2.5 w-2.5 text-primary-foreground" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.workspace?.title ?? "Workspace"}
            {conversation.workspace?.city ? ` · ${conversation.workspace.city}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {workspaceId && (
            <a
              href={`/workspace/${workspaceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="View workspace"
              title="View workspace"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-4 py-6 md:px-6">
          {conversation.messages.length === 0 && !typing && (
            <div className="flex flex-col items-center gap-3 py-12">
              {workspaceImg && (
                <img
                  src={workspaceImg}
                  alt={conversation.workspace?.title ?? "Workspace"}
                  width={96}
                  height={64}
                  className="h-16 w-24 rounded-2xl object-cover opacity-80"
                />
              )}
              <p className="text-center text-sm text-muted-foreground">
                Start the conversation about{" "}
                <span className="font-semibold text-foreground">
                  {conversation.workspace?.title ?? "this workspace"}
                </span>
                . Say hello! 👋
              </p>
            </div>
          )}
          <div className="w-full max-w-2xl space-y-0.5">
            {conversation.messages.map((m, i) => {
              const next = conversation.messages[i + 1];
              const prev = conversation.messages[i - 1];
              const from = msgFrom(m);
              const nextFrom = next ? msgFrom(next) : null;
              const prevFrom = prev ? msgFrom(prev) : null;
              const showTime =
                !next ||
                nextFrom !== from ||
                new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() > 5 * 60 * 1000;
              // Add gap before message if sender changed
              const gapBefore = prevFrom && prevFrom !== from;
              return (
                <div key={m._id} className={gapBefore ? "pt-3" : ""}>
                  <MessageBubble
                    msg={{ id: m._id, from, text: m.text, at: new Date(m.createdAt).getTime() }}
                    showTime={showTime}
                  />
                </div>
              );
            })}
            {typing && (
              <div className="pt-2">
                <TypingIndicator />
              </div>
            )}
          </div>
        </div>
      </div>

      <ChatInput onSend={onSend} />
    </section>
  );
}
