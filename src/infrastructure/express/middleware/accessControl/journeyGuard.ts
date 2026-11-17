import type { NextFunction, Request, Response } from "express";
import {
  JOURNEY_TYPES,
  JOURNEYS,
} from "#src/infrastructure/config/journeySequences.js";
import { JOURNEY_NOT_STARTED } from "#src/adaptors/presenter/utils/journeyStepHelper.js";
import { logger } from "#src/infrastructure/logging/logger.js";

const STEP_NOT_IN_SEQUENCE = -1;
const FIRST_STEP_INDEX = 0;
const NEXT_STEP_OFFSET = 1;
const ZERO = 0;

interface JourneyGuardOptions {
  journeySequence: readonly string[];
}

function getValidatedLastCompletedStep(
  session: unknown,
  sequenceLength: number,
): number {
  const rawLastCompleted =
    session instanceof Object &&
    "lastCompletedStepIndex" in session &&
    typeof session.lastCompletedStepIndex === "number"
      ? session.lastCompletedStepIndex
      : JOURNEY_NOT_STARTED;

  if (
    rawLastCompleted >= JOURNEY_NOT_STARTED &&
    rawLastCompleted < sequenceLength
  ) {
    return rawLastCompleted;
  }

  return JOURNEY_NOT_STARTED;
}

export function createJourneyGuard(options: JourneyGuardOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { journeySequence } = options;
    const { originalUrl: currentPath } = req;

    const currentIndex = getPageIndex(currentPath, journeySequence);

    if (currentIndex === STEP_NOT_IN_SEQUENCE) {
      next();
      return;
    }

    const sessionRecord = req.session as Record<string, unknown>;
    const lastCompletedStepIndex: number = getValidatedLastCompletedStep(
      sessionRecord,
      journeySequence.length,
    );

    const journeyType = parseInt(
      Object.entries(JOURNEYS)
        .find(([key, value]) => value === journeySequence)
        ?.at(ZERO) as string,
      10,
    );

    const isAllowedJourneyType =
      (!isNaN(journeyType) && journeyType === sessionRecord.journeyType) ||
      currentIndex === FIRST_STEP_INDEX;

    const isAllowedStep =
      currentIndex === FIRST_STEP_INDEX ||
      currentIndex <= lastCompletedStepIndex + NEXT_STEP_OFFSET;

    if (isAllowedStep && isAllowedJourneyType) {
      next();
      return;
    }

    const redirectToIndex = getRedirectIndex(
      lastCompletedStepIndex,
      journeySequence,
      isAllowedJourneyType,
    );

    // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- array access by computed index
    const lastCompletedUrl = journeySequence[redirectToIndex];
    const redirectUrl = replaceIdRegexesInUrl(lastCompletedUrl, currentPath);

    logger.logInfo({
      functionName: "journey_guard",
      message: "User attempted to skip ahead in journey",
      request: req,
      extraContext: {
        event: "journey_skip_prevented",
        journey_type: journeyType,
        current_path: currentPath,
        current_index: currentIndex,
        last_completed_index: lastCompletedStepIndex,
        redirect_to: redirectUrl,
      },
    });

    res.redirect(redirectUrl);
  };
}

function getRedirectIndex(
  lastCompletedStepIndex: number,
  journeySequence: readonly string[],
  isAllowedJourneyType: boolean,
): number {
  return lastCompletedStepIndex >= FIRST_STEP_INDEX &&
    lastCompletedStepIndex < journeySequence.length - NEXT_STEP_OFFSET &&
    isAllowedJourneyType
    ? lastCompletedStepIndex + NEXT_STEP_OFFSET
    : FIRST_STEP_INDEX;
}

function getPageIndex(pageToMark: string, journey: readonly string[]): number {
  const noQueryUrl = pageToMark.split("?").at(ZERO) ?? pageToMark;
  const abstractedApplicationPage = noQueryUrl.replace(
    /INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/v,
    "INQ-[A-Z0-9]{3}-[A-Z0-9]{3}",
  );
  const abstractedPage = abstractedApplicationPage.replace(
    /INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/v,
    "INQC-[A-Z0-9]{4}-[A-Z0-9]{4}",
  );
  return journey.indexOf(abstractedPage);
}

function replaceIdRegexesInUrl(
  redirectUrlPattern: string,
  currentPath: string,
): string {
  const applicationIdMatch = /INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/v.exec(currentPath);
  const specificApplicationUrl = applicationIdMatch
    ? redirectUrlPattern.replace(
        "INQ-[A-Z0-9]{3}-[A-Z0-9]{3}",
        applicationIdMatch[0],
      )
    : redirectUrlPattern;
  const claimIdMatch = /INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/v.exec(currentPath);
  const specificClaimUrl = claimIdMatch
    ? specificApplicationUrl.replace(
        "INQC-[A-Z0-9]{4}-[A-Z0-9]{4}",
        claimIdMatch[0],
      )
    : specificApplicationUrl;
  return specificClaimUrl;
}

export const publicAuthorityJourneyGuard = createJourneyGuard({
  journeySequence: JOURNEYS[JOURNEY_TYPES.PUBLIC_AUTHORITY],
});

export const applicationDecisionJourneyGuard = createJourneyGuard({
  journeySequence: JOURNEYS[JOURNEY_TYPES.APPLICATION_DECISION],
});

export const claimDecisionJourneyGuard = createJourneyGuard({
  journeySequence: JOURNEYS[JOURNEY_TYPES.CLAIM_DECISION],
});
