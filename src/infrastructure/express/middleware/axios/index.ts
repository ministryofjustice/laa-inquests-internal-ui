import { create } from "middleware-axios";
import type { Request, Response, NextFunction } from "express";
import type { InternalAxiosRequestConfig } from "axios";

import {
  isAxiosErrorWithResponse,
  toError,
} from "#src/infrastructure/express/middleware/axios/errors.js";
import { logger } from "#src/infrastructure/express/middleware/logger/logger.js";

const DEFAULT_TIMEOUT = 5000;
const HTTP_UNAUTHORIZED = 401;

// Configuration interface for API middleware
export interface ApiMiddlewareConfig {
  /** Default timeout for requests */
  timeout?: number;
  /** Default headers to include with all requests */
  defaultHeaders?: Record<string, string>;
  /** Whether to enable request/response logging */
  enableLogging?: boolean;
  /** Optional auth service for JWT handling */
  authService?: AuthServiceInterface | null;
}

// Auth service interface - compatible with MCC's auth service
export interface AuthServiceInterface {
  getAuthHeader: () => Promise<string>;
  clearTokens: () => void;
}

export function setupAxiosMiddleware(config: ApiMiddlewareConfig = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    defaultHeaders = {},
    enableLogging = true,
    authService = null,
  } = config;

  return (req: Request, _: Response, next: NextFunction): void => {
    // Create axios instance with default config (based on MCC pattern)
    const axiosWrapper = create({
      timeout,
      headers: {
        "Content-Type": "application/json",
        ...defaultHeaders,
      },
    });

    // Add request logging interceptor if enabled
    if (enableLogging) {
      axiosWrapper.axiosInstance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
          logger.logInfo(
            "AxiosMiddleware",
            `API Request: ${config.method?.toUpperCase()} ${config.baseURL ?? ""}${config.url ?? ""}`,
            req,
          );

          return config;
        },
        async (error: unknown) => {
          logger.logError(
            "AxiosMiddleware",
            `API Request Error: ${toError(error).message}`,
            req,
          );
          return await Promise.reject(toError(error));
        },
      );

      // Add response logging interceptor
      axiosWrapper.axiosInstance.interceptors.response.use(
        (response) => {
          logger.logInfo(
            "AxiosMiddleware",
            `API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
            req,
          );
          return response;
        },
        async (error: unknown) => {
          if (isAxiosErrorWithResponse(error)) {
            logger.logError(
              "AxiosMiddleware",
              `API Response Error: ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
              req,
            );
          } else {
            logger.logError(
              "AxiosMiddleware",
              `API Network Error: ${toError(error).message}`,
              req,
            );
          }
          return await Promise.reject(toError(error));
        },
      );
    }

    // Add JWT authentication interceptor if auth service provided (based on MCC pattern)
    if (authService !== null) {
      // Request interceptor for JWT auth
      axiosWrapper.axiosInstance.interceptors.request.use(
        async (config: InternalAxiosRequestConfig) => {
          try {
            config.headers.Authorization = await authService.getAuthHeader();
            if (enableLogging) {
              logger.logInfo(
                "AuthService",
                "Added JWT authorization header to API request",
                req,
              );
            }
          } catch (error) {
            logger.logError(
              "AuthService",
              `Failed to add JWT authorization header: ${toError(error).message}`,
              req,
            );
            // Continue without auth header - API will handle 401 response
          }
          return config;
        },
        async (error: unknown) => await Promise.reject(toError(error)),
      );

      // Response interceptor for 401 error handling (based on MCC pattern)
      axiosWrapper.axiosInstance.interceptors.response.use(
        (response) => response,
        async (error: unknown) => {
          if (
            isAxiosErrorWithResponse(error) &&
            error.response.status === HTTP_UNAUTHORIZED
          ) {
            if (enableLogging) {
              logger.logError(
                "AuthService",
                "API returned 401 Unauthorized - clearing cached tokens",
                req,
              );
            }
            authService.clearTokens();
          }
          return await Promise.reject(toError(error));
        },
      );
    }

    req.axiosMiddleware = axiosWrapper;
    next();
  };
}
