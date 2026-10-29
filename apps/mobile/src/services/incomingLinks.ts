/*
 * Links that open the app (deep links) are parsed by expo-router, which decodes their query
 * with query-string → decode-uri-component 0.2. That decoder takes super-linear time on
 * malformed percent-encoding ("%ff%ff…": ~1 200 characters already block the JS thread for
 * seconds), so a crafted link could freeze the app. Upstream fixes need Expo SDK 58.
 *
 * The slow path only runs when the platform's own decodeURIComponent (linear) throws: a link
 * it decodes cleanly decodes cleanly in every query component too (escapes never contain
 * "&" or "="). So any link it rejects — or that is implausibly long — is dropped before
 * expo-router sees it. The app's own links (OAuth handoff, routes) are short and well formed.
 */
const MAX_LINK_LENGTH = 2048;
const MAX_ESCAPES = 256;

export function isSafeIncomingLink(path: string): boolean {
  if (typeof path !== "string" || path.length > MAX_LINK_LENGTH) return false;
  if ((path.match(/%/g)?.length ?? 0) > MAX_ESCAPES) return false;
  try {
    decodeURIComponent(path);
    return true;
  } catch {
    return false;
  }
}
