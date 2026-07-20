export const OUTBOUND_ADAPTER_FAILURE_REASONS = {
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  UPSTREAM_REJECTED: "UPSTREAM_REJECTED",
} as const;

export type OutboundAdapterFailureReason =
  (typeof OUTBOUND_ADAPTER_FAILURE_REASONS)[keyof typeof OUTBOUND_ADAPTER_FAILURE_REASONS];

export type OutboundAdapterResult<Data = undefined> =
  | {
      status: "SUCCESS";
      data: Data;
    }
  | {
      status: "FAILURE";
      reason: OutboundAdapterFailureReason;
      message?: string;
      cause?: unknown;
    };
