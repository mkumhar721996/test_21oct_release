import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserSummary } from "@/components/auth/user-summary";

const replace = vi.fn();
const router = { replace };
let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => router,
}));

function mockSession(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status === 200, status, json: async () => body }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  pathname = "/";
});

describe("UserSummary", () => {
  it("shows name, role and organization for an Org Admin", async () => {
    mockSession(200, {
      id: "u3",
      name: "Maya Okafor",
      role: "Org Admin",
      organization: { id: "org-1", name: "Hope Trust" },
    });
    render(<UserSummary />);
    expect(await screen.findByText("Maya Okafor")).toBeTruthy();
    expect(screen.getByText("Org Admin")).toBeTruthy();
    expect(screen.getByTestId("user-organization").textContent).toBe("Hope Trust");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("shows no organization for a WFC Admin", async () => {
    mockSession(200, { id: "u1", name: "Priya Nair", role: "WFC Admin", organization: null });
    render(<UserSummary />);
    expect(await screen.findByText("Priya Nair")).toBeTruthy();
    expect(screen.getByText("WFC Admin")).toBeTruthy();
    expect(screen.queryByTestId("user-organization")).toBeNull();
  });

  it("redirects to sign-in with the idle reason on 401", async () => {
    mockSession(401, { message: "Unauthorized" });
    render(<UserSummary />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in?reason=idle"));
  });

  it("does not fetch or redirect on the sign-in page", () => {
    pathname = "/sign-in";
    mockSession(401, {});
    render(<UserSummary />);
    expect(fetch).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
