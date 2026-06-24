import { Check, CheckCheck } from "lucide-react";

type BubbleMessage = {
  id: string;
  from: "me" | "them";
  text: string;
  at: number;
  status?: "sent" | "delivered" | "seen";
};

function fmt(at: number) {
  const d = new Date(at);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ msg, showTime }: { msg: BubbleMessage; showTime: boolean }) {
  const mine = msg.from === "me";
  return (
    <div className={`flex w-full ${mine ? "justify-end" : "justify-start"} animate-fade-in-up`}>
      <div className={`flex max-w-[70%] flex-col ${mine ? "items-end" : "items-start"} gap-1`}>
        <div
          className={`break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            mine
              ? "rounded-br-sm bg-teal-600 text-white shadow-md dark:bg-teal-500"
              : "rounded-bl-sm bg-zinc-100 text-foreground shadow-sm dark:bg-zinc-800 dark:text-gray-100"
          }`}
        >
          {msg.text}
        </div>
        {showTime && (
          <div className="flex items-center gap-1 px-2 text-[11px] text-muted-foreground opacity-60">
            <span>{fmt(msg.at)}</span>
            {mine && msg.status && (
              <span className={msg.status === "seen" ? "text-teal-500" : ""}>
                {msg.status === "sent" && <Check className="h-3 w-3" />}
                {msg.status === "delivered" && <CheckCheck className="h-3 w-3" />}
                {msg.status === "seen" && <CheckCheck className="h-3 w-3" />}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
