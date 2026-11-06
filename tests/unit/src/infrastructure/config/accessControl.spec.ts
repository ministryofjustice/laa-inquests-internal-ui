import { strict as assert } from "assert";
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
  RECOGNISED_ROLES,
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

    it("should return the most specific matching policy", () => {
      const path = "/applications/INQ-ABC-123/claims/INQC-4567-8901/detail";
      const policy = findRoutePolicy(path);
      expect(policy).to.not.be.undefined;
      expect(policy?.prefix).to.equal(
        "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/.+",
      );
    });

    describe("report routes", () => {
      const {
        APPLICATION_WORKFLOW_REPORTING,
        CLAIM_WORKFLOW_REPORTING,
        ASSURANCE,
        FINANCE,
        POLICY,
      } = INTERNAL_CASEWORKER_ROLES;
      const expectedRolesByPath: Array<[string, CaseworkerRole[]]> = [
        ["/reports/payments-extract", [ASSURANCE, FINANCE]],
        ["/reports/payments-extract/download", [ASSURANCE, FINANCE]],
        [
          "/reports/claims-applications-processing",
          [APPLICATION_WORKFLOW_REPORTING, CLAIM_WORKFLOW_REPORTING],
        ],
        [
          "/reports/claims-applications-processing/download",
          [APPLICATION_WORKFLOW_REPORTING, CLAIM_WORKFLOW_REPORTING],
        ],
        ["/reports/costs-for-other-departments", [FINANCE, POLICY]],
        ["/reports/costs-for-other-departments/download", [FINANCE, POLICY]],
        ["/reports/user-audit-trail", [ASSURANCE]],
        ["/reports/user-audit-trail/download", [ASSURANCE]],
        ["/reports/cost-estimation-and-forecasting", [FINANCE, POLICY]],
        ["/reports/applications/backlog", [APPLICATION_WORKFLOW_REPORTING]],
        ["/reports/claims/backlog", [CLAIM_WORKFLOW_REPORTING]],
      ];

      for (const [path, roles] of expectedRolesByPath) {
        it(`restricts ${path} to its permitted roles`, () => {
          expect(findRoutePolicy(path)?.allowedRoles).to.have.members(roles);
        });
      }

      it("no longer has a dedicated policy for the old payment extract path", () => {
        expect(findRoutePolicy("/reports/payment-extract")?.prefix).to.equal(
          "/reports",
        );
      });
    });

    it("allows every recognised caseworker role to access help", () => {
      const policy = findRoutePolicy("/help");

      expect(policy).to.not.be.undefined;
      expect(policy?.prefix).to.equal("/help");
      expect(policy?.allowedRoles).to.have.members(RECOGNISED_ROLES);
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
    const expectOnlyRolesHavePermission = (
      permission: string,
      allowedRoles: CaseworkerRole[],
    ): void => {
      for (const role of Object.values(INTERNAL_CASEWORKER_ROLES)) {
        assert.equal(
          hasPermission([role], permission),
          allowedRoles.includes(role),
          role,
        );
      }

      assert.equal(hasPermission([], permission), false);
    };

    const expectRolesToHaveExactPermission = (
      permission: string,
      expectedRoles: CaseworkerRole[],
    ): void => {
      // Get all roles that actually have this permission
      const rolesWithPermission = Object.values(
        INTERNAL_CASEWORKER_ROLES,
      ).filter((role) => hasPermission([role], permission));

      // Compare as sets (order-agnostic) to avoid false CI failures
      // due to non-deterministic Object.values() iteration order
      expect(rolesWithPermission).to.have.members(expectedRoles);
      expect(rolesWithPermission).to.have.lengthOf(expectedRoles.length);
    };

    it("grants OGD costs report access only to finance and policy", () => {
      expectRolesToHaveExactPermission(PERMISSIONS.VIEW_OGD_COSTS_REPORT, [
        INTERNAL_CASEWORKER_ROLES.FINANCE,
        INTERNAL_CASEWORKER_ROLES.POLICY,
      ]);
    });

    it("grants decisions report access only to the workflow reporting roles", () => {
      expectRolesToHaveExactPermission(PERMISSIONS.VIEW_DECISIONS_REPORT, [
        INTERNAL_CASEWORKER_ROLES.APPLICATION_WORKFLOW_REPORTING,
        INTERNAL_CASEWORKER_ROLES.CLAIM_WORKFLOW_REPORTING,
      ]);
    });

    it("grants cost estimation report access only to finance and policy", () => {
      expectRolesToHaveExactPermission(
        PERMISSIONS.VIEW_COST_ESTIMATION_REPORT,
        [INTERNAL_CASEWORKER_ROLES.FINANCE, INTERNAL_CASEWORKER_ROLES.POLICY],
      );
    });

    it("grants audit trail report access only to assurance", () => {
      expectRolesToHaveExactPermission(PERMISSIONS.VIEW_AUDIT_TRAIL_REPORT, [
        INTERNAL_CASEWORKER_ROLES.ASSURANCE,
      ]);
    });

    it("grants reports page access to exactly the roles with at least one report permission", () => {
      expectRolesToHaveExactPermission(PERMISSIONS.VIEW_REPORTS_PAGE, [
        INTERNAL_CASEWORKER_ROLES.APPLICATION_WORKFLOW_REPORTING,
        INTERNAL_CASEWORKER_ROLES.CLAIM_WORKFLOW_REPORTING,
        INTERNAL_CASEWORKER_ROLES.ASSURANCE,
        INTERNAL_CASEWORKER_ROLES.FINANCE,
        INTERNAL_CASEWORKER_ROLES.POLICY,
      ]);
    });

    it("grants reports page access when only one of several roles has a report permission", () => {
      assert.equal(
        hasPermission(
          [
            INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
            INTERNAL_CASEWORKER_ROLES.POLICY,
          ],
          PERMISSIONS.VIEW_REPORTS_PAGE,
        ),
        true,
      );
    });

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

    it("grants the payment extract report permission only to finance", () => {
      const permission = PERMISSIONS.VIEW_PAYMENT_EXTRACT_REPORT;

      expect(hasPermission([INTERNAL_CASEWORKER_ROLES.FINANCE], permission)).to
        .be.true;
      expect(
        hasPermission(
          [INTERNAL_CASEWORKER_ROLES.CLAIM_WORKFLOW_REPORTING],
          permission,
        ),
      ).to.be.false;
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
