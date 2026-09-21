import { expect } from "chai";
import {
  INTERNAL_CASEWORKER_ROLES,
  type CaseworkerRole,
  isRecognisedRole,
  normaliseRoles,
  matchesPrefix,
  isPublicPath,
  findRoutePolicy,
  hasAllowedRole,
  hasPermission,
  isPermission,
  PERMISSIONS,
  validateRolesNotEmpty,
} from "#src/infrastructure/config/accessControl.js";

describe("Access Control Configuration", () => {
  describe("isRecognisedRole", () => {
    it("should return true for recognised role strings", () => {
      expect(
        isRecognisedRole(INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER),
      ).to.be.true;
      expect(isRecognisedRole(INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER)).to
        .be.true;
    });

    it("should return false for unrecognised role strings", () => {
      expect(isRecognisedRole("unknown-role")).to.be.false;
    });

    it("should return false for non-string values", () => {
      expect(isRecognisedRole(123)).to.be.false;
      expect(isRecognisedRole(null)).to.be.false;
      expect(isRecognisedRole(undefined)).to.be.false;
      expect(isRecognisedRole([])).to.be.false;
    });
  });

  describe("normaliseRoles", () => {
    it("should return recognised roles from array", () => {
      const input = [
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
        INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
      ];

      const result = normaliseRoles(input);

      expect(result).to.have.lengthOf(2);
      expect(result).to.include(
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
      );
      expect(result).to.include(INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER);
    });

    it("should handle comma-separated string", () => {
      const input = [
        `${INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER},${INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER}`,
      ];

      const result = normaliseRoles(input);

      expect(result).to.have.lengthOf(2);
    });

    it("should deduplicate roles", () => {
      const input = [
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
        INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
      ];

      const result = normaliseRoles(input);

      expect(result).to.have.lengthOf(2);
    });

    it("should return empty array for empty input", () => {
      expect(normaliseRoles([])).to.be.an("array").that.is.empty;
    });

    it("should throw error when unknown role is encountered", () => {
      const input = ["unknown-role"];

      expect(() => normaliseRoles(input)).to.throw(
        /Unknown role in token claims/,
      );
    });

    it("should throw error when mixed known and unknown roles are present", () => {
      const input = [
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
        "unknown-role",
      ];

      expect(() => normaliseRoles(input)).to.throw(
        /Unknown role in token claims/,
      );
    });

    it("should trim whitespace from roles", () => {
      const input = [
        `  ${INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER}  `,
      ];

      const result = normaliseRoles(input);

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.equal(
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
      );
    });
  });

  describe("matchesPrefix", () => {
    it("should match exact root path", () => {
      expect(matchesPrefix("/", "/")).to.be.true;
    });

    it("should not match root with non-root path", () => {
      expect(matchesPrefix("/apply", "/")).to.be.false;
    });

    it("should match exact prefix", () => {
      expect(matchesPrefix("/apply", "/apply")).to.be.true;
    });

    it("should match prefix with trailing slash", () => {
      expect(matchesPrefix("/apply/form", "/apply")).to.be.true;
    });

    it("should not match similar but different prefix", () => {
      expect(matchesPrefix("/application", "/apply")).to.be.false;
    });

    it("should handle multi-segment paths", () => {
      expect(matchesPrefix("/apply/step1/detail", "/apply")).to.be.true;
      expect(matchesPrefix("/apply/step1/detail", "/apply/step1")).to.be.true;
    });
  });

  describe("isPublicPath", () => {
    it("should allow /health", () => {
      expect(isPublicPath("/health")).to.be.true;
    });

    it("should allow /status", () => {
      expect(isPublicPath("/status")).to.be.true;
    });

    it("should allow /error", () => {
      expect(isPublicPath("/error")).to.be.true;
    });

    it("should allow /auth and sub-paths", () => {
      expect(isPublicPath("/auth/login")).to.be.true;
      expect(isPublicPath("/auth/callback")).to.be.true;
    });

    it("should not allow other paths", () => {
      expect(isPublicPath("/dashboard")).to.be.false;
      expect(isPublicPath("/apply")).to.be.false;
    });
  });

  describe("findRoutePolicy", () => {
    it("should return undefined when no policy matches", () => {
      expect(findRoutePolicy("/dashboard")).to.be.undefined;
    });
  });

  describe("hasAllowedRole", () => {
    it("should return true when user has one of allowed roles", () => {
      const userRoles: CaseworkerRole[] = [
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
        INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
      ];
      const policy = {
        prefix: "/apply",
        allowedRoles: [INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER],
      };

      expect(hasAllowedRole(userRoles, policy)).to.be.true;
    });

    it("should return false when user has no allowed roles", () => {
      const userRoles: CaseworkerRole[] = [
        INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
      ];
      const policy = {
        prefix: "/apply",
        allowedRoles: [INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER],
      };

      expect(hasAllowedRole(userRoles, policy)).to.be.false;
    });

    it("should return false for empty user roles", () => {
      const userRoles: CaseworkerRole[] = [];
      const policy = {
        prefix: "/apply",
        allowedRoles: [INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER],
      };

      expect(hasAllowedRole(userRoles, policy)).to.be.false;
    });
  });

  describe("isPermission", () => {
    it("should return true for recognised permission strings", () => {
      expect(isPermission(PERMISSIONS.VIEW_CLAIMS_TAB)).to.be.true;
    });

    it("should return false for unrecognised permission strings", () => {
      expect(isPermission("viewSomethingElse")).to.be.false;
    });

    it("should return false for non-string values", () => {
      expect(isPermission(123)).to.be.false;
      expect(isPermission(null)).to.be.false;
      expect(isPermission(undefined)).to.be.false;
    });
  });

  describe("hasPermission", () => {
    it("should return true when the user has a role granted the permission", () => {
      const userRoles: CaseworkerRole[] = [
        INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
      ];

      expect(hasPermission(userRoles, PERMISSIONS.VIEW_CLAIMS_TAB)).to.be.true;
    });

    it("should return false when no user role is granted the permission", () => {
      const userRoles: CaseworkerRole[] = [INTERNAL_CASEWORKER_ROLES.FINANCE];

      expect(hasPermission(userRoles, PERMISSIONS.VIEW_CLAIMS_TAB)).to.be.false;
    });

    it("should return false for empty user roles", () => {
      expect(hasPermission([], PERMISSIONS.VIEW_CLAIMS_TAB)).to.be.false;
    });

    it("should return false for an unrecognised permission", () => {
      const userRoles: CaseworkerRole[] = [
        INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
      ];

      expect(hasPermission(userRoles, "viewSomethingElse")).to.be.false;
    });
  });

  describe("validateRolesNotEmpty", () => {
    it("should not throw when user has roles", () => {
      const roles: CaseworkerRole[] = [
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
      ];

      expect(() => validateRolesNotEmpty(roles)).to.not.throw();
    });

    it("should not throw when user has multiple roles", () => {
      const roles: CaseworkerRole[] = [
        INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
        INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
      ];

      expect(() => validateRolesNotEmpty(roles)).to.not.throw();
    });

    it("should throw error when user has no roles", () => {
      const roles: CaseworkerRole[] = [];

      expect(() => validateRolesNotEmpty(roles)).to.throw(
        /User has no caseworker roles assigned/,
      );
    });

    it("should throw specific error message", () => {
      const roles: CaseworkerRole[] = [];

      expect(() => validateRolesNotEmpty(roles)).to.throw(
        "User has no caseworker roles assigned. Authentication denied.",
      );
    });
  });
});
