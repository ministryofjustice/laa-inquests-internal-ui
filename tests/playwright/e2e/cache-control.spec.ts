import { test, expect } from "../fixtures/index.js";
import { HTTP_OK } from "../constants/httpStatus.js";

test("sets no-store cache headers", async ({ request }) => {
  const response = await request.get("/health");

  expect(response.status()).toBe(HTTP_OK);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["pragma"]).toBe("no-cache");
});
