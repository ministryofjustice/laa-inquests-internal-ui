import express from "express";
import type { Request, Response } from "express";

import createApplicationRouter from "#src/infrastructure/express/routes/application.router.js";
import { createApplicationDecisionRouter } from "#src/infrastructure/express/routes/applicationDecision.router.js";
import { ApplicationAdaptor } from "#src/adaptors/Application.adaptor.js";
import { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import { ViewApplicationAdaptor } from "#src/adaptors/source/inquests-api/applications/ViewApplication/ViewApplication.adaptor.js";
import axios from "axios";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";

// Create a new router
const router = express.Router();
const decisionRouter = express.Router();
const SUCCESSFUL_REQUEST = 200;
const UNSUCCESSFUL_REQUEST = 500;

/* GET home page. */
router.get("/", (req: Request, res: Response): void => {
  res.render("main/index");
});

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

const viewApplicationAdaptor = new ViewApplicationAdaptor(
  axios,
  "https://laa-inquests-api-uat.apps.live.cloud-platform.service.justice.gov.uk",
);
const applicationDisplayAdaptor = new ApplicationAdaptor(
  viewApplicationAdaptor,
);
const applicationDecisionAdaptor = new ApplicationDecisionAdaptor(
  viewApplicationAdaptor,
  new SessionHelper(),
);

decisionRouter.post(
  "/:applicationId/decision/confirmation",
  async (req: Request, res: Response) => {
    const {
      params: { applicationId },
    } = req;
    const appId = applicationId as string;

    const sessionHelper = new SessionHelper();
    const sessionData = sessionHelper.getSessionData(req, "decision") ?? {};

    await axios.patch(
      `https://laa-inquests-api-uat.apps.live.cloud-platform.service.justice.gov.uk/applications/${appId}/merits-decision`,
      { meritsDecision: sessionData.overallDecision },
    );

    res.redirect(`/applications/${appId}/decision/success`);
  },
);

decisionRouter.get(
  "/:applicationId/decision/confirmation",
  (req: Request, res: Response) => {
    const {
      params: { applicationId },
    } = req;
    const appId = applicationId as string;
    const backUrl = `/applications/${appId}/decision/justification`;

    const sessionHelper = new SessionHelper();
    const proceeding = sessionHelper.getSessionData(req, "decide") ?? {};

    const overallDecisionLabels: Record<string, string> = {
      GRANTED: "Grant",
      REFUSED: "Refuse",
    };

    const refusalReasonLabels: Record<string, string> = {
      "not-in-scope": "Not in scope",
      "insufficient-information": "Insufficient information",
      "duplicate-case": "Duplicate case",
    };

    const sessionData = sessionHelper.getSessionData(req, "decision") ?? {};
    const overallDecisionLabel =
      overallDecisionLabels[sessionData.overallDecision] ??
      sessionData.overallDecision;
    const refusalReasonLabel =
      refusalReasonLabels[sessionData.refusalReason] ??
      sessionData.refusalReason;

    res.render("application/decision/confirmation/index", {
      backUrl,
      applicationId: appId,
      proceeding,
      overallDecisionLabel,
      refusalReasonLabel,
      justification: sessionData.justification,
    });
  },
);

decisionRouter.get(
  "/:laaReference/decision/justification",
  (req: Request, res: Response) => {
    const {
      params: { laaReference },
    } = req;
    const backUrl = `/applications/${laaReference as string}/decision`;
    const sessionData =
      new SessionHelper().getSessionData(req, "decision") ?? {};
    res.render("application/decision/justification/index", {
      backUrl,
      laaReference,
      refusalReason: sessionData.refusalReason,
      justification: sessionData.justification,
    });
  },
);

decisionRouter.post(
  "/:laaReference/decision/justification",
  (req: Request, res: Response) => {
    const {
      params: { laaReference },
    } = req;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- will refactor to typed in move to adaptor pattern
    const refusalReason = req.body["refusal-reason"] as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- will refactor to typed in move to adaptor pattern
    const justification = req.body.justification as string;
    const sessionHelper = new SessionHelper();
    const existing = sessionHelper.getSessionData(req, "decision") ?? {};
    sessionHelper.storeSessionData(req, "decision", {
      ...existing,
      refusalReason,
      justification,
    });
    res.redirect(
      `/applications/${laaReference as string}/decision/confirmation`,
    );
  },
);

router.use("/applications", [
  createApplicationRouter(express.Router(), applicationDisplayAdaptor),
  createApplicationDecisionRouter(express.Router(), applicationDecisionAdaptor),
  decisionRouter,
]);

export default router;
