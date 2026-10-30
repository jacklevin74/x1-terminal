import { describe, expect, it } from "vitest";
import { buildPnlCardSvg, type PnlCardData } from "../positions/pnl-card";
const data: PnlCardData = { symbol: "TSLA", dex: "xyz", side: "LONG", leverage: 20, roe: 5.49, pnl: 274.33, entryPrice: "309.34", markPrice: "394.25", timestamp: "2026-10-29 15:00:00 UTC" };
describe("position PNL image", () => {
 it("uses ROE as a ratio and includes actual position values", () => {
  const svg = buildPnlCardSvg(data);
  expect(svg).toContain("+549.0%"); expect(svg).toContain("+$274.33");
  expect(svg).toContain("LONG 20X  ·  xyz");
  expect(svg).toContain("309.34"); expect(svg).toContain("394.25"); expect(svg).toContain("X1");
 });
 it("preserves losses and short-side leverage", () => {
  const svg = buildPnlCardSvg({ ...data, side: "SHORT", leverage: 10, roe: -0.693, pnl: -5796.01 });
  expect(svg).toContain("-69.3%"); expect(svg).toContain("-$5,796.01"); expect(svg).toContain("SHORT 10X");
 });
 it("does not fabricate zero values when data is unavailable", () => {
  const svg = buildPnlCardSvg({ ...data, roe: Number.NaN, pnl: Number.NaN, leverage: Number.NaN });
  expect(svg).not.toContain("NaN"); expect(svg).not.toContain("+0.0%"); expect(svg).toContain("—");
 });
 it("escapes SVG text so market names cannot insert markup or external resources", () => {
  const svg = buildPnlCardSvg({ ...data, symbol: '<image href="x"/>', dex: '<script>alert(1)</script>', entryPrice: '"<&', timestamp: '<img src="x">' });
  expect(svg).not.toContain("<script>"); expect(svg).not.toContain('<image href='); expect(svg).not.toContain('<img src=');
  expect(svg).toContain("&lt;image"); expect(svg).toContain("&quot;&lt;&amp;");
 });
});
