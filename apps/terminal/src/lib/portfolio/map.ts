import Big from "big.js";
import { formatPercent, formatToken, shortenAddress } from "@/lib/format";
import type { InfoResponse } from "@/lib/hyperliquid";
import { spotUsdPrices } from "@/lib/positions/account-summary";
import { coinName, px, rowTime, signedUsd, sizeOf, usd } from "./format";
import type {
	AccountSummary,
	BalanceRow,
	FillRow,
	FundingRow,
	History,
	LedgerRow,
	OrderHistoryRow,
	OrderRow,
	Point,
	PortfolioRows,
	PositionRow,
	TwapRow,
	WindowId,
} from "./model";

type PortfolioResponse = InfoResponse<"portfolio">;
type ClearinghouseState = InfoResponse<"clearinghouseState">;
type SpotState = InfoResponse<"spotClearinghouseState">;
type SpotMeta = InfoResponse<"spotMetaAndAssetCtxs">;
type Fill = InfoResponse<"userFills">[number];
type Funding = InfoResponse<"userFunding">[number];
type Ledger = InfoResponse<"userNonFundingLedgerUpdates">[number];
type OpenOrder = InfoResponse<"frontendOpenOrders">[number];
type HistoricalOrder = InfoResponse<"historicalOrders">[number];

export interface TwapState {
	coin: string;
	executedNtl: string;
	executedSz: string;
	minutes: number;
	reduceOnly: boolean;
	side: "A" | "B";
	sz: string;
	timestamp: number;
}

export interface PortfolioSource {
	address: string;
	now: number;
	portfolio?: PortfolioResponse;
	states?: ClearinghouseState[];
	spot?: SpotState;
	spotMeta?: SpotMeta;
	fills?: Fill[];
	funding?: Funding[];
	ledger?: Ledger[];
	openOrders?: OpenOrder[];
	orderHistory?: HistoricalOrder[];
	twaps?: [number, TwapState][];
}

function toPoints(rows: [number, string][]): Point[] {
	return rows.map(([t, v]) => [t, Number(v)]);
}

export function mapHistory(portfolio: PortfolioResponse | undefined): History {
	const history: History = {};
	for (const [period, w] of portfolio ?? []) {
		history[period as WindowId] = {
			value: toPoints(w.accountValueHistory),
			pnl: toPoints(w.pnlHistory),
			volume: w.vlm,
		};
	}
	return history;
}

function sum(values: (string | number)[]) {
	return values.reduce<Big>((s, v) => s.plus(v), new Big(0));
}

function biasLabel(share: number) {
	if (share >= 0.75) return "Very bullish";
	if (share >= 0.55) return "Bullish";
	if (share > 0.45) return "Neutral";
	if (share > 0.25) return "Bearish";
	return "Very bearish";
}

function spotResolver(spotMeta: SpotMeta | undefined) {
	const universe = new Map((spotMeta?.[0].universe ?? []).map((u) => [u.name, u.tokens[0]]));
	const tokens = new Map((spotMeta?.[0].tokens ?? []).map((t) => [t.index, t]));
	return {
		prices: spotMeta ? spotUsdPrices(spotMeta[0].universe, spotMeta[1]) : ({ 0: 1 } as Record<number, number>),
		token: (index: number) => tokens.get(index),
		coin(coin: string) {
			const base = universe.get(coin);
			if (base === undefined) return coin;
			return tokens.get(base)?.name ?? coin;
		},
	};
}

function spotValue(total: string, token: number, prices: Record<number, number>) {
	const price = token === 0 ? 1 : prices[token];
	return price === undefined ? null : new Big(total).times(price);
}

