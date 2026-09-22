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
    "/:laaReference/claims/:claimReference/confirm-disbursement-costs",
    (req: Request, res: Response): void => {
      const {
        params: { laaReference, claimReference },
      } = req;
      const laaReferenceParam = laaReference as string;
      const claimReferenceParam = claimReference as string;

      confirmDisbursementCostsAdaptor.renderConfirmDisbursementCostsPage(
        req,
        res,
        laaReferenceParam,
        claimReferenceParam,
      );
    },
  );

  confirmDisbursementCostsRouter.post(
    "/:laaReference/claims/:claimReference/confirm-disbursement-costs",
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
