import express from "express";
import type { Request, Response } from "express";

import createApplicationRouter from "#src/infrastructure/express/routes/application.router.js";
import { ApplicationAdaptor } from "#src/adaptors/Application.adaptor.js";
import { ViewApplicationAdaptor } from "#src/adaptors/source/inquests-api/applications/ViewApplication/ViewApplication.adaptor.js";
import axios from "axios";
import { logger } from "../middleware/logger/logger.js";

// Create a new router
const router = express.Router();
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

router.use("/applications", [
  createApplicationRouter(express.Router(), applicationDisplayAdaptor),
]);

export default router;
