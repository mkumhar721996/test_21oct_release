import { notFound } from "next/navigation";
import { ChatThreadView } from "@/components/chats/chat-thread-view";
import { getChat } from "@/lib/chats";

export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chat = getChat(id);
  if (!chat) notFound();
  return <ChatThreadView chat={chat} />;
}
