import { describe, expect, it } from "vitest";
import { parseAuthRecoveryUrl } from "./authRecovery";

describe("parseAuthRecoveryUrl", () => {
  it("reads legacy implicit recovery tokens", () => {
    expect(parseAuthRecoveryUrl("https://example.test/#access_token=access&refresh_token=refresh&type=recovery")).toEqual({
      kind: "session",
      accessToken: "access",
      refreshToken: "refresh",
    });
  });

  it("reads a PKCE authorization code", () => {
    expect(parseAuthRecoveryUrl("https://example.test/auth/reset-password?code=abc123")).toEqual({ kind: "code", code: "abc123" });
  });

  it("reads a recovery token hash", () => {
    expect(parseAuthRecoveryUrl("https://example.test/auth/reset-password?token_hash=hash123&type=recovery")).toEqual({
      kind: "token_hash",
      tokenHash: "hash123",
    });
  });

  it("ignores non-recovery fragment tokens", () => {
    expect(parseAuthRecoveryUrl("https://example.test/#access_token=access&refresh_token=refresh&type=signup")).toEqual({ kind: "none" });
  });
});
