// A successful download keeps the browser on the page, whereas every other
// outcome (validation errors, rate limit, failure) navigates to a new page,
// so any errors on screen can be cleared as soon as the form is submitted.
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
): void => {
  const form = pageDocument.querySelector<HTMLFormElement>(
    "form[data-report-download-form]",
  );

  form?.addEventListener("submit", () => {
    clearErrors(pageDocument, form);
  });
};
