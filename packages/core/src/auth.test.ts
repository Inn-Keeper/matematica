import { describe, expect, it } from "vitest";
import { parseAuthCallbackCode } from "./auth";

describe("parseAuthCallbackCode", () => {
  it("reads a PKCE code from the expected app callback", () => {
    expect(
      parseAuthCallbackCode("matematica://?code=code-123", "matematica"),
    ).toBe("code-123");
  });

  it("decodes the callback code", () => {
    expect(
      parseAuthCallbackCode(
        "matematica://?code=code%20with%20spaces",
        "matematica",
      ),
    ).toBe("code with spaces");
  });

  it("rejects another scheme, another route, or a missing code", () => {
    expect(
      parseAuthCallbackCode("attacker://?code=code-123", "matematica"),
    ).toBeNull();
    expect(
      parseAuthCallbackCode(
        "matematica://settings?code=code-123",
        "matematica",
      ),
    ).toBeNull();
    expect(parseAuthCallbackCode("matematica://", "matematica")).toBeNull();
  });
});
