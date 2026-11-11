import {
  REPORT_DOWNLOAD_COOKIE,
  REPORT_DOWNLOAD_TOKEN_FIELD,
} from "#src/utils/reportDownload.constants.js";

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 60_000;

type PageWindow = Pick<Window, "setInterval" | "clearInterval" | "crypto">;

const readCookie = (pageDocument: Document, name: string): string | null => {
  const prefix = `${name}=`;
  const match = pageDocument.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));
  return match === undefined ? null : match.slice(prefix.length);
};

const expireCookie = (pageDocument: Document, name: string): void => {
  pageDocument.cookie = `${name}=; Max-Age=0; path=/`;
};

const clearErrors = (pageDocument: Document, form: HTMLFormElement): void => {
  pageDocument.querySelector(".govuk-error-summary")?.remove();

  const errorIds = new Set<string>();
  form.querySelectorAll(".govuk-error-message").forEach((errorMessage) => {
    if (errorMessage.id.length > 0) {
      errorIds.add(errorMessage.id);
    }
    errorMessage.remove();
  });

  form.querySelectorAll("[aria-describedby]").forEach((element) => {
    const remaining = (element.getAttribute("aria-describedby") ?? "")
      .split(/\s+/v)
      .filter((id) => id.length > 0 && !errorIds.has(id));
    if (remaining.length > 0) {
      element.setAttribute("aria-describedby", remaining.join(" "));
    } else {
      element.removeAttribute("aria-describedby");
    }
  });

  form.querySelectorAll(".govuk-form-group--error").forEach((group) => {
    group.classList.remove("govuk-form-group--error");
  });
  form.querySelectorAll(".govuk-input--error").forEach((input) => {
    input.classList.remove("govuk-input--error");
  });
};

export const initialiseReportDownloadErrors = (
  pageDocument: Document,
  pageWindow: PageWindow,
): void => {
  const form = pageDocument.querySelector<HTMLFormElement>(
    "form[data-report-download-form]",
  );
  const tokenInput = form?.querySelector<HTMLInputElement>(
    `input[name="${REPORT_DOWNLOAD_TOKEN_FIELD}"]`,
  );

  if (!form || !tokenInput) {
    return;
  }

  let pollTimer: number | null = null;

  const stopPolling = (): void => {
    if (pollTimer !== null) {
      pageWindow.clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  form.addEventListener("submit", () => {
    stopPolling();
    const token = pageWindow.crypto.randomUUID();
    tokenInput.value = token;
    const startedAt = Date.now();

    pollTimer = pageWindow.setInterval(() => {
      if (readCookie(pageDocument, REPORT_DOWNLOAD_COOKIE) === token) {
        stopPolling();
        expireCookie(pageDocument, REPORT_DOWNLOAD_COOKIE);
        clearErrors(pageDocument, form);
      } else if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  });
};
