import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type { UseCaseResult } from "#src/use-cases/common/useCaseResult.types.js";

interface BuildCertificateViewInput {
  applicationId: string;
}

interface BuildCertificateViewData {
  clientName: string;
  clientAddress: string;
  firmName: string;
  officeAddress: string;
  opponentDetails: string[];
  guardianName: string;
  guardianAddress: string;
  certificateType: string;
  status: string;
  effectiveDate: string;
  endDate: string;
  reinstatementDate: string;
  costLimitation: string;
  costLimitationEffectiveDate: string;
  certificateLimitation: string;
  careOrderDescription: string;
  categoryOfLaw: string;
  currentProceedingStatus: string;
  dateWorkCanCommence: string;
  proceedingEndDate: string;
  clientInvolvementType: string;
  levelOfService: string;
  dateCurrentLevelOfServiceEffective: string;
  previousLevelOfService: string;
  datePreviousLevelOfServiceEffective: string;
  scopeLimitationHeading: string;
  scopeLimitationDescription: string;
}

export class BuildCertificateViewUseCase {
  constructor(private readonly applicationPort: ApplicationPort) {}

  async execute(
    input: BuildCertificateViewInput,
  ): Promise<UseCaseResult<BuildCertificateViewData>> {
    await this.applicationPort.getCertificateDetails(input.applicationId);
    return {
      status: "SUCCESS",
      data: {
        clientName: "John Doe",
        clientAddress: "1 Test Road, London",
        firmName: "Test Solicitors",
        officeAddress: "Test Office Address, London",
        opponentDetails: ["Cabinet Office"],
        guardianName: "Not applicable",
        guardianAddress: "Not applicable",
        certificateType: "SUBSTANTIVE",
        status: "LIVE",
        effectiveDate: "2026-05-21T08:46:36.793278",
        endDate: "Not applicable",
        reinstatementDate: "Not applicable",
        costLimitation: "10000",
        costLimitationEffectiveDate: "Not applicable",
        certificateLimitation: "Not applicable",
        careOrderDescription: "Description of proceeding",
        categoryOfLaw: "INQUESTS",
        currentProceedingStatus: "LIVE",
        dateWorkCanCommence: "2026-05-21T08:46:36.793278",
        proceedingEndDate: "Not applicable",
        clientInvolvementType: "Applicant",
        levelOfService: "FULL_REPRESENTATION",
        dateCurrentLevelOfServiceEffective: "2026-05-21T08:46:36.793278",
        previousLevelOfService: "Not applicable",
        datePreviousLevelOfServiceEffective: "Not applicable",
        scopeLimitationHeading: "FINAL_HEARING",
        scopeLimitationDescription: "This is the scope description",
      },
    };
  }
}
