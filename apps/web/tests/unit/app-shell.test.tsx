import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({
  usePathname: () => "/defects",
  useRouter: () => router,
}));
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

describe("AppShell", () => {
  it("shows Defects and Reports in the top bar", () => {
    render(<AppShell>{null}</AppShell>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Defects" }).getAttribute("href")).toBe("/defects");
    expect(within(nav).getByRole("link", { name: "Reports" }).getAttribute("href")).toBe("/reports");
    expect(within(nav).getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
  });

  it("marks the active entry with aria-current", () => {
    render(<AppShell>{null}</AppShell>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Defects" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: "Reports" }).hasAttribute("aria-current")).toBe(false);
  });

  it("toggles the menu on small screens", () => {
    render(<AppShell>{null}</AppShell>);
    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("main-nav")?.classList.contains("is-open")).toBe(true);
  });
});
