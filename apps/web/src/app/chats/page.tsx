import { ChatList } from "@/components/chats/chat-list";
import { CHATS } from "@/lib/chats";

export default function ChatsPage() {
  return (
    <div className="stack">
      <h1>Chats</h1>
      <ChatList chats={CHATS} />
    </div>
  );
}
