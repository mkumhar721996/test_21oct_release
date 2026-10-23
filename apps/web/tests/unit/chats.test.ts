import { describe, expect, it } from "vitest";
import { buildThread, formatDate, formatTime, getChat, type Message } from "@/lib/chats";

const maya = () => getChat("chat-maya")!.messages;

describe("chats", () => {
  it("formats time and date in UTC", () => {
    expect(formatTime("2026-10-12T09:14:00Z")).toBe("09:14");
    expect(formatDate("2026-10-12T09:14:00Z")).toBe("12 Oct 2026");
  });

  it("puts a divider before the first message of each date", () => {
    const items = buildThread(maya());
    expect(items.filter((i) => i.type === "divider").map((i) => i.label)).toEqual([
      "12 Oct 2026",
      "23 Oct 2026",
    ]);
    expect(items[0].type).toBe("divider");
    expect(items[3].type).toBe("divider");
    expect(items).toHaveLength(6);
  });

  it("adds no divider for a single date", () => {
    const same: Message[] = [
      { id: "a", direction: "received", kind: "text", text: "A", sentAt: "2026-10-12T00:01:00Z" },
      { id: "b", direction: "sent", kind: "text", text: "B", sentAt: "2026-10-12T23:59:00Z" },
    ];
    expect(buildThread(same).some((i) => i.type === "divider")).toBe(false);
  });

  it("returns undefined for an unknown chat and has an empty chat", () => {
    expect(getChat("nope")).toBeUndefined();
    expect(getChat("chat-alex")!.messages).toEqual([]);
    expect(maya()).toHaveLength(4);
  });
});
