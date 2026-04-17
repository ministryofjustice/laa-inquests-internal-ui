import type { z } from "zod";
import type { ApplicationSchema } from "./application.schema.js";

export type Application = z.infer<typeof ApplicationSchema>;
