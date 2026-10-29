// Os testes de integração apagam todas as linhas entre testes. Isto só pode acontecer numa
// base local e descartável — nunca no Neon nem em qualquer outro host remoto.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "postgres"]);

export function assertLocalTestDatabase(url: string | undefined): void {
  if (!url) throw new Error("DATABASE_URL de teste em falta.");
  const { hostname, pathname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname) || hostname.endsWith("neon.tech")) {
    throw new Error("Recusado: os testes de integração só correm contra uma base de dados local.");
  }
  if (!/test/i.test(pathname)) {
    throw new Error("Recusado: o nome da base de dados de teste tem de conter 'test'.");
  }
}
