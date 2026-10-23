import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "@/components/chats/message-bubble";

describe("MessageBubble", () => {
  it("renders a sent message as a sent bubble", () => {
    const { container } = render(
      <MessageBubble message={{ id: "m", direction: "sent", kind: "text", text: "Morning", sentAt: "2026-10-12T09:16:00Z" }} />,
    );
    expect(container.querySelector(".msg-sent")?.textContent).toContain("Morning");
    expect(container.querySelector(".msg-received")).toBeNull();
  });

  it("renders a received message as a received bubble with its time", () => {
    const { container } = render(
      <MessageBubble message={{ id: "m", direction: "received", kind: "text", text: "Hi", sentAt: "2026-10-12T09:14:00Z" }} />,
    );
    expect(container.querySelector(".msg-received")?.textContent).toContain("Hi");
    expect(container.querySelector(".msg-sent")).toBeNull();
    expect(screen.getByText("09:14").closest(".msg")).toBe(container.querySelector(".msg-received"));
  });

  it("renders a voice message as a voice bubble", () => {
    render(
      <MessageBubble message={{ id: "m", direction: "received", kind: "voice", durationSeconds: 12, sentAt: "2026-10-23T10:02:00Z" }} />,
    );
    expect(screen.getByRole("button", { name: /Voice message, 0:12/ })).toBeTruthy();
    expect(screen.getByText("10:02")).toBeTruthy();
  });
});
