import { describe, expect, it } from "vitest";
import type { InfoResponse } from "@/lib/hyperliquid";
import { mapAccount, mapHistory, mapRows, type PortfolioSource } from "@/lib/portfolio/map";
import { rangeStats, seriesFor } from "@/lib/portfolio/model";
import raw from "./fixtures/portfolio-account.json";

const ADDRESS = "0x5fa3968b8f255076d1e23ae755fd93222e509627";

function source(): PortfolioSource {
	return {
		address: ADDRESS,
		now: 1795347743842,
		portfolio: raw.portfolio as unknown as InfoResponse<"portfolio">,
		states: [raw.clearinghouseState as unknown as InfoResponse<"clearinghouseState">],
		spot: raw.spotClearinghouseState as unknown as InfoResponse<"spotClearinghouseState">,
		fills: raw.fills as unknown as InfoResponse<"userFills">,
		funding: raw.funding as unknown as InfoResponse<"userFunding">,
		ledger: raw.ledger as unknown as InfoResponse<"userNonFundingLedgerUpdates">,
		openOrders: raw.openOrders as unknown as InfoResponse<"frontendOpenOrders">,
	};
}

describe("portfolio mapping", () => {
	it("maps the portfolio windows to chart series and range stats", () => {
		const history = mapHistory(source().portfolio);
		expect(seriesFor(history, "value", "month")).toHaveLength(4);
		expect(seriesFor(history, "value", "month").at(-1)).toEqual([1795347743842, 349763.849994]);
		const month = rangeStats(history, "month");
		expect(month.pnl).toBeCloseTo(19774.418147, 6);
		expect(month.perpPnl).toBeCloseTo(19774.418147, 6);
		expect(month.volume).toBeCloseTo(84696725.94, 2);
		expect(rangeStats(history, "allTime").perpPnl).toBeCloseTo(-37902.55109, 5);
	});

	it("computes the summary and stat table from account state and fills", () => {
		const a = mapAccount(source());
		expect(a.value).toBeCloseTo(349763.849994, 6);
		expect(a.perpEquity).toBeCloseTo(207925.52901, 5);
		expect(a.spotEquity).toBeCloseTo(0.00108462, 8);
		expect(a.withdrawable).toBe("186748.85554");
		expect(a.unrealized).toBeCloseTo(-40.240801, 6);
		expect(a.leverage).toBeCloseTo(61837.27013 / 207925.52901, 8);
		expect(a.marginUsage).toBeCloseTo(20612.423375 / 207925.52901, 8);
		expect(a.setLeverage).toBe(3);
		expect(a.longNotional).toBe(0);
		expect(a.shortNotional).toBeCloseTo(8531.35578, 5);
		expect(a.bias).toBe("Very bearish");
		expect(a.feeFills).toBe(6);
		expect(a.fees).toBeCloseTo(-0.023726, 6);
		expect(a.wins).toBe(4);
		expect(a.closed).toBe(4);
		expect(a.winRate).toBe(1);
		expect(a.outcomes).toHaveLength(4);
	});

	it("builds tab rows with counts and ledger directions", () => {
		const rows = mapRows(source());
		expect(rows.positions.map((p) => p.coin)).toEqual(["BTC", "ETH"]);
		expect(rows.positions[0].long).toBe(false);
		expect(rows.balances.map((b) => b.tag)).toEqual(["Perps", "Spot"]);
		expect(rows.orders).toHaveLength(2);
		expect(rows.history).toHaveLength(6);
		expect(rows.funding).toHaveLength(3);
		expect(rows.twap).toEqual([]);
		expect(rows["orders-history"]).toEqual([]);
		expect(rows.ledger).toHaveLength(3);
		expect(rows.ledger[0]).toMatchObject({ action: "Send", outgoing: true, amountNum: -10000, from: "Perps" });
		expect(rows.ledger[1]).toMatchObject({ action: "Transfer", from: "Perps", to: "xyz perps", amountNum: 20000 });
	});

	it("returns empty rows and zero stats without data", () => {
		const empty = { address: ADDRESS, now: 0 };
		const a = mapAccount(empty);
		expect(a.value).toBe(0);
		expect(a.setLeverage).toBeNull();
		expect(a.bias).toBe("Flat");
		expect(mapRows(empty).positions).toEqual([]);
		expect(rangeStats(mapHistory(undefined), "day").pnl).toBe(0);
	});
});
