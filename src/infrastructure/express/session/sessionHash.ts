import { createHmac } from "node:crypto";
import config from "#src/infrastructure/config/config.js";

export const hashSessionId = (sessionId: string): string =>
  createHmac("sha256", config.SESSION_LOG_SECRET)
    .update(sessionId)
    .digest("hex");
