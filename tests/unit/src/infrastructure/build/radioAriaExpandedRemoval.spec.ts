import { strict as assert } from "assert";
import { JSDOM } from "jsdom";
import { initialiseRemoveAriaExpandedFromRadios } from "#src/infrastructure/build/radioAriaExpandedRemoval.js";

const markup = `
  <input type="radio" id="pay" name="decision" aria-expanded="false">
  <input type="radio" id="reject" name="decision" aria-controls="reveal" aria-expanded="false">
  <input type="checkbox" id="agree" aria-expanded="false">
`;

const nextTick = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe("remove unsupported radio aria-expanded", () => {
  it("removes aria-expanded from radios that already have it", () => {
    const dom = new JSDOM(markup);
    try {
      const { document } = dom.window;
      initialiseRemoveAriaExpandedFromRadios(document, dom.window);

      assert.equal(
        document.querySelectorAll('input[type="radio"][aria-expanded]').length,
        0,
      );
    } finally {
      dom.window.close();
    }
  });

  it("keeps aria-controls on the radios", () => {
    const dom = new JSDOM(markup);
    try {
      const { document } = dom.window;
      initialiseRemoveAriaExpandedFromRadios(document, dom.window);

      assert.equal(
        document.querySelector("#reject")?.getAttribute("aria-controls"),
        "reveal",
      );
    } finally {
      dom.window.close();
    }
  });

  it("removes aria-expanded again when it is re-added to a radio", async () => {
    const dom = new JSDOM(markup);
    try {
      const { document } = dom.window;
      initialiseRemoveAriaExpandedFromRadios(document, dom.window);

      document.querySelector("#reject")?.setAttribute("aria-expanded", "true");
      await nextTick();

      assert.equal(
        document.querySelector("#reject")?.hasAttribute("aria-expanded"),
        false,
      );
    } finally {
      dom.window.close();
    }
  });

  it("leaves aria-expanded on non-radio inputs", () => {
    const dom = new JSDOM(markup);
    try {
      const { document } = dom.window;
      initialiseRemoveAriaExpandedFromRadios(document, dom.window);

      assert.equal(
        document.querySelector("#agree")?.getAttribute("aria-expanded"),
        "false",
      );
    } finally {
      dom.window.close();
    }
  });
});
