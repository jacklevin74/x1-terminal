import { t } from "@lingui/core/macro";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { get24hChange, getOiUsd } from "@/domain/market";
import { useTickFlash } from "@/hooks/ui/use-tick-flash";
import { cn } from "@/lib/cn";
import { formatClockDuration, formatPercent, formatUSD, shortenAddress } from "@/lib/format";
import {
	getExplorerTokenUrl,
	type SpotMarketInfo,
	type UnifiedMarketInfo,
	useSelectedMarketInfo,
	useSubscription,
} from "@/lib/hyperliquid";
import { toBig } from "@/lib/trade/numbers";
import { getValueColorClass } from "@/lib/ui/value-color";
import { StatBlock } from "./chart/stat-block";
import { MoodSlot } from "./mood/mood-slot";

const HOUR_MS = 3_600_000;

function FundingTooltipContent({ fundingNum }: { fundingNum: number }) {
	const [remaining, setRemaining] = useState(() => HOUR_MS - (Date.now() % HOUR_MS));

	useEffect(() => {
		const id = setInterval(() => setRemaining(HOUR_MS - (Date.now() % HOUR_MS)), 1000);
		return () => clearInterval(id);
	}, []);

	const rows = [
		{ label: t`7 days`, rate: fundingNum * 24 * 7 },
		{ label: t`30 days`, rate: fundingNum * 24 * 30 },
		{ label: t`1 year`, rate: fundingNum * 24 * 365 },
	];

	return (
		<div className="min-w-36 space-y-2">
			<div className="flex items-center justify-between gap-4">
				<span className="text-2xs uppercase tracking-micro text-fg-muted">{t`Resets in`}</span>
				<span className="text-xs tabular-nums text-fg">{formatClockDuration(remaining)}</span>
			</div>
			<div className="space-y-1 border-t border-stroke-weak pt-2">
				{rows.map(({ label, rate }) => (
					<div key={label} className="flex items-center justify-between gap-4">
						<span className="text-xs text-fg-muted">{label}</span>
						<span className={cn("text-xs tabular-nums", getValueColorClass(rate))}>
							{formatPercent(rate, { signDisplay: "exceptZero" })}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function getTickColorClass(direction: number): string {
	if (direction > 0) return "text-market-up";
	if (direction < 0) return "text-market-down";
	return "text-fg";
}

function getSpotTokenAddress(market: UnifiedMarketInfo | undefined): string | null {
	if (market?.kind !== "spot") return null;
	const baseToken = market.tokensInfo[0];
	if (!baseToken) return null;
	const tokenId = (baseToken as { tokenId?: string }).tokenId;
	if (!tokenId || !tokenId.startsWith("0x")) return null;
	return tokenId;
}

function getSpotSubscriptionCoin(market: UnifiedMarketInfo | undefined): string {
	if (market?.kind !== "spot") return "";
	return `@${(market as SpotMarketInfo).index}`;
}

export function MarketOverview() {
	const { data: selectedMarketInfo } = useSelectedMarketInfo();

	const isSpot = selectedMarketInfo?.kind === "spot";
	const perpCoin = selectedMarketInfo?.name ?? "";
	const spotCoin = getSpotSubscriptionCoin(selectedMarketInfo);

	const { data: perpCtxEvent } = useSubscription(
		"activeAssetCtx",
		{ coin: perpCoin },
		{ enabled: !!perpCoin && !isSpot },
	);
	const { data: spotCtxEvent } = useSubscription(
		"activeSpotAssetCtx",
		{ coin: spotCoin },
		{ enabled: !!spotCoin && isSpot },
	);

	const liveCtx = isSpot ? spotCtxEvent?.ctx : perpCtxEvent?.ctx;
	const perpCtx = perpCtxEvent?.ctx;

	const markPxLive = liveCtx?.markPx;
	const dayNtlVlm = liveCtx?.dayNtlVlm;
	const oraclePx = perpCtx?.oraclePx;
	const funding = perpCtx?.funding;

	const markPxForDisplay = markPxLive ?? selectedMarketInfo?.markPx;
	const prevDayForChange = liveCtx?.prevDayPx ?? selectedMarketInfo?.prevDayPx;
	const markForChange = markPxLive ?? selectedMarketInfo?.markPx;

	const fundingNum = toBig(funding)?.toNumber() ?? 0;
	const change24h = get24hChange(prevDayForChange, markForChange);
	const oiUsd = getOiUsd(perpCtx?.openInterest, perpCtx?.markPx);
	const spotTokenAddress = getSpotTokenAddress(selectedMarketInfo);

	const [tick, setTick] = useState({ coin: perpCoin, price: markPxForDisplay, direction: 0 });
	if (perpCoin !== tick.coin) {
		setTick({ coin: perpCoin, price: markPxForDisplay, direction: 0 });
	} else if (markPxForDisplay !== tick.price) {
		const prev = toBig(tick.price);
		const next = toBig(markPxForDisplay);
		const step = prev && next ? next.cmp(prev) : 0;
		setTick({ coin: perpCoin, price: markPxForDisplay, direction: step === 0 ? tick.direction : step });
	}

	const priceRef = useTickFlash<HTMLSpanElement>(markPxForDisplay, perpCoin);

	const heroPrice = markPxForDisplay != null ? formatUSD(markPxForDisplay, { compact: false }) : "—";
	const changePct = change24h !== null ? formatPercent(change24h / 100, { signDisplay: "exceptZero" }) : "—";
	const compactUsd = { notation: "compact", compactDisplay: "short" } as const;

	return (
		<div className="flex min-w-0 flex-nowrap items-center gap-6">
			<span
				ref={priceRef}
				className={cn("shrink-0 text-base font-medium tabular-nums", getTickColorClass(tick.direction))}
			>
				{heroPrice}
			</span>
			<StatBlock
				label={t`24h`}
				value={changePct}
				valueClass={change24h === null ? "text-fg-muted" : getValueColorClass(change24h)}
			/>
			{!isSpot && (
				<>
					<StatBlock label={t`ORACLE`} value={formatUSD(oraclePx)} />
					<StatBlock label={t`24H VOL`} value={formatUSD(dayNtlVlm, compactUsd)} />
					<StatBlock label={t`OPEN INT`} value={formatUSD(oiUsd, compactUsd)} />
					<StatBlock
						label={t`FUNDING`}
						tooltip={<FundingTooltipContent fundingNum={fundingNum} />}
						value={formatPercent(fundingNum, { minimumFractionDigits: 4, signDisplay: "exceptZero" })}
						valueClass={getValueColorClass(fundingNum)}
					/>
				</>
			)}
			{isSpot && <StatBlock label={t`24H VOL`} value={formatUSD(dayNtlVlm, compactUsd)} />}
			{spotTokenAddress && (
				<StatBlock
					label={t`TOKEN`}
					value={
						<a
							href={getExplorerTokenUrl(spotTokenAddress)}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 text-fg transition-colors hover:text-brand"
						>
							{shortenAddress(spotTokenAddress, 4, 4)}
							<ArrowSquareOutIcon className="size-3 shrink-0 text-fg-muted" aria-hidden="true" />
						</a>
					}
				/>
			)}
			<MoodSlot />
		</div>
	);
}
