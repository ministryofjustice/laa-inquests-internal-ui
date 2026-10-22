import { initSentry } from "#src/infrastructure/config/sentry.js";

// Loaded with `node --import` so Sentry is initialised before the app modules.
initSentry();
