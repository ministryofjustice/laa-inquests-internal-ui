export const initialiseApplicationOverviewTabLinks = (
  pageDocument: Document,
  pageWindow: Pick<Window, "addEventListener">,
): void => {
  const tabs = pageDocument.getElementById("application-overview-tabs");
  const tabLinks = pageDocument.querySelectorAll<HTMLAnchorElement>(
    ".application-overview-tab-link",
  );

  if (!tabs || tabLinks.length === 0) {
    return;
  }

  const updateTabLinks = (): void => {
    const selectedTab = tabs.querySelector<HTMLAnchorElement>(
      '.govuk-tabs__tab[aria-selected="true"]',
    );
    const selectedHref = selectedTab?.getAttribute("href");

    tabLinks.forEach((tabLink) => {
      const tabLinkParagraph = tabLink.closest("p");
      if (tabLinkParagraph) {
        tabLinkParagraph.hidden = tabLink.getAttribute("href") === selectedHref;
      }
    });
  };

  updateTabLinks();
  pageWindow.addEventListener("hashchange", updateTabLinks);
};
