/**
 * Error Handler Utility
 *
 * Provides comprehensive error handling for API requests including:
 * - HTTP status code mapping to user-friendly messages
 * - Network error handling
 * - Response message extraction
 * - Structured logging
 */

<<<<<<< HEAD:src/infrastructure/express/middleware/errors.ts
import { devError } from '#src/infrastructure/express/middleware/logger.js';
=======
import { devError } from "./index.js";
>>>>>>> main:src/scripts/helpers/errorHandler.ts

// HTTP Status Code Constants
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_REQUEST_TIMEOUT = 408;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_GATEWAY_TIMEOUT = 504;

function isAxiosError(error: unknown): error is {
  response: { status: number; data?: unknown; statusText?: string };
} {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "response" in error &&
    error.response !== null &&
    typeof error.response === "object" &&
    "status" in error.response &&
    typeof (error.response as { status: unknown }).status === "number"
  );
}

function isNetworkError(
  error: unknown,
): error is { code: string; message?: string } {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

function getHttpErrorMessage(status: number): string {
  switch (status) {
    case HTTP_BAD_REQUEST:
      return "Invalid request. Please check your input and try again.";
    case HTTP_UNAUTHORIZED:
      return "Authentication failed. Please log in again.";
    case HTTP_FORBIDDEN:
      return "You do not have permission to access this resource.";
    case HTTP_NOT_FOUND:
      return "The requested information could not be found.";
    case HTTP_REQUEST_TIMEOUT:
      return "Request timed out. Please try again.";
    case HTTP_TOO_MANY_REQUESTS:
      return "Too many requests. Please wait a moment and try again.";
    case HTTP_INTERNAL_SERVER_ERROR:
      return "Internal server error. Please try again later.";
    case HTTP_BAD_GATEWAY:
      return "Service temporarily unavailable. Please try again later.";
    case HTTP_SERVICE_UNAVAILABLE:
      return "Service unavailable. Please try again later.";
    case HTTP_GATEWAY_TIMEOUT:
      return "Request timed out. Please try again later.";
    default:
      return `Service error (${status}). Please try again later.`;
  }
}

function getNetworkErrorMessage(code: string): string {
  switch (code) {
    case "ECONNREFUSED":
      return "Unable to connect to the service. Please try again later.";
    case "ENOTFOUND":
      return "Service not found. Please check your connection and try again.";
    case "ETIMEDOUT":
      return "Request timed out. Please try again.";
    case "ECONNRESET":
      return "Connection was reset. Please try again.";
    default:
      return "Network error. Please check your connection and try again.";
  }
}

// Extract error message from response data
function extractResponseMessage(data: unknown): string | null {
  if (
    data !== null &&
    data !== undefined &&
    typeof data === "object" &&
    "message" in data
  ) {
    const responseData = data as { message: unknown };
    return typeof responseData.message === "string"
      ? responseData.message
      : null;
  }
  return null;
}

// Extract error message from various error types
export function extractErrorMessage(error: unknown): string {
  // Handle Axios errors with response
  if (isAxiosError(error)) {
    const { response } = error;
    devError(
      `API HTTP Error ${response.status}: ${response.statusText ?? "Unknown"}`,
    );

    // Try to extract error message from response data
    const responseMessage = extractResponseMessage(response.data);
    if (responseMessage !== null) {
      return responseMessage;
    }

    return getHttpErrorMessage(response.status);
  }

  // Handle network errors
  if (isNetworkError(error)) {
    devError(`Network Error: ${error.code}`);
    return getNetworkErrorMessage(error.code);
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    devError(`Error: ${error.message}`);
    return "An unexpected error occurred. Please try again.";
  }

  // Handle string errors
  if (typeof error === "string") {
    devError(`String Error: ${error}`);
    return "An error occurred. Please try again.";
  }

  // Fallback for unknown error types
  devError(`Unknown Error: ${String(error)}`);
  return "An unexpected error occurred. Please try again.";
}

export function isHttpError(error: unknown, status: number): boolean {
  return isAxiosError(error) && error.response.status === status;
}

export function isAuthError(error: unknown): boolean {
  return isHttpError(error, HTTP_UNAUTHORIZED);
}

export function isForbiddenError(error: unknown): boolean {
  return isHttpError(error, HTTP_FORBIDDEN);
}

export function isNotFoundError(error: unknown): boolean {
  return isHttpError(error, HTTP_NOT_FOUND);
}

export function isServerError(error: unknown): boolean {
  return (
    isAxiosError(error) && error.response.status >= HTTP_INTERNAL_SERVER_ERROR
  );
}

// Create a processed error with user-friendly message for global error handler
export function createProcessedError(
  originalError: unknown,
  context: string,
): Error {
  // Extract user-friendly message
  const userFriendlyMessage = extractErrorMessage(originalError);

  // Log the error with context
  devError(`Error ${context}: ${userFriendlyMessage}`);

  // Create processed error with user-friendly message
  const processedError = new Error(userFriendlyMessage);
  processedError.cause = originalError; // Preserve original error for debugging

  return processedError;
}

// Extract error message and log it with context (for API services)
export function extractAndLogError(error: unknown, context: string): string {
  const userFriendlyMessage = extractErrorMessage(error);
  devError(`${context}: ${userFriendlyMessage}`);
  return userFriendlyMessage;
}
