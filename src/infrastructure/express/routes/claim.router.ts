import type { NextFunction, Request, Response, Router } from "express";

import type { SearchClaimAdaptor } from "#src/adaptors/presenter/applications/SearchClaim/SearchClaim.adaptor.js";


function createClaimRouter(
  claimRouter: Router,
  searchClaimAdaptor: SearchClaimAdaptor,
): Router {
  claimRouter.get(
    "/search",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        //searchClaimAdaptor.renderSearchApplicationPage(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  claimRouter.post(
    "/search",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        //searchClaimAdaptor.processSearchApplicationPage(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return claimRouter;
}

export default createClaimRouter;
