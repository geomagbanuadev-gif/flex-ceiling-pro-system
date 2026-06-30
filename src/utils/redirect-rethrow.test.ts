import { describe, it, expect } from "vitest";
import { redirect, unstable_rethrow } from "next/navigation";

/**
 * Guards the fix for the "NEXT_REDIRECT shown as an error" bug.
 *
 * Every form/button calls a server action inside `try { await action() } catch`.
 * Server actions finish with `redirect()`, which works by THROWING a NEXT_REDIRECT
 * error. The catch must re-throw that framework error (so Next performs the
 * navigation) while still surfacing real errors to the user. We do that with
 * `unstable_rethrow(e)` as the first line of every catch.
 *
 * These tests pin both halves of that contract.
 */
describe("unstable_rethrow in server-action catch blocks", () => {
  it("re-throws a real redirect() error so navigation still happens", () => {
    let caught: unknown;
    try {
      redirect("/somewhere");
    } catch (e) {
      caught = e;
    }
    // sanity: redirect() really did throw the framework error
    expect((caught as { digest?: string })?.digest).toMatch(/^NEXT_REDIRECT;/);
    // the catch must NOT swallow it
    expect(() => unstable_rethrow(caught)).toThrow();
  });

  it("lets an ordinary error pass through so the error message still shows", () => {
    // returns undefined (does not throw) for non-framework errors,
    // so the code after it (setError / toast) runs as before
    expect(() => unstable_rethrow(new Error("database is down"))).not.toThrow();
  });
});
