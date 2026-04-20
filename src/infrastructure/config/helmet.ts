import type { IncomingMessage, ServerResponse } from "node:http";

export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Dynamic nonce function for CSP - using the correct helmet function signature
        (_: IncomingMessage, res: ServerResponse) => {
          // Type guard to check if res has locals property (Express response)
          if (
            "locals" in res &&
            typeof res.locals === "object" &&
            res.locals !== null
          ) {
            const cspNonce =
              "cspNonce" in res.locals ? res.locals.cspNonce : undefined;
            return typeof cspNonce === "string"
              ? `'nonce-${cspNonce}'`
              : "'unsafe-inline'";
          }
          return "'unsafe-inline'";
        },
      ],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles if needed
      fontSrc: ["'self'", "data:"], // Allow data: URIs for fonts
      imgSrc: ["'self'", "data:"], // Allow data: URIs for images
      connectSrc: ["'self'"],
      objectSrc: ["'none'"], // Restrict <object>, <embed>, and <applet> elements
      mediaSrc: ["'self'"], // Restrict media
      frameSrc: ["'none'"], // Restrict frames
      formAction: ["'self'"], // Restrict form submissions
      baseUri: ["'self'"], // Restrict base URI
      upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS
    },
  },
};
