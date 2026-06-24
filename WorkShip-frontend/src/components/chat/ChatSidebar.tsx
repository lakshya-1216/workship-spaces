import { Building2 } from "lucide-react";
import type { Conversation } from "@/lib/chat-store";

function timeAgo(at: string | number) {
  const diff = Date.now() - new Date(at).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

const FALLBACK_AVATAR = "https://i.pravatar.cc/80";

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-surface md:w-80 lg:w-96">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-xl font-bold">Messages</h2>
        <p className="text-xs text-muted-foreground">
          {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated border border-border">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No conversations yet</p>
              <p className="mt-1 text-xs">Visit a workspace page and click "Chat with Host" to start.</p>
            </div>
          </div>
        )}
        {conversations.map((c) => {
          const last = c.messages[c.messages.length - 1];
          const lastText = last?.text ?? c.lastMessage?.text ?? "";
          const lastAt = last?.createdAt ?? c.lastMessage?.at ?? c.updatedAt;
          const isActive = c._id === activeId;
          const name = c.other?.name ?? "Unknown";
          const avatar = c.other?.profilePicture ?? FALLBACK_AVATAR;
          const workspaceImg = c.workspace?.image;
          return (
            <button
              key={c._id}
              onClick={() => onSelect(c._id)}
              className={`flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors ${
                isActive ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-secondary"
              }`}
            >
              {/* Avatar with online indicator for active conv */}
              <div className="relative shrink-0">
                <img
                  src={avatar}
                  alt={name}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover"
                />
                {isActive && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {lastAt && timeAgo(lastAt)}
                  </span>
                </div>
                {/* Workspace info with thumbnail */}
                <div className="mt-0.5 flex items-center gap-1.5">
                  {workspaceImg ? (
                    <img
                      src={workspaceImg}
                      alt=""
                      width={14}
                      height={14}
                      className="h-3.5 w-3.5 rounded-sm object-cover"
                    />
                  ) : (
                    <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <p className="truncate text-xs text-muted-foreground">
                    {c.workspace?.title ?? "Workspace"}
                    {c.workspace?.city ? ` · ${c.workspace.city}` : ""}
                  </p>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className={`truncate text-xs ${c.unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {lastText || "No messages yet"}
                  </p>
                  {c.unread > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground animate-pulse">
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
