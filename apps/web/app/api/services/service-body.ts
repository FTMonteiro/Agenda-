export interface ServiceFields {
  name: string;
  description: string;
  price: number;
  duration: number;
  active: boolean;
}

// The same checks (and messages) the old dashboard applied before saving a service.
export function parseServiceBody(body: Record<string, unknown>): ServiceFields | { error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const price = Number(body.price);
  const duration = Number(body.duration);
  const active = typeof body.active === "boolean" ? body.active : true;

  if (!name) return { error: "O nome do serviço é obrigatório." };
  if (!Number.isFinite(price) || price <= 0) return { error: "Informe o preço do serviço. Tem de ser maior que zero." };
  if (Math.round(price * 100) / 100 !== price) return { error: "O preço pode ter no máximo duas casas decimais." };
  if (!Number.isInteger(duration) || duration <= 0) return { error: "A duração do serviço é inválida." };
  if (duration > 1440) return { error: "A duração não pode ultrapassar 24 horas." };

  return { name, description, price, duration, active };
}
