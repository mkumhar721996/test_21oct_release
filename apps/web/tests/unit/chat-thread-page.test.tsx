import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatsPage from "@/app/chats/page";
import ChatThreadPage from "@/app/chats/[id]/page";
import NotFound from "@/app/chats/[id]/not-found";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("chat pages", () => {
  it("lists the chats", () => {
    render(<ChatsPage />);
    expect(screen.getByRole("link", { name: /Maya Chen/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Alex Park/ })).toBeTruthy();
  });

  it("renders the thread with a back link", async () => {
    render(await ChatThreadPage({ params: Promise.resolve({ id: "chat-maya" }) }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Maya Chen");
    expect(screen.getByRole("link", { name: /Back/ }).getAttribute("href")).toBe("/chats");
    expect(screen.getByRole("log")).toBeTruthy();
  });

  it("calls notFound for an unknown chat", async () => {
    await expect(ChatThreadPage({ params: Promise.resolve({ id: "nope" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("has a not-found view", () => {
    render(<NotFound />);
    expect(screen.getByRole("alert").textContent).toContain("Chat not found");
  });
});
