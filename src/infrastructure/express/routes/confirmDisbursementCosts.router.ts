import type { Request, Response, Router } from "express";
import type { ConfirmDisbursementCostsAdaptor } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/ConfirmDisbursementCosts.adaptor.js";
import type {
  ClaimIdParams,
  TypedRequest,
} from "#src/infrastructure/express/api.types.js";
import type { ConfirmDisbursementCostsForm } from "#src/adaptors/presenter/applications/ConfirmDisbursementCosts/models/form.types.js";

export function createConfirmDisbursementCostsRouter(
  confirmDisbursementCostsRouter: Router,
  confirmDisbursementCostsAdaptor: ConfirmDisbursementCostsAdaptor,
): Router {
  confirmDisbursementCostsRouter.get(
    "/:laaReference/claims/:claimId/confirm-disbursement-costs",
    (req: Request, res: Response): void => {
      const {
        params: { laaReference, claimId },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimIdParam = claimId as string;

      confirmDisbursementCostsAdaptor.renderConfirmDisbursementCostsPage(
        req,
        res,
        laaReferenceParam,
        claimIdParam,
      );
    },
  );

  confirmDisbursementCostsRouter.post(
    "/:laaReference/claims/:claimId/confirm-disbursement-costs",
    (req: Request, res: Response): void => {
      confirmDisbursementCostsAdaptor.processConfirmDisbursementCostsForm(
        req as unknown as TypedRequest<
          ConfirmDisbursementCostsForm,
          ClaimIdParams
        >,
        res,
      );
    },
  );

  return confirmDisbursementCostsRouter;
}
