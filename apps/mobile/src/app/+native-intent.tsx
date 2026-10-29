import { isSafeIncomingLink } from "../services/incomingLinks";

// Every link that opens the app passes here before expo-router parses it (see
// services/incomingLinks.ts for why). An unsafe link is ignored: on a cold start the app
// opens on its home screen, otherwise it stays where it is.
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    if (isSafeIncomingLink(path)) return path;
  } catch {
    // never let link handling crash the app
  }
  return initial ? "/" : null;
}
