export const FILTERED = "[Filtered]";

// Case (LAA) references and claim references may be sent to Sentry. The shapes
// match the search validator and the API's claim reference generator.
export const REFERENCE_PATTERNS = {
  laa_reference: /^INQ-[A-Za-z0-9]{3}-[A-Za-z0-9]{3}$/v,
  claim_reference: /^INQC-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/v,
} as const;

// Literal words of our own routes and of the Inquests API paths, plus the route
// template placeholders. Any other path segment is replaced, so a new route
// fails closed until its words are added here.
export const KNOWN_SEGMENTS: ReadonlySet<string> = new Set([
  ":laaReference",
  ":claimReference",
  ":claimEvidenceId",
  "all-applications",
  "application",
  "applications",
  "auth",
  "backlog",
  "callback",
  "certificate",
  "certificate-start-date",
  "check-your-answers",
  "claims",
  "confirm",
  "confirm-disbursement-costs",
  "confirm-profit-costs",
  "confirmation",
  "coroners-letter",
  "decision",
  "dev",
  "error",
  "evidence",
  "grant-decision",
  "health",
  "history",
  "justification",
  "login",
  "logout",
  "note",
  "overview",
  "paid-in-full",
  "pay-in-full",
  "payment-extract",
  "public-authorities",
  "public-bodies",
  "reject",
  "rejected",
  "reports",
  "refuse-decision",
  "search",
  "status",
  "success",
  "test-login",
  "user-roles",
]);

const isReference = (segment: string): boolean =>
  Object.values(REFERENCE_PATTERNS).some((pattern) => pattern.test(segment));

const pathOnly = (path: string): string => path.split(/[?#]/v)[0] ?? "";

// "/applications/INQ-ABC-123/overview" is kept as is, while
// "/applications/jane-smith/overview" becomes "/applications/[Filtered]/overview".
export const sanitizePath = (path: string): string =>
  pathOnly(path)
    .split("/")
    .map((segment) =>
      segment === "" || KNOWN_SEGMENTS.has(segment) || isReference(segment)
        ? segment
        : FILTERED,
    )
    .join("/");

// Reference tags make errors searchable by case or claim without putting a
// reference in the transaction name, which would create one group per case.
export const referenceTags = (path: string): Record<string, string> => {
  const tags: Record<string, string> = {};
  for (const segment of pathOnly(path).split("/")) {
    for (const [name, pattern] of Object.entries(REFERENCE_PATTERNS)) {
      if (pattern.test(segment)) {
        tags[name] = segment;
      }
    }
  }
  return tags;
};

// Defence in depth for exception messages that no type specific rule covers
// (Node and Redis connection errors, future messages with interpolated values).
// It cannot detect names or file names.
const REDACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+/gv, "[Email]"],
  [/\bBearer\s+[\w.~+\/\-]+=*/giv, "Bearer [Token]"],
  [/\bBasic\s+[A-Za-z0-9+\/]+=*/gv, "Basic [Token]"],
  [/\beyJ[\w\-]+\.[\w\-]+\.[\w\-]*/gv, "[Token]"],
  [
    /\b(client_secret|password|access_token|refresh_token|id_token)\s*[=:]\s*[^&\s]+/giv,
    "$1=[Redacted]",
  ],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/gv, "[IP]"],
  [/\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/gv, "[IP]"],
  [
    /(?<![\w:])(?:[A-Fa-f0-9]{1,4}:){1,7}:(?:[A-Fa-f0-9]{1,4}(?::[A-Fa-f0-9]{1,4}){0,6})?(?![\w:])/gv,
    "[IP]",
  ],
  [
    /(?<![\w:])::(?:[A-Fa-f0-9]{1,4}(?::[A-Fa-f0-9]{1,4}){0,6})(?![\w:])/gv,
    "[IP]",
  ],
];

export const redactText = (text: string): string =>
  REDACTIONS.reduce(
    (redacted, [pattern, replacement]) =>
      redacted.replace(pattern, replacement),
    text,
  );
