"use client";

import { useLayoutEffect, useRef } from "react";
import { buildThread, type Message } from "@/lib/chats";
import { DateDivider } from "./date-divider";
import { MessageBubble } from "./message-bubble";

export function MessageThread({ name, messages }: { name: string; messages: Message[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const label = `Conversation with ${name}`;
  if (messages.length === 0) {
    return (
      <div className="empty-state thread-empty" role="log" aria-label={label}>
        <p>No messages yet</p>
      </div>
    );
  }

  return (
    <div className="thread" role="log" tabIndex={0} aria-label={label} ref={ref}>
      {buildThread(messages).map((item) =>
        item.type === "divider" ? (
          <DateDivider key={item.key} label={item.label} />
        ) : (
          <MessageBubble key={item.key} message={item.message} />
        ),
      )}
    </div>
  );
}
