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
  const journey = getJourney(journeyType);
  const newIndex = getPageIndex(redirectToUrl, journey);

  const stepIndex = Math.max(newIndex - OFFSET, ZERO);

  markStepComplete(req, journey[stepIndex], journeyType);
  const sessionRecord = req.session as Record<string, unknown>;
  const visitedJourneyPages: unknown[] = Array.isArray(
    sessionRecord.visitedJourneyPages,
  )
    ? sessionRecord.visitedJourneyPages
    : [];
  visitedJourneyPages.push(redirectToUrl);
  sessionRecord.visitedJourneyPages = visitedJourneyPages;
  res.redirect(redirectToUrl);
}

export function markStepComplete(
  req: Pick<Request, "session">,
  pageToMark: string,
  journeyType: JOURNEY_TYPES,
): void {
  const journey = getJourney(journeyType);

  const sessionRecord = req.session as Record<string, unknown>;

  const stepIndex = getPageIndex(pageToMark, journey);
  if (stepIndex < ZERO) {
    throw new Error(`Unsupported pageToMark: ${pageToMark}`);
  }

  sessionRecord.lastCompletedStepIndex = stepIndex;
  sessionRecord.journeyType = journeyType;
}

function getJourney(journeyType: JOURNEY_TYPES): string[] {
  if (!(journeyType in JOURNEYS)) {
    throw new Error(`Unknown journey type: ${journeyType}`);
  }

  return JOURNEYS[journeyType];
}

function getPageIndex(pageToMark: string, journey: string[]): number {
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