export function mapAccount(src: PortfolioSource): AccountSummary {
	const states = src.states ?? [];
	const positions = states.flatMap((s) => s.assetPositions.map((a) => a.position));
	const { prices } = spotResolver(src.spotMeta);
	const spotEquity = sum(
		(src.spot?.balances ?? []).map((b) => spotValue(b.total, b.token, prices)?.toString() ?? "0"),
	).toNumber();
	const marginEquity = sum(states.map((s) => s.marginSummary.accountValue)).toNumber();
	const notional = sum(states.map((s) => s.marginSummary.totalNtlPos)).toNumber();
	const marginUsed = sum(states.map((s) => s.marginSummary.totalMarginUsed)).toNumber();
	const longNotional = sum(positions.filter((p) => Number(p.szi) > 0).map((p) => p.positionValue)).toNumber();
	const shortNotional = sum(positions.filter((p) => Number(p.szi) < 0).map((p) => p.positionValue)).toNumber();
	const longShare = longNotional / (longNotional + shortNotional || 1);
	const fills = src.fills ?? [];
	const closed = fills.filter((f) => Number(f.closedPnl) !== 0);
	const wins = closed.filter((f) => Number(f.closedPnl) > 0).length;
	const allTime = src.portfolio?.find(([p]) => p === "allTime")?.[1].accountValueHistory.at(-1)?.[1];
	return {
		value: allTime === undefined ? marginEquity + spotEquity : Number(allTime),
		perpEquity: marginEquity,
		spotEquity,
		withdrawable: states[0]?.withdrawable ?? "0",
		unrealized: sum(positions.map((p) => p.unrealizedPnl)).toNumber(),
		marginEquity,
		notional,
		leverage: marginEquity > 0 ? notional / marginEquity : 0,
		setLeverage: positions.length ? Math.max(...positions.map((p) => p.leverage.value)) : null,
		marginUsed,
		marginUsage: marginEquity > 0 ? marginUsed / marginEquity : 0,
		free: marginEquity - marginUsed,
		longNotional,
		shortNotional,
		longShare,
		bias: positions.length ? biasLabel(longShare) : "Flat",
		fees: sum(fills.filter((f) => f.feeToken === "USDC").map((f) => f.fee)).toNumber(),
		feeFills: fills.length,
		wins,
		closed: closed.length,
		winRate: wins / (closed.length || 1),
		outcomes: closed
			.slice(0, 40)
			.reverse()
			.map((f) => ({ id: `${f.hash}-${f.tid}`, win: Number(f.closedPnl) > 0, pnl: Number(f.closedPnl), coin: f.coin })),
	};
}

function usdcToken(v: string, decimals = 2) {
	return formatToken(v, { decimals, symbol: "USDC", compact: false });
}

function mapBalances(src: PortfolioSource): BalanceRow[] {
	const states = src.states ?? [];
	const spot = spotResolver(src.spotMeta);
	const perp: BalanceRow[] = states[0]
		? [
				{
					id: "perp",
					asset: "USDC",
					tag: "Perps",
					total: usdcToken(sum(states.map((s) => s.marginSummary.accountValue)).toString()),
					available: usdcToken(states[0].withdrawable),
					value: usd(sum(states.map((s) => s.marginSummary.accountValue)).toString()),
					pnl: "-",
					pnlNum: 0,
					contract: "-",
					perp: true,
				},
			]
		: [];
	const balances = (src.spot?.balances ?? [])
		.filter((b) => Number(b.total) > 0)
		.map((b) => {
			const value = spotValue(b.total, b.token, spot.prices);
			const contract = spot.token(b.token)?.evmContract?.address;
			const hasEntry = b.token !== 0 && value !== null && Number(b.entryNtl) > 0;
			const pnl = hasEntry ? value.minus(b.entryNtl) : null;
			return {
				id: `spot-${b.token}`,
				asset: b.coin,
				tag: "Spot",
				total: formatToken(b.total, { maximumFractionDigits: 8, symbol: b.coin, compact: false }),
				available: formatToken(new Big(b.total).minus(b.hold).toString(), {
					maximumFractionDigits: 8,
					symbol: b.coin,
					compact: false,
				}),
				value: value === null ? "-" : usd(value.toString()),
				pnl:
					pnl === null
						? "-"
						: `${signedUsd(pnl.toNumber())} (${formatPercent(pnl.div(b.entryNtl).toString(), { decimals: 2, signDisplay: "exceptZero" })})`,
				pnlNum: pnl?.toNumber() ?? 0,
				contract: contract ? shortenAddress(contract) : "-",
				perp: false,
				sort: value?.toNumber() ?? 0,
			};
		})
		.sort((a, b) => b.sort - a.sort)
		.map(({ sort: _sort, ...row }) => row);
	return [...perp, ...balances];
}

