/**
 * Parse the parameters out of an OAuth callback URL.
 *
 * Kept in its own module with ZERO imports so it can be unit-tested directly. A bug
 * here means nobody can sign in with Google or Apple, so it is worth testing rather
 * than trusting.
 *
 * Written by hand rather than using expo-auth-session's getQueryParams, which is not
 * re-exported from the package index (only reachable through a build/ path that could
 * move between versions). Handles `?a=b` and `#a=b`, since providers differ.
 */
export function parseCallbackParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!url) return out;

  const candidates = [url.indexOf('?'), url.indexOf('#')].filter((index) => index >= 0);
  if (candidates.length === 0) return out;
  const separatorIndex = Math.min(...candidates);

  for (const segment of url.slice(separatorIndex + 1).split(/[&#?]/)) {
    if (!segment) continue;
    const equalsIndex = segment.indexOf('=');
    if (equalsIndex < 0) continue;
    const key = decodeURIComponent(segment.slice(0, equalsIndex));
    const value = decodeURIComponent(segment.slice(equalsIndex + 1).replace(/\+/g, ' '));
    // First occurrence wins, so a crafted duplicate cannot override the real code.
    if (key && !(key in out)) out[key] = value;
  }
  return out;
}
