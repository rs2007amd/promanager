import { beforeEach, describe, expect, it, vi } from "vitest";
import { isCronAuthorized } from "./cron-auth";

const SECRET = "a-long-enough-cron-secret";
const request = (auth?: string) =>
  new Request("http://localhost/api/cron/x", {
    headers: auth === undefined ? {} : { authorization: auth },
  });

describe("isCronAuthorized", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("accepts the right secret", () => {
    expect(isCronAuthorized(request(`Bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it("rejects a wrong or missing header", () => {
    expect(isCronAuthorized(request("Bearer nope"), SECRET)).toBe(false);
    expect(isCronAuthorized(request(), SECRET)).toBe(false);
  });

  it("refuses everything when the secret is not set", () => {
    expect(isCronAuthorized(request("Bearer undefined"), undefined)).toBe(false);
    expect(isCronAuthorized(request("Bearer "), "")).toBe(false);
  });

  it("refuses everything when the secret is too short to be safe", () => {
    expect(isCronAuthorized(request("Bearer abc"), "abc")).toBe(false);
  });
});