function tpslOf(coin: string, orders: OpenOrder[]) {
	const tpsl = orders.filter((o) => o.coin === coin && o.isPositionTpsl);
	const tp = tpsl.find((o) => o.orderType.startsWith("Take Profit"));
	const sl = tpsl.find((o) => o.orderType.startsWith("Stop"));
	return `${tp ? px(tp.triggerPx) : "-"} / ${sl ? px(sl.triggerPx) : "-"}`;
}

function mapPositions(src: PortfolioSource): PositionRow[] {
	const orders = src.openOrders ?? [];
	return (src.states ?? [])
		.flatMap((s) => s.assetPositions.map((a) => a.position))
		.map((p) => {
			const abs = new Big(p.szi).abs();
			const funding = -Number(p.cumFunding.sinceOpen);
			const pnl = Number(p.unrealizedPnl);
			return {
				id: p.coin,
				coin: p.coin,
				name: coinName(p.coin),
				long: Number(p.szi) > 0,
				leverage: `${p.leverage.value}x`,
				size: sizeOf(abs.toString(), p.coin),
				value: usd(p.positionValue),
				valueNum: Number(p.positionValue),
				entry: px(p.entryPx),
				mark: abs.eq(0) ? "-" : px(Number(new Big(p.positionValue).div(abs).toString()).toPrecision(6)),
				pnl,
				pnlText: signedUsd(pnl),
				roe: formatPercent(p.returnOnEquity, { decimals: 2, signDisplay: "exceptZero" }),
				liq: p.liquidationPx === null ? "-" : px(Number(p.liquidationPx).toPrecision(6)),
				margin: usd(p.marginUsed),
				funding,
				fundingText: signedUsd(funding),
				tpsl: tpslOf(p.coin, orders),
			};
		})
		.sort((a, b) => b.valueNum - a.valueNum);
}

function orderDirection(o: OpenOrder) {
	const buy = o.side === "B";
	if (o.reduceOnly) return buy ? "Close Short" : "Close Long";
	return buy ? "Long" : "Short";
}

function mapOrder(o: OpenOrder, time: number, coin: string): OrderRow {
	const price = o.orderType.includes("Market") && !o.isTrigger ? "Market" : px(o.limitPx);
	return {
		id: o.oid,
		time: rowTime(time),
		type: o.orderType,
		coin,
		direction: orderDirection(o),
		buy: o.side === "B",
		size: sizeOf(o.sz, coin),
		origSize: sizeOf(o.origSz, coin),
		value: usd(new Big(o.origSz).times(o.limitPx).toString()),
		price,
		reduceOnly: o.reduceOnly ? "Yes" : "No",
		trigger: o.triggerCondition,
		tpsl: o.isPositionTpsl ? "Yes" : "-",
	};
}

