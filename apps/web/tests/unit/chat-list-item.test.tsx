import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatListItem } from "@/components/chats/chat-list-item";
import { getChat } from "@/lib/chats";

describe("ChatListItem", () => {
  it("links to the chat with a preview", () => {
    render(<ChatListItem chat={getChat("chat-maya")!} />);
    const link = screen.getByRole("link", { name: /Maya Chen/ });
    expect(link.getAttribute("href")).toBe("/chats/chat-maya");
    expect(link.textContent).toContain("See you at 11 (10:05)");
  });

  it("previews an empty chat", () => {
    render(<ChatListItem chat={getChat("chat-alex")!} />);
    expect(screen.getByRole("link", { name: /Alex Park/ }).textContent).toContain("No messages yet");
  });
});
