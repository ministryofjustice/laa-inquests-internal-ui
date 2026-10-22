import type { CaseworkerRole } from "#src/infrastructure/config/accessControl.js";

declare module "express-session" {
  interface UserSessionData extends Record<string, string | undefined> {
    userId: string;
    userName?: string | undefined;
    accessToken?: string;
  }

  // Epoch milliseconds, except idleTimeoutMs which is a duration.
  interface SessionLifetime {
    absoluteExpiresAt: number;
    credentialExpiresAt: number;
    lastActivityAt: number;
    idleTimeoutMs: number;
  }

  // Extended types for session data, allowing for user session data and logger dynamic namespace
  interface SessionData extends Record<
    string,
    | UserSessionData
    | SessionLifetime
    | Record<string, string>
    | string
    | CaseworkerRole[]
    | undefined
  > {
    user: UserSessionData;
    roles?: CaseworkerRole[];
    lifetime?: SessionLifetime;
    returnTo?: string;
  }
}
