const clearNoteValidationErrors = (
  tabs: HTMLElement,
  noteTextarea: HTMLTextAreaElement,
  errorSummary: HTMLElement,
): void => {
  errorSummary.remove();
  tabs.querySelector("#note-text-error")?.remove();
  noteTextarea
    .closest("form")
    ?.querySelectorAll("[data-history-note-error]")
    .forEach((errorMessage) => {
      errorMessage.remove();
    });
  noteTextarea
    .closest(".govuk-form-group")
    ?.classList.remove("govuk-form-group--error");
  noteTextarea.classList.remove("govuk-textarea--error");

  const descriptions = noteTextarea
    .getAttribute("aria-describedby")
    ?.split(/\s+/v)
    .filter(
      (description) =>
        description.length > 0 && description !== "note-text-error",
    );

  if (descriptions !== undefined && descriptions.length > 0) {
    noteTextarea.setAttribute("aria-describedby", descriptions.join(" "));
  } else {
    noteTextarea.removeAttribute("aria-describedby");
  }
};

export const initialiseApplicationOverviewNoteErrors = (
  pageDocument: Document,
  pageWindow: Pick<
    Window,
    "addEventListener" | "removeEventListener" | "location"
  >,
): void => {
  const tabs = pageDocument.getElementById("application-overview-tabs");
  const errorSummary = pageDocument.getElementById(
    "history-note-error-summary",
  );
  const noteSuccessBanner = pageDocument.getElementById(
    "history-note-success-banner",
  );
  const noteTextarea = tabs?.querySelector<HTMLTextAreaElement>(
    "#history #note-text",
  );

  if (!tabs || (!errorSummary && !noteSuccessBanner) || !noteTextarea) {
    return;
  }

  const handleTabChange = (event: HashChangeEvent): void => {
    const destinationHash = event.newURL
      ? new URL(event.newURL).hash
      : pageWindow.location.hash;
    const destinationTab = Array.from(
      tabs.querySelectorAll<HTMLAnchorElement>(".govuk-tabs__tab"),
    ).find((tab) => tab.getAttribute("href") === destinationHash);

    if (!destinationTab || destinationTab.getAttribute("href") === "#history") {
      return;
    }

    noteSuccessBanner?.remove();

    if (errorSummary) {
      clearNoteValidationErrors(tabs, noteTextarea, errorSummary);
    }

    pageWindow.removeEventListener("hashchange", handleTabChange);
  };

  pageWindow.addEventListener("hashchange", handleTabChange);
};
