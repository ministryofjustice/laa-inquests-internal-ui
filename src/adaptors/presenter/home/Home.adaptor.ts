import type { Request, Response } from "express";
import type { ApplicationSummary } from "#src/adaptors/models/application.types.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import { formatDateTime } from "#src/utils/dateFormatter.js";
import { BuildApplicationsListViewUseCase } from "#src/use-cases/home/BuildApplicationsListView.useCase.js";

interface HomeApplicationRow {
  reference: string;
  referenceUrl?: string;
  createdDate: string;
  status: string;
  decision: string;
}

interface TableCell {
  text?: string;
  href?: string;
}

export class HomeAdaptor {
  private readonly buildApplicationsListViewUseCase: BuildApplicationsListViewUseCase;

  constructor(
    private readonly applicationPort: ApplicationPort,
    buildApplicationsListViewUseCase: BuildApplicationsListViewUseCase = new BuildApplicationsListViewUseCase(),
  ) {
    this.buildApplicationsListViewUseCase = buildApplicationsListViewUseCase;
  }

  async renderHomePage(req: Request, res: Response): Promise<void> {
    const applicationsListResult =
      await this.buildApplicationsListViewUseCase.execute({
        applicationPort: this.applicationPort,
      });

    if (applicationsListResult.status !== "SUCCESS") {
      throw new Error("Unable to build applications list view");
    }

    res.render("main/index", {
      tableRows: sortApplicationsByCreatedAtDesc(
        applicationsListResult.data.applications,
      )
        .map(mapApplicationForHomeRow)
        .map((application): TableCell[] => [
          { text: application.reference, href: application.referenceUrl },
          { text: application.createdDate },
          { text: application.status },
          { text: application.decision },
        ]),
    });
  }
}

function mapApplicationForHomeRow(
  application: ApplicationSummary,
): HomeApplicationRow {
  return {
    reference: String(application.laaReference),
    referenceUrl: `/applications/${application.laaReference}/overview`,
    createdDate: formatDateTime(application.createdAt),
    status: formatDisplayValue(application.status),
    decision: formatDisplayValue(application.overallDecision),
  };
}

function sortApplicationsByCreatedAtDesc(
  applications: ApplicationSummary[],
): ApplicationSummary[] {
  return [...applications].sort(
    (first, second) =>
      getTimestamp(second.createdAt) - getTimestamp(first.createdAt),
  );
}

function getTimestamp(dateString: string): number {
  const timestamp = Date.parse(dateString);

  if (Number.isNaN(timestamp)) {
    return Number.NEGATIVE_INFINITY;
  }

  return timestamp;
}

function formatDisplayValue(value: string | null): string {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
