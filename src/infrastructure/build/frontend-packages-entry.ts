import { initAll as initGOVUK } from "govuk-frontend";
import { initAll as initMOJ } from "@ministryofjustice/frontend";

const initialiseFrontendPackages = (): void => {
  if (typeof window !== "undefined") {
    try {
      initGOVUK();
      initMOJ();

      if (process.env.NODE_ENV !== "production") {
        console.log("Frontend packages loaded and initialised");
      }
    } catch (error: unknown) {
      console.error("Frontend initialization error:", error);
    }
  }
};

initialiseFrontendPackages();
