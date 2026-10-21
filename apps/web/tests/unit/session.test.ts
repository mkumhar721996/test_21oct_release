import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/session";

const secret = "fake-session-secret";

describe("session cookie", () => {
  it("round-trips a signed user id", () => {
    expect(verifySession(signSession("user-42", secret), secret)).toBe("user-42");
  });

  it("rejects a bare, forged or re-signed value", () => {
    expect(verifySession("user-42", secret)).toBeNull();
    expect(verifySession("victim.AAAA", secret)).toBeNull();
    expect(verifySession(signSession("user-42", "other-secret"), secret)).toBeNull();
    expect(verifySession(signSession("user-42", secret).replace("user-42", "victim"), secret)).toBeNull();
  });

  it("is signed out without a value or secret", () => {
    expect(verifySession(undefined, secret)).toBeNull();
    expect(verifySession(signSession("user-42", secret), "")).toBeNull();
  });
});
