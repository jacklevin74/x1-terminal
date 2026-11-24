import { expect, it } from "vitest";
import { labelWidth, leftOffsets, positionLineStyle, readableText, shortPrice } from "@/lib/chart/position-line-style";
import type { TradingLine } from "@/lib/chart/trading-lines";

const base = { id: "x", label: "", tone: "down" as const };
const colors = { color: "#ff0000", page: "#000000", fg: "#ffffff" };

it("labels lines like the default chart view", () => {
	const short: TradingLine = { ...base, kind: "position", title: "Short", qty: "0.132", pnl: -0.78, price: 65000 };
	expect(positionLineStyle(short, colors)).toMatchObject({ body: "PNL -$0.78", qty: "-0.132" });
	const liq: TradingLine = { ...base, kind: "liquidation", title: "Liq.", price: 69.6560409192 };
	expect(positionLineStyle(liq, colors)).toMatchObject({ body: "Liq. 69.656", qty: "" });
	const order: TradingLine = { ...base, kind: "order", title: "Limit Buy", qty: "0.002", price: 64000 };
	expect(positionLineStyle(order, colors)).toMatchObject({ body: "Limit Buy", qty: "0.002" });
});

it("fills the label as one neutral chip with dark text and a muted size", () => {
	const line: TradingLine = { ...base, kind: "position", title: "Long", qty: "1", pnl: 2, price: 1 };
	expect(positionLineStyle(line, colors)).toMatchObject({
		color: "#ff0000",
		fill: "#ffffff",
		text: "#000000",
		surface: "#ffffff",
		fg: "#737373",
	});
});

it("places close labels side by side from the left edge", () => {
	const widths = [100, 80, 60, 50];
	expect(leftOffsets([100, 100.5, 101, 150], widths, 4)).toEqual([8, 114, 200, 8]);
	expect(leftOffsets([100, 150], [100, 80], 4)).toEqual([8, 8]);
});

it("measures the label with its size segment", () => {
	expect(labelWidth({ body: "abc", qty: "" }, (t) => t.length * 10)).toBe(46);
	expect(labelWidth({ body: "abc", qty: "12" }, (t) => t.length * 10)).toBe(82);
});

it("rounds prices to five significant figures", () => {
	expect(shortPrice(69.6560409192)).toBe("69.656");
	expect(shortPrice(0.000123456)).toBe("0.00012346");
	expect(shortPrice(123456.7)).toBe("123457");
});

it("uses dark text on light fills and white text on dark fills", () => {
	expect(readableText("#e0b84a", "#07070a", "#f2f2f2")).toBe("#07070a");
	expect(readableText("#3a0d12", "#07070a", "#f2f2f2")).toBe("#f2f2f2");
});
