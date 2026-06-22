import express from "express";
import type { NextFunction, Request, Response } from "express";
import { ConfidentialClientApplication } from "@azure/msal-node";

import createApplicationRouter from "#src/infrastructure/express/routes/application.router.js";
import { createApplicationDecisionRouter } from "#src/infrastructure/express/routes/applicationDecision.router.js";
import { createAuthRouter } from "#src/infrastructure/express/routes/auth.router.js";
import createTestRouter from "#src/infrastructure/express/routes/test.router.js";
import { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";
import { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import { ApplicationAPIAdaptor } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/ApplicationAPI.adaptor.js";
import { AuthAdaptor } from "#src/adaptors/presenter/auth/Auth.adaptor.js";
import { EntraAuthAdaptor } from "#src/adaptors/source/auth/EntraAuth.adaptor.js";
import { MockAuthAdaptor } from "#src/adaptors/source/auth/MockAuth.adaptor.js";
import { requireAuth } from "#src/infrastructure/express/middleware/auth/requireAuth.js";
import axios from "axios";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import config from "#src/infrastructure/config/config.js";
import { ApplicationDecisionValidator } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.validator.js";
import { PrepareDecisionFormUseCase } from "#src/use-cases/applications/decision/PrepareDecisionForm.useCase.js";
import { ProcessDecisionSelectionUseCase } from "#src/use-cases/applications/decision/ProcessDecisionSelection.useCase.js";
import { ProcessJustificationUseCase } from "#src/use-cases/applications/decision/ProcessJustification.useCase.js";
import { PrepareConfirmationViewUseCase } from "#src/use-cases/applications/decision/PrepareConfirmationView.useCase.js";
import { SubmitDecisionUseCase } from "#src/use-cases/applications/decision/SubmitDecision.useCase.js";
import { BuildApplicationOverviewViewUseCase } from "#src/use-cases/applications/overview/BuildApplicationOverviewView.useCase.js";
import { HomeAdaptor } from "#src/adaptors/presenter/home/Home.adaptor.js";
import { BuildApplicationsListViewUseCase } from "#src/use-cases/home/BuildApplicationsListView.useCase.js";

const router = express.Router();
const SUCCESSFUL_REQUEST = 200;
const UNSUCCESSFUL_REQUEST = 500;

/**
 * Adapters and Clients
 */

function createAuthSource(): EntraAuthAdaptor | MockAuthAdaptor {
  if (process.env.NODE_ENV === "test") {
    return new MockAuthAdaptor(
      config.MOCK_OAUTH_URL ?? "http://localhost:4001",
    );
  }
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
const prepareConfirmationViewUseCase = new PrepareConfirmationViewUseCase();
const submitDecisionUseCase = new SubmitDecisionUseCase();
const buildApplicationsListViewUseCase = new BuildApplicationsListViewUseCase();
const applicationDisplayAdaptor = new ApplicationAdaptor(
  viewApplicationAdaptor,
  buildApplicationOverviewViewUseCase,
);
const homeAdaptor = new HomeAdaptor(
  viewApplicationAdaptor,
  new SessionHelper(),
  buildApplicationsListViewUseCase,
);
const applicationDecisionAdaptor = new ApplicationDecisionAdaptor(
  viewApplicationAdaptor,
  new SessionHelper(),
  new ApplicationDecisionValidator(),
  {
    prepareDecisionFormUseCase,
    processDecisionSelectionUseCase,
    processJustificationUseCase,
    prepareConfirmationViewUseCase,
    submitDecisionUseCase,
  },
);
const authAdaptor = new AuthAdaptor(
  createAuthSource(),
  config.AUTH_REDIRECT_URI,
  config.AUTH_POST_LOGOUT_URI,
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

router.use("/applications", requireAuth, [
  createApplicationRouter(express.Router(), applicationDisplayAdaptor),
  createApplicationDecisionRouter(express.Router(), applicationDecisionAdaptor),
]);

if (process.env.NODE_ENV === "test") {
  router.use("/", createTestRouter(express.Router()));
}

export default router;
