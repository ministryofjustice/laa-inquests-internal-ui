import express from "express";
import type { Request, Response } from "express";

import createApplicationRouter from "#src/infrastructure/express/routes/application.router.js";
import { ApplicationDisplayAdaptor } from "#src/adaptors/application.adaptor.js";
import { ApplicationDataStoreAdaptor } from "#src/adaptors/dataStoreApplication.adaptor.js";
import axios from "axios";

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

const applicationDataStoreAdaptor = new ApplicationDataStoreAdaptor(
  axios,
  "https://laa-inquests-api-uat.apps.live.cloud-platform.service.justice.gov.uk",
);
const applicationDisplayAdaptor = new ApplicationDisplayAdaptor(
  applicationDataStoreAdaptor,
);

router.use("/applications", [
  createApplicationRouter(express.Router(), applicationDisplayAdaptor),
]);

export default router;
