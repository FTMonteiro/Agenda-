import { describe, expect, it } from "vitest";
// The web dashboard's real check (apps/web/lib/image-formats.ts), kept in step with the API.
import { ACCEPTED_IMAGE_TYPES, isAcceptedImageUrl } from "../../web/lib/image-formats";
import { imageUrl } from "../src/shared/validation/fields";

const samples = [
  "data:image/jpeg;base64,/9j/4AAQ",
  "data:image/png;base64,iVBORw0KGgo=",
  "data:image/webp;base64,UklGRg==",
  "data:image/gif;base64,R0lGODlh",
  "data:image/heic;base64,AAAA",
  "data:image/svg+xml;base64,PHN2Zz4=",
  "data:text/html;base64,PHNjcmlwdD4=",
  "https://cdn.example.com/a.jpg",
  "http://cdn.example.com/a.jpg",
  "javascript:alert(1)",
];

describe("R-11: a web e a API aceitam exatamente os mesmos formatos de imagem", () => {
  it.each(samples)("%s", (value) => {
    expect(isAcceptedImageUrl(value)).toBe(imageUrl.safeParse(value).success);
  });

  it("o seletor de ficheiros oferece só os tipos aceites", () => {
    expect(ACCEPTED_IMAGE_TYPES.split(",")).toEqual(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  });
});
