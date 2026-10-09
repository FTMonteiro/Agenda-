import type { Request, Response } from "express";
import { sendListSuccess } from "../../shared/utils/apiResponse";
import { withStoredLocation } from "../users/viewerLocation";
import { searchService } from "./search.service";
import type { SearchQueryInput } from "./search.schema";

export const searchController = {
  async search(req: Request, res: Response) {
    const query = await withStoredLocation(req.validatedQuery as unknown as SearchQueryInput, req.user?.id);
    const { data, meta } = await searchService.search(query);
    sendListSuccess(res, data, meta);
  },
};
