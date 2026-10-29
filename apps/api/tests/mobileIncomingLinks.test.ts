import { describe, expect, it } from "vitest";
// The mobile app's real filter (apps/mobile/src/services/incomingLinks.ts): a plain module.
import { isSafeIncomingLink } from "../../mobile/src/services/incomingLinks";
// The vulnerable decoder the app ships (via expo-router → query-string), to show the
// filter removes exactly its slow path.
import decodeUriComponent from "decode-uri-component";
import { parse } from "query-string";

const time = (f: () => unknown) => {
  const start = performance.now();
  f();
  return performance.now() - start;
};

describe("deep links recebidos pela app (decode-uri-component 0.2)", () => {
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

  it("o padrão recusado é de facto lento no decoder vulnerável; o aceite é rápido", () => {
    const malicious = "x=" + "%ff".repeat(300);
    expect(isSafeIncomingLink(malicious)).toBe(false);
    expect(time(() => decodeUriComponent(malicious))).toBeGreaterThan(50);

    const accepted = "x=" + "%C3%A3".repeat(120);
    expect(isSafeIncomingLink(accepted)).toBe(true);
    expect(time(() => parse(accepted))).toBeLessThan(50);
  });
});
