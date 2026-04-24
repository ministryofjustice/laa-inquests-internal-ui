export type LogLevel = "debug" | "info" | "warning" | "error";

export interface OpenSearchLog {
  timestamp: string;
  level: string;
  serviceName: string;
  environment: string;
  correlationId?: string | undefined;
  message: string;
  context: {
    userId?: string | undefined;
    functionName: string;
  };
}
