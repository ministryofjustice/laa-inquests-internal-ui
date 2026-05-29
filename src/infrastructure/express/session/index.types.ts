declare module "express-session" {
  interface SessionData extends Record<
    string,
    Record<string, string> | string | undefined
  > {
    userId?: string;
  }
}
