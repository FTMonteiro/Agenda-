import { describe, expect, it } from "vitest";
// The web dashboard's real guard (apps/web/lib/api-path.ts): a plain module, no Next imports.
import { isSafeApiPath } from "../../web/lib/api-path";

describe("R-07: guarda de caminhos do proxy web → API", () => {
  it.each([
    "/appointments/../users/me",
    "/appointments/./x",
    "/appointments/%2e%2e/users/me",
    "/appointments/%2E%2E/users/me",
    "/appointments/.%2e/users/me",
    "/appointments/%2e./users/me",
    "/appointments/%2e/users",
    "/appointments/%252e%252e/users/me",
    "/appointments/%25252e%25252e/users/me",
    "/appointments/..%2fusers",
    "/appointments/a%2f..%2fb",
    "/appointments/a%5cb",
    "/appointments/a\\..\\b",
    "/appointments/%E0%A4%A",
    "//evil.example/x",
    "appointments/x",
    "/appointments/%00",
  ])("recusa %s", (path) => {
    expect(isSafeApiPath(path)).toBe(false);
  });

  it.each([
    "/appointments/6f1c2b8e-0d4a-4c6e-9b1a-2f3d4e5f6a7b",
    "/appointments/6f1c2b8e-0d4a-4c6e-9b1a-2f3d4e5f6a7b/reschedule",
    "/businesses/abc/gallery/def/cover",
    "/geo/provinces/Luanda%20Norte/zones",
    "/professionals?businessId=6f1c2b8e-0d4a-4c6e-9b1a-2f3d4e5f6a7b",
    "/clients?businessId=x&q=../a",
    "/appointments/file.name",
  ])("aceita %s", (path) => {
    expect(isSafeApiPath(path)).toBe(true);
  });

  it("um id com .. passado por encodeURIComponent (como nas rotas [id]) é recusado ou inofensivo", () => {
    for (const id of ["..", ".%2e", "../../users/me", "%2e%2e"]) {
      const path = `/appointments/${encodeURIComponent(id)}`;
      if (isSafeApiPath(path)) expect(new URL(path, "http://api.invalid").pathname).toBe(path);
    }
  });
});
