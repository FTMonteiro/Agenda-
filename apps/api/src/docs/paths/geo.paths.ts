import { z } from "zod";
import { geoReverseQuerySchema, geoSearchQuerySchema } from "../../modules/geo/geo.schema";
import { authErrors, bearerAuth, commonErrors, registry, successResponse } from "../registry";

const placeSchema = registry.register(
  "Place",
  z.object({
    displayName: z.string(),
    street: z.string(),
    bairro: z.string().nullable(),
    distrito: z.string().nullable(),
    municipio: z.string().nullable(),
    provincia: z.string().nullable(),
    latitude: z.number(),
    longitude: z.number(),
  }),
);

registry.registerPath({
  method: "get",
  path: "/geo/provinces",
  tags: ["Geo"],
  summary: "As províncias de Angola, com o centro de cada uma (OpenStreetMap)",
  responses: {
    200: successResponse(z.array(z.object({ name: z.string(), latitude: z.number(), longitude: z.number() }))),
    ...commonErrors,
  },
});

registry.registerPath({
  method: "get",
  path: "/geo/provinces/{name}/zones",
  tags: ["Geo"],
  summary: "Cidades, bairros e zonas de uma província, com o ponto de cada um (OpenStreetMap)",
  request: { params: z.object({ name: z.string() }) },
  responses: {
    200: successResponse(z.array(z.object({ name: z.string(), latitude: z.number(), longitude: z.number() }))),
    ...commonErrors,
  },
});

registry.registerPath({
  method: "get",
  path: "/geo/search",
  tags: ["Geo"],
  summary: "Procurar uma morada ou localidade em Angola (OpenStreetMap)",
  security: bearerAuth,
  request: { query: geoSearchQuerySchema },
  responses: { 200: successResponse(z.array(placeSchema)), ...commonErrors, ...authErrors },
});

registry.registerPath({
  method: "get",
  path: "/geo/reverse",
  tags: ["Geo"],
  summary: "Morada e região de um ponto (OpenStreetMap); null se não houver dados",
  security: bearerAuth,
  request: { query: geoReverseQuerySchema },
  responses: { 200: successResponse(placeSchema.nullable()), ...commonErrors, ...authErrors },
});
