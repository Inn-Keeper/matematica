/** Reads a PKCE code only from the root callback of the expected app scheme. */
export function parseAuthCallbackCode(
  url: string,
  expectedScheme: string,
): string | null {
  try {
    const parsed = new URL(url);
    const isRoot =
      parsed.hostname === "" &&
      (parsed.pathname === "" || parsed.pathname === "/");

    if (parsed.protocol !== `${expectedScheme}:` || !isRoot) return null;
    return parsed.searchParams.get("code");
  } catch {
    return null;
  }
}
