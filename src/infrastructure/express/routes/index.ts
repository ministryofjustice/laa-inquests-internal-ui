import express from "express";
import type { NextFunction, Request, Response } from "express";
import { ConfidentialClientApplication } from "@azure/msal-node";

import createApplicationRouter from "#src/infrastructure/express/routes/application.router.js";
import { createApplicationDecisionRouter } from "#src/infrastructure/express/routes/applicationDecision.router.js";
import { createAuthRouter } from "#src/infrastructure/express/routes/auth.router.js";
import { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";
import { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import { ApplicationAPIAdaptor } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/ApplicationAPI.adaptor.js";
import { AuthAdaptor } from "#src/adaptors/presenter/auth/Auth.adaptor.js";
import { EntraAuthAdaptor } from "#src/adaptors/source/auth/EntraAuth.adaptor.js";
import { requireAuth } from "#src/infrastructure/express/middleware/auth/requireAuth.js";
import axios from "axios";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import config from "#src/infrastructure/config/config.js";
import { ApplicationDecisionValidator } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.validator.js";
import { PrepareDecisionFormUseCase } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";
import { ProcessDecisionSelectionUseCase } from "#src/use-cases/applications/decision/ProcessDecisionSelection.useCase.js";
import { ProcessJustificationUseCase } from "#src/use-cases/applications/decision/ProcessJustification.useCase.js";
import { ProcessCertificateStartDateUseCase } from "#src/use-cases/applications/decision/ProcessCertificateStartDate.useCase.js";
import { PrepareConfirmationViewUseCase } from "#src/use-cases/applications/decision/PrepareConfirmationView.useCase.js";
import { RefuseDecisionUseCase } from "#src/use-cases/applications/decision/RefuseDecision.useCase.js";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";
import { BuildCertificateViewUseCase } from "#src/use-cases/applications/overview/BuildCertificateView.useCase.js";
import { HomeAdaptor } from "#src/adaptors/presenter/home/Home.adaptor.js";
import { BuildApplicationsListViewUseCase } from "#src/use-cases/home/BuildApplicationsListView.useCase.js";
import { ReportsAdaptor } from "#src/adaptors/presenter/reports/Reports.adaptor.js";
import { createReportsRouter } from "#src/infrastructure/express/routes/reports.router.js";

const router = express.Router();
const SUCCESSFUL_REQUEST = 200;
const UNSUCCESSFUL_REQUEST = 500;

/**
 * Adapters and Clients
 */

function createAuthSource(): EntraAuthAdaptor {
  const entraClient = new ConfidentialClientApplication({
    auth: {
      clientId: config.AUTH_CLIENT_ID,
      authority: config.AUTH_DIRECTORY_URL,
      clientSecret: config.AUTH_CLIENT_SECRET,
    },
  });
  return new EntraAuthAdaptor(entraClient);
}

const viewApplicationAdaptor = new ApplicationAPIAdaptor(
  axios,
  config.INQUESTS_API_URL,
);
const buildApplicationOverviewViewUseCase =
  new BuildApplicationOverviewViewUseCase();
const prepareDecisionFormUseCase = new PrepareDecisionFormUseCase();
const processDecisionSelectionUseCase = new ProcessDecisionSelectionUseCase();
const processJustificationUseCase = new ProcessJustificationUseCase();
const processCertificateStartDateUseCase =
  new ProcessCertificateStartDateUseCase();
const prepareConfirmationViewUseCase = new PrepareConfirmationViewUseCase();
const submitDecisionUseCase = new RefuseDecisionUseCase();
const buildApplicationsListViewUseCase = new BuildApplicationsListViewUseCase();
const buildCertificateViewUseCase = new BuildCertificateViewUseCase(
  viewApplicationAdaptor,
);
const applicationDisplayAdaptor = new ApplicationAdaptor(
  viewApplicationAdaptor,
  buildApplicationOverviewViewUseCase,
  buildCertificateViewUseCase,
);
const homeAdaptor = new HomeAdaptor(
  viewApplicationAdaptor,
  new SessionHelper(),
  buildApplicationsListViewUseCase,
);
const reportsAdaptor = new ReportsAdaptor(viewApplicationAdaptor);
const applicationDecisionAdaptor = new ApplicationDecisionAdaptor(
  viewApplicationAdaptor,
  new SessionHelper(),
  new ApplicationDecisionValidator(),
  {
    prepareDecisionFormUseCase,
    processDecisionSelectionUseCase,
    processJustificationUseCase,
    processCertificateStartDateUseCase,
    prepareConfirmationViewUseCase,
    refuseDecisionUseCase: submitDecisionUseCase,
  },
);
const authAdaptor = new AuthAdaptor(
  createAuthSource(),
  config.AUTH_REDIRECT_URI,
  config.AUTH_POST_LOGOUT_URI,
  config.AUTH_SCOPES,
);

/**
 * Routes
 */

router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await homeAdaptor.renderHomePage(req, res);
    } catch (err: unknown) {
      next(err);
    }
  },
);

// liveness and readiness probes for Helm deployments
router.get("/status", (req: Request, res: Response): void => {
  res.status(SUCCESSFUL_REQUEST).send("OK");
});

router.get("/health", (req: Request, res: Response): void => {
  res.status(SUCCESSFUL_REQUEST).send("Healthy");
});

router.get("/error", (req: Request, res: Response): void => {
  // Simulate an error
  res
    .set("X-Error-Tag", "TEST_500_ALERT")
    .status(UNSUCCESSFUL_REQUEST)
    .send("Internal Server Error");
});

router.use("/auth", createAuthRouter(express.Router(), authAdaptor));

router.use(
  "/reports",
  requireAuth,
  createReportsRouter(express.Router(), reportsAdaptor),
);

router.use("/applications", requireAuth, [
  createApplicationRouter(express.Router(), applicationDisplayAdaptor),
  createApplicationDecisionRouter(express.Router(), applicationDecisionAdaptor),
]);
export default router;
