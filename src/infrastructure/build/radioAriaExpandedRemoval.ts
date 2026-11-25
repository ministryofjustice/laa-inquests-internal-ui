// govuk-frontend adds aria-expanded to radios that reveal conditional content.
// It does this on page load and also any click on the radio buttons, so we must
// observe and remove it to prevent unsupported behavior.
const ARIA_EXPANDED = "aria-expanded";
const RADIOS_WITH_ARIA_EXPANDED = `input[type="radio"][${ARIA_EXPANDED}]`;

const removeAriaExpandedFromRadios = (pageDocument: Document): void => {
  pageDocument.querySelectorAll(RADIOS_WITH_ARIA_EXPANDED).forEach((radio) => {
    radio.removeAttribute(ARIA_EXPANDED);
  });
};

export const initialiseRemoveAriaExpandedFromRadios = (
  pageDocument: Document,
  pageWindow: Pick<typeof globalThis, "MutationObserver">,
): void => {
  removeAriaExpandedFromRadios(pageDocument);

  const ariaExpandedObserver = new pageWindow.MutationObserver(() => {
    removeAriaExpandedFromRadios(pageDocument);
  });

  ariaExpandedObserver.observe(pageDocument.documentElement, {
    attributes: true,
    attributeFilter: [ARIA_EXPANDED],
    subtree: true,
  });
};
