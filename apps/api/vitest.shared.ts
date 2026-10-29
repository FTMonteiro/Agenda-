// Variáveis comuns a todos os testes. DOTENV_CONFIG_PATH aponta para um ficheiro que não
// existe: assim o `import "dotenv/config"` do env.ts nunca carrega o .env real (que pode
// apontar para a base de dados de produção, o Supabase ou as credenciais Google).
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://agenda_test:agenda_test@127.0.0.1:55432/agenda_test";

export const testEnv = {
  DOTENV_CONFIG_PATH: ".env.test-nao-existe",
  NODE_ENV: "test",
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  WEB_URL: "http://localhost:3001",
  CORS_ORIGINS: "",
  // Valores fictícios: os pedidos à Google são substituídos por mocks nos testes.
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  // Segredo fictício partilhado com o código da web nos testes do proxy interno.
  INTERNAL_PROXY_SECRET: "test-internal-proxy-secret-0123456789abcdef",
  TRUSTED_CLIENT_IP_HEADER: "x-real-ip",
  SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
};
