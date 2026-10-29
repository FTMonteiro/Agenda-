// Route handlers build API paths from URL parameters. A parameter that is, or decodes to,
// a dot segment ("..", ".%2e", "%2e.", "%252e%252e"…) or carries a separator would let a
// request reach a different API endpoint than the handler intended — fetch() normalises
// dot segments, including percent-encoded ones. Such paths are refused outright.

const MAX_DECODE_ROUNDS = 3;

function decodeFully(segment: string): string | null {
  let current = segment;
  for (let round = 0; round < MAX_DECODE_ROUNDS; round++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return null; // malformed escapes
    }
    if (next === current) return current;
    current = next;
  }
  // Still changing after several rounds: deliberately layered encoding, refused.
  return decodeURIComponent(current) === current ? current : null;
}

export function isSafeApiPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  const pathname = path.split(/[?#]/)[0];
  if (/[\\\u0000-\u001f\u007f]/.test(pathname)) return false;

  for (const segment of pathname.split("/").slice(1)) {
    const decoded = decodeFully(segment);
    if (decoded === null || decoded === "." || decoded === ".." || /[/\\\u0000-\u001f\u007f]/.test(decoded)) return false;
  }

  // Belt and braces: the URL parser must leave the path exactly as built.
  return new URL(pathname, "http://api.invalid").pathname === pathname;
}

export function assertSafeApiPath(path: string): void {
  if (!isSafeApiPath(path)) throw new Error("Caminho da API inválido.");
}
