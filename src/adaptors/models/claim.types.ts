import type { z } from "zod";
import type { ClaimSchema } from "./claim.schema.js";

export type Claim = z.infer<typeof ClaimSchema>;
