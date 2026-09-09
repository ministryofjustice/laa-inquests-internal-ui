import type { Request, Response } from "express";
import { throwUseCaseFailure } from "#src/adaptors/presenter/common/useCaseFailure.js";
import type { SessionHelper } from "#src/infrastructure/express/session/SessionHelper.js";
import type { ApplicationPort } from "#src/ports/inquests-api/applications/ApplicationAPI/ApplicationAPI.port.js";
import type {
  TypedRequest,
  IdParams,
} from "#src/infrastructure/express/api.types.js";
import type {
  PublicAuthorityFormData,
  PublicAuthorityError,
  PublicAuthorityValidator,
} from "./PublicAuthority.validator.js";
import { PreparePublicAuthorityFormUseCase } from "#src/use-cases/applications/publicAuthority/PreparePublicAuthorityForm.useCase.js";
import { ProcessPublicAuthoritySelectionUseCase } from "#src/use-cases/applications/publicAuthority/ProcessPublicAuthoritySelection.useCase.js";
import { PrepareConfirmPublicAuthorityViewUseCase } from "#src/use-cases/applications/publicAuthority/PrepareConfirmPublicAuthorityView.useCase.js";
import { ConfirmPublicAuthorityUpdateUseCase } from "#src/use-cases/applications/publicAuthority/ConfirmPublicAuthorityUpdate.useCase.js";
import { GetPublicBodiesUseCase } from "#src/use-cases/applications/publicAuthority/GetPublicBodies.useCase.js";
import { logger } from "#src/infrastructure/logging/logger.js";

const SESSION_NAMESPACE = "publicAuthority";

interface PublicAuthorityUseCases {
  preparePublicAuthorityFormUseCase: PreparePublicAuthorityFormUseCase;
  processPublicAuthoritySelectionUseCase: ProcessPublicAuthoritySelectionUseCase;
  prepareConfirmPublicAuthorityViewUseCase: PrepareConfirmPublicAuthorityViewUseCase;
  confirmPublicAuthorityUpdateUseCase: ConfirmPublicAuthorityUpdateUseCase;
  getPublicBodiesUseCase: GetPublicBodiesUseCase;
}

export class PublicAuthorityAdaptor {
  private readonly preparePublicAuthorityFormUseCase: PreparePublicAuthorityFormUseCase;
  private readonly processPublicAuthoritySelectionUseCase: ProcessPublicAuthoritySelectionUseCase;
  private readonly prepareConfirmPublicAuthorityViewUseCase: PrepareConfirmPublicAuthorityViewUseCase;
  private readonly confirmPublicAuthorityUpdateUseCase: ConfirmPublicAuthorityUpdateUseCase;
  private readonly getPublicBodiesUseCase: GetPublicBodiesUseCase;

  constructor(
    private readonly applicationPort: ApplicationPort,
    private readonly sessionHelper: SessionHelper,
    private readonly validator: PublicAuthorityValidator,
    useCases: Partial<PublicAuthorityUseCases> = {},
  ) {
    this.preparePublicAuthorityFormUseCase =
      useCases.preparePublicAuthorityFormUseCase ??
      new PreparePublicAuthorityFormUseCase();
    this.processPublicAuthoritySelectionUseCase =
      useCases.processPublicAuthoritySelectionUseCase ??
      new ProcessPublicAuthoritySelectionUseCase();
    this.prepareConfirmPublicAuthorityViewUseCase =
      useCases.prepareConfirmPublicAuthorityViewUseCase ??
      new PrepareConfirmPublicAuthorityViewUseCase();
    this.confirmPublicAuthorityUpdateUseCase =
      useCases.confirmPublicAuthorityUpdateUseCase ??
      new ConfirmPublicAuthorityUpdateUseCase(applicationPort);
    this.getPublicBodiesUseCase =
      useCases.getPublicBodiesUseCase ??
      new GetPublicBodiesUseCase(applicationPort);
  }

  async renderSelectionForm(
    req: Request,
    res: Response,
    errorSummaries?: Partial<PublicAuthorityError>,
    submittedValues?: string[],
  ): Promise<void> {
    const laaReference = req.params.laaReference as string;
    const fromConfirm = req.query.from === "confirm";

    const application = await this.applicationPort.getApplication(
      laaReference,
      req.session.user?.accessToken,
    );

    const allPublicBodies = await this.getPublicBodiesUseCase.execute(
      req.session.user?.accessToken,
    );

    const currentPublicBodyIds = application.publicBodies.map(
      (body) => body.publicBodyId,
    );

    const prepareResult = this.preparePublicAuthorityFormUseCase.execute({
      allPublicBodies,
      currentPublicBodyIds,
    });

    if (prepareResult.status !== "SUCCESS") {
      throwUseCaseFailure(
        prepareResult,
        "Unable to prepare public authorities form",
      );
    }

    const selectedPublicAuthorityIds = this.#resolveSelectedIds(
      req,
      submittedValues,
      fromConfirm,
      currentPublicBodyIds,
    );

