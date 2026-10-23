import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageThread } from "@/components/chats/message-thread";
import { getChat } from "@/lib/chats";

const maya = () => getChat("chat-maya")!.messages;

describe("MessageThread", () => {
  it("renders the seeded messages as a thread", () => {
    render(<MessageThread name="Maya Chen" messages={maya()} />);
    const log = screen.getByRole("log", { name: "Conversation with Maya Chen" });
    expect(within(log).getByText("Hi")).toBeTruthy();
    expect(within(log).getByText("See you at 11")).toBeTruthy();
    expect(log.querySelectorAll(".msg")).toHaveLength(4);
  });

  it("shows a divider per date, and none for a single date", () => {
    const { container } = render(<MessageThread name="Maya Chen" messages={maya()} />);
    expect(container.querySelectorAll(".date-divider")).toHaveLength(2);
    const { container: single } = render(<MessageThread name="Maya Chen" messages={maya().slice(0, 2)} />);
    expect(single.querySelectorAll(".date-divider")).toHaveLength(0);
  });

  it("opens scrolled to the latest message", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, value: 900 });
    const { container } = render(<MessageThread name="Maya Chen" messages={maya()} />);
    expect((container.querySelector(".thread") as HTMLElement).scrollTop).toBe(900);
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
  });

  it("does not mutate the seed when rendered", () => {
    render(<MessageThread name="Maya Chen" messages={maya()} />);
    render(<MessageThread name="Maya Chen" messages={maya()} />);
    expect(maya()).toHaveLength(4);
  });

  it("shows a placeholder for no messages", () => {
    render(<MessageThread name="Alex Park" messages={[]} />);
    expect(screen.getByText("No messages yet")).toBeTruthy();
    expect(document.querySelector(".date-divider, .msg")).toBeNull();
  });
});
