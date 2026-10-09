import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";

// Importing each *.paths.ts module registers its routes on `registry` as a side effect.
import "./paths/auth.paths";
import "./paths/users.paths";
import "./paths/businesses.paths";
import "./paths/services.paths";
import "./paths/professionals.paths";
import "./paths/availability.paths";
import "./paths/appointments.paths";
import "./paths/payments.paths";
import "./paths/favorites.paths";
import "./paths/reviews.paths";
import "./paths/notifications.paths";
import "./paths/gallery.paths";
import "./paths/search.paths";
import "./paths/clients.paths";
import "./paths/geo.paths";

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Agenda+ API",
      version: "1.0.0",
      description:
        "API do Agenda+ — marketplace de agendamento de serviços. Todos os endpoints estão sob o prefixo /api/v1.",
    },
    servers: [{ url: "/api/v1" }],
  });
}
