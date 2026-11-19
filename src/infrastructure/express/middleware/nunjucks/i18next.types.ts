import "i18next";

// Keep the i18next v26 type behaviour after the v27 upgrade
declare module "i18next" {
  interface CustomTypeOptions {
    strictInterpolationChecks: false;
    returnEmptyString: true;
  }
}
