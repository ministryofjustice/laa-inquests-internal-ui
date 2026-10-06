import { initAll as initGOVUK } from "govuk-frontend";
import { initAll as initMOJ } from "@ministryofjustice/frontend";
import { initialiseApplicationOverviewNoteErrors } from "#src/infrastructure/build/applicationOverviewNoteErrors.js";

const initialiseFrontendPackages = (): void => {
  if (typeof window !== "undefined") {
    try {
      initGOVUK();
      initMOJ();
      initialiseApplicationOverviewNoteErrors(document, window);

      if (process.env.NODE_ENV !== "production") {
        console.log("Frontend packages loaded and initialised");
      }
    } catch (error: unknown) {
      console.error("Frontend initialization error:", error);
    }
  }
};

initialiseFrontendPackages();
