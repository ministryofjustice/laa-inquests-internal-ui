import type { Request, Response, Router } from "express";
import type { PublicAuthorityAdaptor } from "#src/adaptors/presenter/applications/PublicAuthority/PublicAuthority.adaptor.js";
import type { IdParams, TypedRequest } from "../api.types.js";
import type { PublicAuthorityFormData } from "#src/adaptors/presenter/applications/PublicAuthority/PublicAuthority.validator.js";

export function createPublicAuthorityRouter(
  publicAuthorityRouter: Router,
  publicAuthorityAdaptor: PublicAuthorityAdaptor,
): Router {
  publicAuthorityRouter.get(
    "/:applicationId/public-authority",
    async (req: Request, res: Response): Promise<void> => {
      await publicAuthorityAdaptor.renderSelectionForm(req, res);
    },
  );

  publicAuthorityRouter.post(
    "/:applicationId/public-authority",
    async (req: Request, res: Response): Promise<void> => {
      await publicAuthorityAdaptor.processSelectionForm(
        req as unknown as TypedRequest<PublicAuthorityFormData, IdParams>,
        res,
      );
    },
  );

  publicAuthorityRouter.get(
    "/:applicationId/public-authority/confirm",
    async (req: Request, res: Response): Promise<void> => {
      await publicAuthorityAdaptor.renderConfirmationPage(req, res);
    },
  );

  publicAuthorityRouter.post(
    "/:applicationId/public-authority/confirm",
    async (req: Request, res: Response): Promise<void> => {
      await publicAuthorityAdaptor.processConfirmation(req, res);
    },
  );

  return publicAuthorityRouter;
}