    res.render("application/update-public-authorities", {
      laaReference,
      publicAuthorityOptions: prepareResult.data.items,
      selectedPublicAuthorityIds,
      ...(errorSummaries !== undefined && { errorSummaries }),
    });
  }

  async processSelectionForm(
    req: TypedRequest<PublicAuthorityFormData, IdParams>,
    res: Response,
  ): Promise<void> {
    const {
      body: { publicAuthorityOption },
      params: { laaReference },
    } = req;

    const application = await this.applicationPort.getApplication(
      laaReference,
      req.session.user?.accessToken,
    );

    const currentPublicBodyIds = application.publicBodies.map(
      (body) => body.publicBodyId,
    );

    const processResult = this.processPublicAuthoritySelectionUseCase.execute({
      publicAuthorityOption,
      currentPublicBodyIds,
      validate: (form) =>
        this.validator.validatePublicAuthorityInput(form, currentPublicBodyIds),
    });

    if (processResult.status === "VALIDATION_FAILED") {
      const submittedValues = Array.isArray(publicAuthorityOption)
        ? publicAuthorityOption
        : typeof publicAuthorityOption === "string" &&
            publicAuthorityOption !== ""
          ? [publicAuthorityOption]
          : [];

      await this.renderSelectionForm(
        req as unknown as Request,
        res,
        processResult.validationErrors,
        submittedValues,
      );
      return;
    }

    if (processResult.status !== "SUCCESS") {
      throwUseCaseFailure(
        processResult,
        "Unable to process public authority selection",
      );
    }

    this.sessionHelper.storeSessionData(req, SESSION_NAMESPACE, {
      selectedPublicAuthorityIds: JSON.stringify(
        processResult.data.selectedPublicAuthorityIds,
      ),
    });

    res.redirect(`/applications/${laaReference}/public-authorities/confirm`);
  }

  async renderConfirmationPage(req: Request, res: Response): Promise<void> {
    const laaReference = req.params.laaReference as string;
    const backUrl = `/applications/${laaReference}/public-authorities?from=confirm`;

    const sessionData = this.sessionHelper.getSessionData(
      req,
      SESSION_NAMESPACE,
    );

    const selectedPublicAuthorityIds = sessionData?.selectedPublicAuthorityIds
      ? (JSON.parse(sessionData.selectedPublicAuthorityIds) as string[])
      : [];

    const allPublicBodies = await this.getPublicBodiesUseCase.execute(
      req.session.user?.accessToken,
    );

    const prepareResult = this.prepareConfirmPublicAuthorityViewUseCase.execute(
      {
        selectedPublicAuthorityIds,
        allPublicBodies,
      },
    );

    if (prepareResult.status !== "SUCCESS") {
      throwUseCaseFailure(
        prepareResult,
        "Unable to prepare public authorities confirmation view",
      );
    }

    const publicAuthorityRows =
      prepareResult.data.selectedPublicAuthorities.map((authority) => ({
        key: { text: authority.description },
        value: { text: "" },
      }));

    res.render("application/confirm-public-authorities", {
      laaReference,
      backUrl,
      publicAuthorityRows,
    });
  }

  async processConfirmation(req: Request, res: Response): Promise<void> {
    const laaReference = req.params.laaReference as string;

    const sessionData = this.sessionHelper.getSessionData(
      req,
      SESSION_NAMESPACE,
    );

    const selectedPublicAuthorityIds = sessionData?.selectedPublicAuthorityIds
      ? (JSON.parse(sessionData.selectedPublicAuthorityIds) as string[])
      : [];

    const confirmResult =
      await this.confirmPublicAuthorityUpdateUseCase.execute({
        laaReference,
        selectedPublicAuthorityIds,
        accessToken: req.session.user?.accessToken,
      });

    if (confirmResult.status === "INVALID_INPUT") {
      throw new Error(confirmResult.message);
    }

    logger.logInfo({
      functionName: "process_public_authority_confirmation",
      message: "Public authorities updated",
      request: req,
      extraContext: {
        event: "public_authorities_updated",
        laa_reference: laaReference,
      },
    });

    this.sessionHelper.clearSessionData(req, SESSION_NAMESPACE);
    this.sessionHelper.setFlash(
      req,
      SESSION_NAMESPACE,
      "publicAuthorityUpdated",
    );

    res.redirect(`/applications/${laaReference}/overview`);
  }

  #resolveSelectedIds(
    req: Request,
    submittedValues: string[] | undefined,
    fromConfirm: boolean,
    currentPublicBodyIds: string[],
  ): string[] {
    if (submittedValues !== undefined) {
      return submittedValues;
    }

    if (fromConfirm) {
      const sessionData = this.sessionHelper.getSessionData(
        req,
        SESSION_NAMESPACE,
      );
      return sessionData?.selectedPublicAuthorityIds
        ? (JSON.parse(sessionData.selectedPublicAuthorityIds) as string[])
        : currentPublicBodyIds;
    }

    this.sessionHelper.clearSessionData(req, SESSION_NAMESPACE);
    return currentPublicBodyIds;
  }
}
