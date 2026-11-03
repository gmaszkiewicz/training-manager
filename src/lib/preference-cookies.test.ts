import { describe, expect, it } from "vitest";

import { PREFERENCE_COOKIE_MAX_AGE, staleAccountCookieNames } from "@/lib/preference-cookies";

const own = "11111111-1111-1111-1111-111111111111";
const other = "22222222-2222-2222-2222-222222222222";
const trainee = "33333333-3333-3333-3333-333333333333";

describe("PREFERENCE_COOKIE_MAX_AGE", () => {
  it("is 30 days in seconds", () => {
    expect(PREFERENCE_COOKIE_MAX_AGE).toBe(30 * 24 * 60 * 60);
  });
});

describe("staleAccountCookieNames", () => {
  it("returns nothing for an empty or missing header", () => {
    expect(staleAccountCookieNames(null, own)).toEqual([]);
    expect(staleAccountCookieNames("", own)).toEqual([]);
  });

  it("keeps the account's own account-level and per-trainee cookies", () => {
    const header = `tm.measurements.pageSize.${own}=10; tm.measurements.day.${own}.${trainee}=2026-01-01`;
    expect(staleAccountCookieNames(header, own)).toEqual([]);
  });

  it("returns another account's account-level and per-trainee cookies", () => {
    const header = [
      `tm.measurements.pageSize.${own}=10`,
      `tm.measurements.trainee.${other}=${trainee}`,
      `tm.measurements.page.${other}.${trainee}=2`,
    ].join("; ");
    expect(staleAccountCookieNames(header, own)).toEqual([
      `tm.measurements.trainee.${other}`,
      `tm.measurements.page.${other}.${trainee}`,
    ]);
  });

  it("keeps Supabase auth cookies, including chunked ones, and other non-tm cookies", () => {
    const header = [
      "sb-127-auth-token=base64-abc",
      "sb-127-auth-token.0=base64-part0",
      "sb-127-auth-token.1=base64-part1",
      "theme=dark",
    ].join("; ");
    expect(staleAccountCookieNames(header, own)).toEqual([]);
  });

  it("treats the account id in another segment as stale", () => {
    const header = `tm.measurements.day.${other}.${own}=2026-01-01`;
    expect(staleAccountCookieNames(header, own)).toEqual([`tm.measurements.day.${other}.${own}`]);
  });

  it("treats a tm name without an account segment as stale", () => {
    const header = "tm.measurements=1; tm.measurements.pageSize=10";
    expect(staleAccountCookieNames(header, own)).toEqual(["tm.measurements", "tm.measurements.pageSize"]);
  });

  it("handles whitespace and = inside values", () => {
    const header = `  sb-x-auth-token=a=b==;tm.measurements.list.${other} =  open=x ;  tm.measurements.list.${own}=closed==  `;
    expect(staleAccountCookieNames(header, own)).toEqual([`tm.measurements.list.${other}`]);
  });
});
