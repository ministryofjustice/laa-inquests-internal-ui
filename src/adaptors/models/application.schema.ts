import { z } from "zod";

export const ApplicationSchema = z.object({
    id: z.nullable(z.string()),
    status: z.nullable(z.string()),
    provider: z.nullable(z.string()),
    date_submitted: z.nullable(z.string())
})