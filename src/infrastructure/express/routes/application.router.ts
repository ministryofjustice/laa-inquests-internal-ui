import type { NextFunction, Request, Response, Router } from "express";
import type { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";
import type { CertificateAdaptor } from "#src/adaptors/presenter/applications/Certificate.adaptor.js";
import type { SearchApplicationAdaptor } from "#src/adaptors/presenter/applications/SearchApplication/SearchApplication.adaptor.js";

function createApplicationRouter(
  applicationRouter: Router,
  applicationDisplayAdaptor: ApplicationAdaptor,
  certificateDisplayAdaptor: CertificateAdaptor,
  searchApplicationAdaptor: SearchApplicationAdaptor,
): Router {
  applicationRouter.get(
    "/search",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        searchApplicationAdaptor.renderSearchApplicationPage(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.post(
    "/search",
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        searchApplicationAdaptor.processSearchApplicationPage(req, res);
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:laaReference/overview",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference },
      } = req;
      const laaReferenceParam: string = laaReference as string;
      try {
        await applicationDisplayAdaptor.renderApplicationPage(
          req,
          res,
          laaReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:laaReference/coroners-letter",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference },
      } = req;
      const laaReferenceParam: string = laaReference as string;
      try {
        await applicationDisplayAdaptor.serveCoronersLetterDocument(
          req,
          res,
          laaReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.get(
    "/:laaReference/certificate",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference },
      } = req;
      const laaReferenceParam: string = laaReference as string;
      try {
        await certificateDisplayAdaptor.renderCertificatePage(
          req,
          res,
          laaReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  applicationRouter.post(
    "/:laaReference/note",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        params: { laaReference },
      } = req;
      const laaReferenceParam: string = laaReference as string;
      try {
        await applicationDisplayAdaptor.submitHistoryNote(
          req,
          res,
          laaReferenceParam,
        );
      } catch (err: unknown) {
        next(err);
      }
    },
  );

  return applicationRouter;
}

export default createApplicationRouter;
