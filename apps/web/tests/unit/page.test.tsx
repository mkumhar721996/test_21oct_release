import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => router,
}));
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
import Home from "@/app/page";
import { greeting } from "@/lib/greeting";

test("greeting defaults to World", () => {
  expect(greeting()).toBe("Hello, World!");
});

test("home page renders the greeting", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hello, World!");
});
