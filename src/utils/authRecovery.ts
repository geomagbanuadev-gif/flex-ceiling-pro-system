export type AuthRecovery =
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "code"; code: string }
  | { kind: "token_hash"; tokenHash: string }
  | { kind: "none" };

export function parseAuthRecoveryUrl(url: string): AuthRecovery {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.slice(1));
  const query = parsed.searchParams;

  if (hash.get("type") === "recovery") {
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken };
  }

  const code = query.get("code");
  if (code) return { kind: "code", code };

  const tokenHash = query.get("token_hash");
  if (query.get("type") === "recovery" && tokenHash) return { kind: "token_hash", tokenHash };

  return { kind: "none" };
}
