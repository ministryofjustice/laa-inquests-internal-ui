import type { CaseworkerRole } from "#src/infrastructure/config/accessControl.js";

export interface AuthTokenResult {
  userId: string;
  userName?: string;
  accessToken?: string;
  accessTokenExpiresOn?: Date;
  roles: CaseworkerRole[];
}
