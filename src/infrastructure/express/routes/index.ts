import express from "express";
import type { Request, Response } from "express";

import createApplicationRouter from "#src/infrastructure/express/routes/application.router.js";
import { ApplicationAdaptor } from "#src/adaptors/Application.adaptor.js";
import { ViewApplicationAdaptor } from "#src/adaptors/source/inquests-api/applications/ViewApplication/ViewApplication.adaptor.js";
import axios from "axios";
import { logger } from "../middleware/logger/logger.js";

// Create a new router
const router = express.Router();
const decisionRouter = express.Router();
const SUCCESSFUL_REQUEST = 200;
const UNSUCCESSFUL_REQUEST = 500;

/* GET home page. */
router.get("/", (req: Request, res: Response): void => {
  res.render("main/index");
});

router.get(
  "/application/:applicationId",
  (req: Request, res: Response): void => {
    const {
      params: { applicationId },
    } = req;
    logger.logInfo(
      "GET Application by ID",
      `Application with ID: ${applicationId as string} has been accessed.`,
      req,
    );
    res.render("application/index");
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

const viewApplicationAdaptor = new ViewApplicationAdaptor(
  axios,
  "https://laa-inquests-api-uat.apps.live.cloud-platform.service.justice.gov.uk",
);
const applicationDisplayAdaptor = new ApplicationAdaptor(
  viewApplicationAdaptor,
);

interface Proceeding {
  proceedingDescription: string;
  certificateType: string;
  meritsDecision: string;
}

interface ApplicationResponse {
  proceedings: Proceeding[];
}

decisionRouter.get(
  "/:applicationId/decision",
  async (req: Request, res: Response) => {
    const {
      params: { applicationId },
    } = req;
    const appId = applicationId as string;
    const backUrl = `/applications/${appId}/history`;

    const data = await axios.get<ApplicationResponse>(
      `https://laa-inquests-api-uat.apps.live.cloud-platform.service.justice.gov.uk/applications/${appId}`,
    );

    const toTitleCase = (str: string): string =>
      str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    const proceedings = data.data.proceedings.map((p) => ({
      proceedingDescription: p.proceedingDescription,
      certificateType: toTitleCase(p.certificateType),
      meritsAssessment: toTitleCase(p.meritsDecision),
    }));

    res.render("application/decision/index", {
      backUrl,
      applicationId: appId,
      proceedings,
    });
  },
);

decisionRouter.post(
  "/:applicationId/decision",
  (req: Request, res: Response) => {
    const {
      params: { applicationId },
    } = req;
    res.redirect(
      `/applications/${applicationId as string}/decision/justification`,
    );
  },
);

router.use("/applications", [
  createApplicationRouter(express.Router(), applicationDisplayAdaptor),
  decisionRouter,
]);

export default router;
