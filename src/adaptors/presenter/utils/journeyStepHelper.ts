import type { Request, Response } from "express";
import {
  JOURNEYS,
  type JOURNEY_TYPES,
} from "#src/infrastructure/config/journeySequences.js";

const ZERO = 0;
const OFFSET = 1;

export const JOURNEY_NOT_STARTED = -1;

export function completeStepAndRedirect(
  req: Request,
  res: Response,
  redirectToUrl: string,
  journeyType: JOURNEY_TYPES,
): void {
  const noQueryUrl = redirectToUrl.split("?").at(ZERO) ?? redirectToUrl;

  const journey = getJourney(journeyType); // TODO: test logic in here?

  const stepIndex =
    journey.indexOf(noQueryUrl) === ZERO
      ? ZERO
      : journey.indexOf(noQueryUrl) - OFFSET;

  markStepComplete(req, journey[stepIndex], journeyType); // TODO: test journey type is passed?
  res.redirect(redirectToUrl);
}

export function markStepComplete(
  req: Pick<Request, "session">,
  pageToMark: string,
  journeyType: JOURNEY_TYPES,
): void {
  const journey = getJourney(journeyType);

  const sessionRecord = req.session as Record<string, unknown>;

  const abstractedApplicationPage = pageToMark.replace(
    /INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/v,
    "INQ-[A-Z0-9]{3}-[A-Z0-9]{3}",
  );
  const abstractedPage = abstractedApplicationPage.replace(
    /INQC-[A-Z0-9]{4}-[A-Z0-9]{4}/v,
    "INQC-[A-Z0-9]{4}-[A-Z0-9]{4}",
  );

  const stepIndex = journey.indexOf(abstractedPage);
  if (stepIndex < ZERO) {
    throw new Error(`Unsupported pageToMark: ${pageToMark}`);
  }

  // TODO: Make this dynamic/not global?
  sessionRecord.lastCompletedStepIndex = stepIndex;
}

function getJourney(journeyType: JOURNEY_TYPES): string[] {
  if (!(journeyType in JOURNEYS)) {
    throw new Error(`Unknown journey type: ${journeyType}`);
  }

  return JOURNEYS[journeyType];
}