function statusLabel(status: string) {
	const words = status.replace(/([A-Z])/g, " $1").toLowerCase();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

function mapOrderHistory(src: PortfolioSource): OrderHistoryRow[] {
	const spot = spotResolver(src.spotMeta);
	return (src.orderHistory ?? []).map((h) => {
		const coin = spot.coin(h.order.coin);
		const filled = new Big(h.order.origSz).minus(h.order.sz);
		return {
			...mapOrder(h.order, h.statusTimestamp, coin),
			filled: filled.gt(0) ? sizeOf(filled.toString(), coin) : "-",
			status: statusLabel(h.status),
		};
	});
}

function mapTwaps(src: PortfolioSource): TwapRow[] {
	return [...(src.twaps ?? [])]
		.sort((a, b) => b[1].timestamp - a[1].timestamp)
		.map(([id, s]) => {
			const elapsed = Math.min(s.minutes, Math.max(0, Math.floor((src.now - s.timestamp) / 60_000)));
			const executed = new Big(s.executedSz);
			return {
				id,
				coin: s.coin,
				buy: s.side === "B",
				size: sizeOf(s.sz, s.coin),
				executed: sizeOf(s.executedSz, s.coin),
				avgPrice: executed.gt(0) ? px(new Big(s.executedNtl).div(executed).toPrecision(6)) : "-",
				running: `${elapsed}m / ${s.minutes}m`,
				reduceOnly: s.reduceOnly ? "Yes" : "No",
				created: rowTime(s.timestamp),
			};
		});
}

function mapFills(src: PortfolioSource): FillRow[] {
	const spot = spotResolver(src.spotMeta);
	return (src.fills ?? []).map((f) => {
		const coin = spot.coin(f.coin);
		return {
			id: `${f.hash}-${f.tid}`,
			time: rowTime(f.time),
			coin,
			buy: f.side === "B",
			direction: f.liquidation ? "Liquidated" : f.dir,
			price: px(f.px),
			size: sizeOf(f.sz, coin),
			tradeValue: usdcToken(new Big(f.px).times(f.sz).toString()),
			fee: formatToken(f.fee, {
				minimumFractionDigits: 2,
				maximumFractionDigits: 6,
				symbol: f.feeToken,
				compact: false,
			}),
			pnl: Number(f.closedPnl),
			pnlText: usdcToken(f.closedPnl),
		};
	});
}

function mapFunding(src: PortfolioSource): FundingRow[] {
	return [...(src.funding ?? [])]
		.sort((a, b) => b.time - a.time)
		.map((f) => ({
			id: `${f.time}-${f.delta.coin}`,
			time: rowTime(f.time),
			coin: f.delta.coin,
			size: sizeOf(new Big(f.delta.szi).abs().toString(), f.delta.coin),
			long: Number(f.delta.szi) > 0,
			payment: Number(f.delta.usdc),
			paymentText: formatToken(f.delta.usdc, { decimals: 4, symbol: "USDC", compact: false }),
			rate: formatPercent(f.delta.fundingRate, { decimals: 4, signDisplay: "exceptZero" }),
		}));
}

function dexName(dex: string) {
	if (dex === "") return "Perps";
	if (dex === "spot") return "Spot";
	return `${dex} perps`;
}

interface Movement {
	action: string;
	amount: string;
	token: string;
	from: string;
	to: string;
	fee?: string;
	outgoing: boolean;
}

function transferMovement(me: string, user: string, destination: string, from: string, to: string) {
	const outgoing = user.toLowerCase() === me && destination.toLowerCase() !== me;
	const incoming = user.toLowerCase() !== me;
	let action = "Transfer";
	if (outgoing) action = "Send";
	if (incoming) action = "Receive";
	return {
		action,
		from: incoming ? shortenAddress(user) : from,
		to: outgoing ? shortenAddress(destination) : to,
		outgoing,
	};
}

function movementOf(me: string, d: Ledger["delta"]): Movement {
	switch (d.type) {
		case "deposit":
			return { action: "Deposit", amount: d.usdc, token: "USDC", from: "Arbitrum", to: "Perps", outgoing: false };
		case "withdraw":
			return {
				action: "Withdraw",
				amount: d.usdc,
				token: "USDC",
				from: "Perps",
				to: "Arbitrum",
				fee: d.fee,
				outgoing: true,
			};
		case "accountClassTransfer":
			return {
				action: "Transfer",
				amount: d.usdc,
				token: "USDC",
				from: d.toPerp ? "Spot" : "Perps",
				to: d.toPerp ? "Perps" : "Spot",
				outgoing: false,
			};
		case "send":
			return {
				...transferMovement(me, d.user, d.destination, dexName(d.sourceDex), dexName(d.destinationDex)),
				amount: d.amount,
				token: d.token,
				fee: d.fee,
			};
		case "spotTransfer":
			return {
				...transferMovement(me, d.user, d.destination, "Spot", "Spot"),
				amount: d.amount,
				token: d.token,
				fee: d.fee,
			};
		case "internalTransfer":
			return {
				...transferMovement(me, d.user, d.destination, "Perps", "Perps"),
				amount: d.usdc,
				token: "USDC",
				fee: d.fee,
			};
		case "subAccountTransfer":
			return {
				...transferMovement(me, d.user, d.destination, "Perps", "Perps"),
				action: "Subaccount transfer",
				amount: d.usdc,
				token: "USDC",
			};
		case "vaultDeposit":
		case "vaultCreate":
			return {
				action: d.type === "vaultCreate" ? "Vault create" : "Vault deposit",
				amount: d.usdc,
				token: "USDC",
				from: "Perps",
				to: shortenAddress(d.vault),
				outgoing: true,
			};
		case "vaultWithdraw":
			return {
				action: "Vault withdraw",
				amount: d.netWithdrawnUsd,
				token: "USDC",
				from: shortenAddress(d.vault),
				to: "Perps",
				outgoing: false,
			};
		case "vaultDistribution":
			return {
				action: "Vault distribution",
				amount: d.usdc,
				token: "USDC",
				from: shortenAddress(d.vault),
				to: "Perps",
				outgoing: false,
			};
		case "vaultLeaderCommission":
			return { action: "Vault commission", amount: d.usdc, token: "USDC", from: "Vault", to: "Perps", outgoing: false };
		case "liquidation":
			return {
				action: "Liquidation",
				amount: d.liquidatedNtlPos,
				token: "USDC",
				from: "Perps",
				to: "-",
				outgoing: true,
			};
		case "rewardsClaim":
			return {
				action: "Rewards claim",
				amount: d.amount,
				token: d.token,
				from: "Rewards",
				to: "Spot",
				outgoing: false,
			};
		case "cStakingTransfer":
			return {
				action: d.isDeposit ? "Staking deposit" : "Staking withdraw",
				amount: d.amount,
				token: d.token,
				from: d.isDeposit ? "Spot" : "Staking",
				to: d.isDeposit ? "Staking" : "Spot",
				outgoing: d.isDeposit,
			};
		default:
			return {
				action: statusLabel(d.type),
				amount: "amount" in d ? d.amount : "0",
				token: "token" in d ? d.token : "USDC",
				from: "-",
				to: "-",
				outgoing: false,
			};
	}
}

function mapLedger(src: PortfolioSource): LedgerRow[] {
	const me = src.address.toLowerCase();
	return [...(src.ledger ?? [])]
		.sort((a, b) => b.time - a.time)
		.map((l) => {
			const m = movementOf(me, l.delta);
			return {
				id: `${l.hash}-${l.time}`,
				time: rowTime(l.time),
				action: m.action,
				amount: formatToken(m.amount, { decimals: 2, symbol: m.token, compact: false }),
				amountNum: m.outgoing ? -Number(m.amount) : Number(m.amount),
				from: m.from,
				to: m.to,
				fee: m.fee === undefined ? "-" : usdcToken(m.fee),
				outgoing: m.outgoing,
			};
		});
}

export function mapRows(src: PortfolioSource): PortfolioRows {
	const spot = spotResolver(src.spotMeta);
	return {
		balances: mapBalances(src),
		positions: mapPositions(src),
		orders: (src.openOrders ?? []).map((o) => mapOrder(o, o.timestamp, spot.coin(o.coin))),
		twap: mapTwaps(src),
		history: mapFills(src),
		funding: mapFunding(src),
		"orders-history": mapOrderHistory(src),
		ledger: mapLedger(src),
	};
}
