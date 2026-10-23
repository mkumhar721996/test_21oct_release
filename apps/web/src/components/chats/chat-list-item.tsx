import Link from "next/link";
import { formatTime, type Chat } from "@/lib/chats";

export function ChatListItem({ chat }: { chat: Chat }) {
  const last = chat.messages[chat.messages.length - 1];
  const preview = !last
    ? "No messages yet"
    : `${last.kind === "voice" ? "Voice message" : last.text} (${formatTime(last.sentAt)})`;
  return (
    <Link className="btn btn-ghost chat-row" href={`/chats/${chat.id}`}>
      <span className="avatar" aria-hidden="true">
        {chat.initials}
      </span>
      <span className="chat-row-text">
        <strong>{chat.name}</strong>
        <span className="text-sm text-muted">{preview}</span>
      </span>
    </Link>
  );
}
