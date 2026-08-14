export interface TypedRequestBody<T> extends Express.Request {
  body: T;
}

export interface TypedRequest<T, V> extends Express.Request {
  body: T;
  params: V;
}

export interface IdParams {
  applicationId: string;
}

export interface ClaimIdParams extends IdParams {
  claimId: string;
}
