// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerOverlay } = vi.hoisted(() => ({
	registerOverlay: vi.fn(),
}));

vi.mock("klinecharts", () => ({ registerOverlay }));
vi.mock("@/lib/chart/theme-colors", () => ({
	colorToHex: (color: string) => color,
	colorToRgba: (color: string, alpha: number) => `${color}:${alpha}`,
	getChartColors: () => ({
		page: "#000000",
		background: "#111111",
		overlay: "#222222",
		control: "#333333",
		foreground: "#ffffff",
		textMuted: "#777777",
		textSecondary: "#888888",
		green: "#00ff00",
		red: "#ff0000",
		warning: "#ffaa00",
		fontFamily: "Inter",
	}),
}));

const yAxis = { convertToPixel: (value: number) => value };

function line(id: string, kind: string, price: number, oid?: number) {
	return { id, kind, price, tone: "up", priceText: String(price), sizeText: "1", title: kind, oid };
}

describe("order lines overlay", () => {
	beforeEach(() => {
		vi.resetModules();
		registerOverlay.mockClear();
	});

	it("registers once and adds a cancel hit area only to order labels", async () => {
		const { CANCEL_KEY, ORDER_LINES_OVERLAY, registerOrderLinesOverlay } = await import(
			"@/lib/chart/order-lines-overlay"
		);
		registerOrderLinesOverlay();
		registerOrderLinesOverlay();
		expect(registerOverlay).toHaveBeenCalledOnce();
		const config = registerOverlay.mock.calls[0]?.[0];
		expect(config).toMatchObject({ name: ORDER_LINES_OVERLAY, lock: true });

		const figures = config.createPointFigures({
			overlay: {
				extendData: {
					lines: [
						line("position", "position", 100),
						line("liquidation", "liquidation", 40),
						line("order:7", "limit", 160, 7),
					],
					markPx: null,
					symbol: "BTC",
					positionSide: "long",
				},
			},
			bounding: { width: 600, height: 300 },
			yAxis,
		});
		const keys = figures.map((f: { key?: string }) => f.key).filter(Boolean);
		expect(keys).toEqual([`${CANCEL_KEY}7`]);
	});

	it("stacks labels that would overlap", async () => {
		const { registerOrderLinesOverlay } = await import("@/lib/chart/order-lines-overlay");
		registerOrderLinesOverlay();
		const config = registerOverlay.mock.calls[0]?.[0];
		const figures = config.createPointFigures({
			overlay: {
				extendData: {
					lines: [line("order:1", "limit", 100, 1), line("order:2", "limit", 105, 2)],
					markPx: null,
					symbol: "BTC",
					positionSide: null,
				},
			},
			bounding: { width: 600, height: 300 },
			yAxis,
		});
		const hits = figures.filter((f: { key?: string }) => f.key).map((f: { attrs: { y: number } }) => f.attrs.y);
		expect(Math.abs(hits[1] - hits[0])).toBeGreaterThanOrEqual(20);
	});
});
