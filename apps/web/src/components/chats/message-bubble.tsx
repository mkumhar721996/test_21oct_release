import { formatTime, type Message } from "@/lib/chats";
import { VoiceBubble } from "./voice-bubble";

export function MessageBubble({ message }: { message: Message }) {
  const sent = message.direction === "sent";
  const time = <span className="msg-time">{formatTime(message.sentAt)}</span>;
  return (
    <div className={`msg ${sent ? "msg-sent" : "msg-received"}`}>
      {sent && time}
      <div className="bubble">
        {message.kind === "voice" ? <VoiceBubble durationSeconds={message.durationSeconds} /> : <span>{message.text}</span>}
      </div>
      {!sent && time}
    </div>
  );
}
