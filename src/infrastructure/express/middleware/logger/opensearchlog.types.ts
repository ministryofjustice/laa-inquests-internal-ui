export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface OpenSearchLog {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  request_id: string;
  correlation_id: string;
  function_name: string;
  message: string;
  [key: string]: unknown;
}
