import { z } from "zod";

export interface ISession extends z.infer<typeof Session> {}

export const Session = z.object({
  trustedRegistrationId: z.string(),
  browserFingerprint: z.number(),
  credentials: z.object({
    username: z.string(),
    password: z.string(),
  }),
  headers: z.record(z.string()),
  cookies: z.record(z.string()),
});
