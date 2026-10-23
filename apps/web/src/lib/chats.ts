export type Message =
  | { id: string; direction: "sent" | "received"; kind: "text"; text: string; sentAt: string }
  | { id: string; direction: "sent" | "received"; kind: "voice"; durationSeconds: number; sentAt: string };

export type Chat = { id: string; name: string; initials: string; messages: Message[] };

export const CHATS: Chat[] = [
  {
    id: "chat-maya",
    name: "Maya Chen",
    initials: "MC",
    messages: [
      { id: "m1", direction: "received", kind: "text", text: "Hi", sentAt: "2026-10-12T09:14:00Z" },
      { id: "m2", direction: "sent", kind: "text", text: "Morning", sentAt: "2026-10-12T09:16:00Z" },
      { id: "m3", direction: "received", kind: "voice", durationSeconds: 12, sentAt: "2026-10-23T10:02:00Z" },
      { id: "m4", direction: "sent", kind: "text", text: "See you at 11", sentAt: "2026-10-23T10:05:00Z" },
    ],
  },
  { id: "chat-alex", name: "Alex Park", initials: "AP", messages: [] },
];

export function getChat(id: string): Chat | undefined {
  return CHATS.find((chat) => chat.id === id);
}

export type ThreadItem =
  | { type: "divider"; key: string; label: string }
  | { type: "message"; key: string; message: Message };

const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatTime(iso: string): string {
  return TIME.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function buildThread(messages: Message[]): ThreadItem[] {
  const dates = new Set(messages.map((m) => m.sentAt.slice(0, 10)));
  const items: ThreadItem[] = [];
  let lastDate = "";
  for (const message of messages) {
    const date = message.sentAt.slice(0, 10);
    if (dates.size > 1 && date !== lastDate) {
      items.push({ type: "divider", key: `divider-${date}`, label: formatDate(message.sentAt) });
    }
    lastDate = date;
    items.push({ type: "message", key: message.id, message });
  }
  return items;
}
