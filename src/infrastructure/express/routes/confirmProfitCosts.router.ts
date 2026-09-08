import type { Request, Response, Router } from "express";
import type { ConfirmProfitCostsAdaptor } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/ConfirmProfitCosts.adaptor.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { ConfirmProfitCostsForm } from "#src/adaptors/presenter/applications/ConfirmProfitCosts/models/form.types.js";

export function createConfirmProfitCostsRouter(
  confirmProfitCostsRouter: Router,
  confirmProfitCostsAdaptor: ConfirmProfitCostsAdaptor,
): Router {
  confirmProfitCostsRouter.get(
    "/:laaReference/claims/:claimId/confirm-profit-costs",
    (req: Request, res: Response): void => {
      const {
        params: { laaReference, claimId },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimIdParam = claimId as string;

      confirmProfitCostsAdaptor.renderConfirmProfitCostsPage(
        req,
        res,
        laaReferenceParam,
        claimIdParam,
      );
    },
  );

  confirmProfitCostsRouter.post(
    "/:laaReference/claims/:claimId/confirm-profit-costs",
    (req: Request, res: Response): void => {
      confirmProfitCostsAdaptor.processConfirmProfitCostsForm(
        req as unknown as TypedRequest<ConfirmProfitCostsForm, ClaimIdParams>,
        res,
      );
    },
  );

  return confirmProfitCostsRouter;
}
