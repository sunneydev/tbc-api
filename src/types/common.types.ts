import type { Credentials } from "./tbc.types";

export interface Session {
  trustedRegistrationId: string;
  browserFingerprint: number;
  credentials: Credentials;
  headers: Record<string, string>;
  cookies: Record<string, string>;
}
