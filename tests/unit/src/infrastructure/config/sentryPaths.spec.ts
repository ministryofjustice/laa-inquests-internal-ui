import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import {
  KNOWN_SEGMENTS,
  redactText,
  referenceTags,
  sanitizePath,
} from "#src/infrastructure/config/sentryPaths.js";

describe("sanitizePath", () => {
  it("keeps a path made of route words and a case reference", () => {
    expect(sanitizePath("/applications/INQ-ABC-123/overview")).to.equal(
      "/applications/INQ-ABC-123/overview",
    );
  });

  it("keeps a claim reference", () => {
    expect(
      sanitizePath("/applications/INQ-ABC-123/claims/INQC-AB12-CD34/rejected"),
    ).to.equal("/applications/INQ-ABC-123/claims/INQC-AB12-CD34/rejected");
  });

  it("keeps route templates", () => {
    expect(
      sanitizePath(
        "/:laaReference/claims/:claimReference/evidence/:claimEvidenceId",
      ),
    ).to.equal(
      "/:laaReference/claims/:claimReference/evidence/:claimEvidenceId",
    );
  });

  it("keeps lower case references as the search validator accepts them", () => {
    expect(sanitizePath("/applications/INQ-abc-123/overview")).to.equal(
      "/applications/INQ-abc-123/overview",
    );
  });

  it("keeps the root path", () => {
    expect(sanitizePath("/")).to.equal("/");
  });

  it("replaces an evidence id", () => {
    expect(
      sanitizePath(
        "/applications/INQ-ABC-123/claims/INQC-AB12-CD34/evidence/3f2b8c1e-9a4d-4e7f-8b21-0c5d6e7f8a9b",
      ),
    ).to.equal(
      "/applications/INQ-ABC-123/claims/INQC-AB12-CD34/evidence/[Filtered]",
    );
  });

  it("replaces unknown segments such as names and file names", () => {
    expect(
      sanitizePath("/applications/jane-smith/report-jane-smith.pdf"),
    ).to.equal("/applications/[Filtered]/[Filtered]");
  });

  it("replaces a reference with extra text attached", () => {
    expect(sanitizePath("/applications/INQ-ABC-123-jane/overview")).to.equal(
      "/applications/[Filtered]/overview",
    );
  });

  it("replaces percent encoded segments", () => {
    expect(sanitizePath("/applications/jane%40example.com/overview")).to.equal(
      "/applications/[Filtered]/overview",
    );
  });

  it("does not treat an arbitrary colon word as a route template", () => {
    expect(sanitizePath("/applications/:jane/overview")).to.equal(
      "/applications/[Filtered]/overview",
    );
  });

  it("drops a query string and a fragment", () => {
    expect(
      sanitizePath("/applications/INQ-ABC-123/overview?code=abc#section"),
    ).to.equal("/applications/INQ-ABC-123/overview");
  });
});

describe("referenceTags", () => {
  it("returns the case and claim references found in a path", () => {
    expect(
      referenceTags("/applications/INQ-ABC-123/claims/INQC-AB12-CD34/rejected"),
    ).to.deep.equal({
      laa_reference: "INQ-ABC-123",
      claim_reference: "INQC-AB12-CD34",
    });
  });

  it("returns only the case reference when there is no claim", () => {
    expect(referenceTags("/applications/INQ-ABC-123/overview")).to.deep.equal({
      laa_reference: "INQ-ABC-123",
    });
  });

  it("ignores segments that are not references", () => {
    expect(referenceTags("/applications/jane-smith/overview")).to.deep.equal(
      {},
    );
  });

  it("ignores the query string", () => {
    expect(
      referenceTags("/applications/search?reference=INQ-ABC-123"),
    ).to.deep.equal({});
  });
});

describe("redactText", () => {
  it("redacts email addresses", () => {
    expect(redactText("failed for jane.smith+test@example.co.uk now")).to.equal(
      "failed for [Email] now",
    );
  });

  it("redacts bearer tokens", () => {
    expect(redactText("Authorization: Bearer abc.def-123_xyz==")).to.equal(
      "Authorization: Bearer [Token]",
    );
  });

  it("redacts basic authorization credentials", () => {
    expect(redactText("Authorization: Basic dXNlcjpwYXNz")).to.equal(
      "Authorization: Basic [Token]",
    );
  });

  it("redacts json web tokens", () => {
    expect(
      redactText("token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl end"),
    ).to.equal("token [Token] end");
  });

  it("redacts IPv4 addresses and keeps the port", () => {
    expect(redactText("connect ECONNREFUSED 10.1.2.3:6379")).to.equal(
      "connect ECONNREFUSED [IP]:6379",
    );
  });

  it("redacts full and compressed IPv6 addresses", () => {
    expect(
      redactText(
        "from 2001:0db8:85a3:0000:0000:8a2e:0370:7334 and ::1 and fe80::1",
      ),
    ).to.equal("from [IP] and [IP] and [IP]");
  });

  it("redacts secrets passed as key value pairs", () => {
    expect(
      redactText("client_secret=s3cr3t&password: hunter2 refresh_token=abc"),
    ).to.equal(
      "client_secret=[Redacted]&password=[Redacted] refresh_token=[Redacted]",
    );
  });

  it("keeps references, times, versions and plain messages", () => {
    const message =
      "INQ-ABC-123 and INQC-AB12-CD34 at 10:15:30 on v1.2.3 failed with status code 500";

    expect(redactText(message)).to.equal(message);
  });

  it("redacts every occurrence", () => {
    expect(redactText("a@b.com then c@d.com")).to.equal("[Email] then [Email]");
  });
});

describe("KNOWN_SEGMENTS", () => {
  const srcRoot = path.resolve("src");

  const sourceFiles = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? sourceFiles(path.join(dir, entry.name))
          : [path.join(dir, entry.name)],
      )
      .filter((file) => file.endsWith(".ts"));

  const literalSegments = (route: string): string[] =>
    route
      .split(/[?#]/v)[0]
      .replace(/\$\{[^\}]*\}/gv, ":var")
      .split("/")
      .filter((segment) => segment !== "" && !segment.startsWith(":"));

  // Fails when a new route or outbound API path adds a word that is not in the
  // allow-list, which would otherwise show up as [Filtered] in Sentry.
  it("contains every literal word of the express routes", () => {
    const routeFiles = sourceFiles(
      path.join(srcRoot, "infrastructure/express/routes"),
    );
    const words = new Set<string>();
    for (const file of routeFiles) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /\.(?:get|post|put|patch|delete|use|all)\(\s*["'`](\/[^"'`]*)["'`]/gv,
      )) {
        literalSegments(match[1] ?? "").forEach((word) => words.add(word));
      }
    }

    expect(
      [...words].filter((word) => !KNOWN_SEGMENTS.has(word)),
    ).to.deep.equal([]);
  });

  it("contains every literal word of the outbound API paths", () => {
    const words = new Set<string>();
    for (const file of sourceFiles(path.join(srcRoot, "adaptors/source"))) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /["'`](\/(?:applications|claims|reports)[^"'`\s]*)["'`]/gv,
      )) {
        literalSegments(match[1] ?? "").forEach((word) => words.add(word));
      }
    }

    expect(
      [...words].filter((word) => !KNOWN_SEGMENTS.has(word)),
    ).to.deep.equal([]);
  });
});
