import { z } from "zod";

export const ProcureOrgSchema = z.object({
  orgId: z.string().uuid(),
  companyName: z.string(),
  stripeCustomerId: z.string(),
  tier: z.enum(["FREE", "ENTERPRISE_BULK"]),
  apiToken: z.string(),
  seatsAllocated: z.number().default(5)
});

export const ProcureAgentSchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  email: z.string().email(),
  permissions: z.enum(["ADMIN", "BUYER", "AUDITOR"])
});

export type ProcureOrg = z.infer<typeof ProcureOrgSchema>;
export type ProcureAgent = z.infer<typeof ProcureAgentSchema>;