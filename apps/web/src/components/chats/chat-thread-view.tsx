import Link from "next/link";
import type { Chat } from "@/lib/chats";
import { Icon } from "../icon";
import { MessageThread } from "./message-thread";

export function ChatThreadView({ chat }: { chat: Chat }) {
  return (
    <div className="stack">
      <div className="thread-bar">
        <Link className="btn btn-ghost" href="/chats">
          <Icon name="arrow-left" /> Back
        </Link>
        <h2>{chat.name}</h2>
      </div>
      <MessageThread name={chat.name} messages={chat.messages} />
    </div>
  );
}
