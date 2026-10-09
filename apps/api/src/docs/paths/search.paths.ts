import { searchQuerySchema } from "../../modules/search/search.schema";
import { commonErrors, listSuccessResponse, registry } from "../registry";
import { searchResultSchema } from "../schemas";

registry.registerPath({
  method: "get",
  path: "/search",
  tags: ["Search"],
  summary: "Pesquisar negócios/serviços com ranking por relevância, distância, preço ou nota",
  request: { query: searchQuerySchema },
  responses: {
    200: listSuccessResponse(searchResultSchema),
    ...commonErrors,
  },
});
