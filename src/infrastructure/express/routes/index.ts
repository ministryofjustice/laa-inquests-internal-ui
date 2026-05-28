import express from "express";
import type { Request, Response } from "express";

import createApplicationRouter from "#src/infrastructure/express/routes/application.router.js";
import { createApplicationDecisionRouter } from "#src/infrastructure/express/routes/applicationDecision.router.js";
import { ApplicationAdaptor } from "#src/adaptors/presenter/applications/Application.adaptor.js";
import { ApplicationDecisionAdaptor } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.adaptor.js";
import { ApplicationAPIAdaptor } from "#src/adaptors/source/inquests-api/applications/ApplicationAPI/ApplicationAPI.adaptor.js";
import axios from "axios";
import { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import config from "#src/infrastructure/config/config.js";
import { ApplicationDecisionValidator } from "#src/adaptors/presenter/applications/ApplicationDecision/ApplicationDecision.validator.js";

// Create a new router
const router = express.Router();
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

const viewApplicationAdaptor = new ApplicationAPIAdaptor(
  axios,
  config.INQUESTS_API_URL,
);
const applicationDisplayAdaptor = new ApplicationAdaptor(
  viewApplicationAdaptor,
);
const applicationDecisionAdaptor = new ApplicationDecisionAdaptor(
  viewApplicationAdaptor,
  new SessionHelper(),
  new ApplicationDecisionValidator(),
);

router.use("/applications", [
  createApplicationRouter(express.Router(), applicationDisplayAdaptor),
  createApplicationDecisionRouter(express.Router(), applicationDecisionAdaptor),
]);

export default router;
