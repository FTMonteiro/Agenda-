import { describe, expect, it } from "vitest";
// The mobile app's real filter (apps/mobile/src/services/incomingLinks.ts): a plain module.
import { isSafeIncomingLink } from "../../mobile/src/services/incomingLinks";
// Since Expo SDK 58 the app no longer ships decode-uri-component (expo-router dropped
// query-string); the filter stays as defence in depth for links that open the app.
describe("deep links recebidos pela app", () => {
  it.each([
    "slotix://auth?handoff=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.abc_-123&verifier=x",
    "slotix://auth?error=GOOGLE_CANCELLED",
    "slotix://space?id=6f1c2b8e-0d4a-4c6e-9b1a-2f3d4e5f6a7b",
    "/booking/date?serviceId=abc&name=Corte%20de%20cabelo%20%E2%80%94%20S%C3%A3o",
    "exp://192.168.1.10:8081/--/auth?handoff=a.b.c",
  ])("aceita %s", (link) => {
    expect(isSafeIncomingLink(link)).toBe(true);
  });

  it.each([
    ["byte inválido repetido", "slotix://space?x=" + "%ff".repeat(400)],
    ["multibyte incompleto", "slotix://space?x=" + "%c3".repeat(400)],
    ["escape partido", "slotix://space?x=%E0%A4%A"],
    ["escapes a mais", "slotix://space?x=" + "%20".repeat(300)],
    ["demasiado longo", "slotix://space?x=" + "a".repeat(3000)],
  ])("recusa %s", (_label, link) => {
    expect(isSafeIncomingLink(link)).toBe(false);
  });
});
