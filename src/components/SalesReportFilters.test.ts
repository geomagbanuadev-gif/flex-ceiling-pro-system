import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SalesReportFilters } from "./SalesReportFilters";

const render = (period: "week" | "biweekly" | "month" | "custom") => renderToStaticMarkup(createElement(SalesReportFilters, {
  period, status: "active", anchor: "2026-09-23", from: "2026-09-01", to: "2026-09-30",
}));
const field = (html: string, name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? "";
const fieldByType = (html: string, type: string) => html.match(new RegExp(`<input[^>]*type="${type}"[^>]*>`))?.[0] ?? "";
const isDisabled = (tag: string) => /\sdisabled(?:=""|(?=[\s/>]))/.test(tag);
const value = (tag: string) => tag.match(/\svalue="([^"]*)"/)?.[1] ?? "";

describe("SalesReportFilters", () => {
  it("shows the calculated 14-day range and explains the end date", () => {
    const biweekly = render("biweekly");

    expect(biweekly).toContain("14-day period ends on");
    expect(value(field(biweekly, "from"))).toBe("2026-09-10");
    expect(value(field(biweekly, "to"))).toBe("2026-09-23");
    expect(isDisabled(field(biweekly, "from"))).toBe(true);
    expect(isDisabled(field(biweekly, "to"))).toBe(true);
  });

  it("uses a month picker and shows the full calculated month", () => {
    const monthly = render("month");

    expect(value(fieldByType(monthly, "month"))).toBe("2026-09");
    expect(value(field(monthly, "from"))).toBe("2026-09-01");
    expect(value(field(monthly, "to"))).toBe("2026-09-30");
  });

  it("makes report dates editable only for a custom range", () => {
    const custom = render("custom");

    expect(custom).toContain("Choose the report start and end dates.");
    expect(field(custom, "anchor")).toBe("");
    expect(isDisabled(field(custom, "from"))).toBe(false);
    expect(isDisabled(field(custom, "to"))).toBe(false);
  });
});
