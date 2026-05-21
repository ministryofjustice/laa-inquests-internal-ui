import type { Request } from "express";
import type { TypedRequest } from "../api.types.js";

export class SessionHelper {
  storeSessionData(
    req: Request | TypedRequest<unknown, unknown>,
    namespace: string,
    data: Record<string, string>,
  ): void {
    const existing = this.getSessionData(req as Request, namespace) ?? {};
    req.session[namespace] = { ...existing, ...data };
  }

  getSessionData(
    req: Request,
    namespace: string,
  ): Record<string, string> | null {
    const { session } = req;
    const { [namespace]: data } = session;
    // Return the data if it's a Record, otherwise null for undefined or string
    return typeof data === "object" ? data : null;
  }

  clearSessionData(req: Request, namespace: string): void {
    req.session[namespace] = undefined;
  }

  /**
   * Clear all session data for form original values
   * Removes any session keys that contain 'Original' in the name
   */
  clearAllOriginalFormData(req: Request): void {
    const sessionKeys = Object.keys(req.session);
    const originalDataKeys = sessionKeys.filter((key) =>
      key.includes("Original"),
    );
    originalDataKeys.forEach((key) => {
      req.session[key] = undefined;
    });
  }

  storeOriginalFormData(
    req: Request,
    namespace: string,
    formData: Record<string, unknown>,
  ): void {
    const stringifiedData: Record<string, string> = {};

    for (const [key, value] of Object.entries(formData)) {
      stringifiedData[key] = value?.toString() ?? "";
    }

    this.storeSessionData(req, namespace, stringifiedData);
  }
}
