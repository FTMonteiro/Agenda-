// Prisma treats an `undefined` filter as "no filter": `findMany({ where: { userId } })`
// with no userId returns every row. The user-scoped queries pass their id through this,
// so a missing id is a loud failure (500) instead of a silent leak of everyone's data.
export function requireId(id: unknown, label = "id"): string {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Consulta recusada: ${label} em falta.`);
  }
  return id;
}
