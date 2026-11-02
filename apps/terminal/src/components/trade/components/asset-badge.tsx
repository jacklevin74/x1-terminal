import { Button } from "@hypeterminal/ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Side } from "@/lib/trade/types";
import { AssetDisplay } from "./asset-display";

interface Props {
	appearance?: "pill" | "plain" | "position";
	coin: string;
	side?: Side;
	leverage?: number;
	onClick?: () => void;
	variant?: "short" | "full";
	subtitle?: ReactNode;
	iconUrl?: string;
	"aria-label"?: string;
	className?: string;
	nameClassName?: string;
	subtitleClassName?: string;
}

const sideDotClass: Record<Side, string> = {
	buy: "bg-market-up",
	sell: "bg-market-down",
};

const sideTextClass: Record<Side, string> = {
	buy: "text-market-up",
	sell: "text-market-down",
};

const sideImportantTextClass: Record<Side, string> = {
	buy: "!text-market-up",
	sell: "!text-market-down",
};

const nameClassByAppearance: Record<NonNullable<Props["appearance"]>, string> = {
	position: "text-xs font-medium leading-5",
	plain: "text-xs font-medium text-fg",
	pill: "text-xs font-medium leading-none text-fg",
};

const pillClass = "inline-flex items-center gap-1.5 rounded-4 bg-control px-1.5 py-0.5 leading-none max-w-full";

export function AssetBadge({
	appearance = "pill",
	coin,
	side,
	leverage,
	onClick,
	variant,
	subtitle,
	iconUrl,
	"aria-label": ariaLabel,
	className,
	nameClassName,
	subtitleClassName,
}: Props) {
	const assetClass = appearance !== "pill" ? "inline-flex items-center gap-1 leading-normal max-w-full" : pillClass;
	const display = (
		<AssetDisplay
			coin={coin}
			hideIcon={appearance === "position"}
			iconUrl={iconUrl}
			variant={variant}
			subtitle={subtitle}
			iconClassName="size-4"
			nameClassName={cn(nameClassByAppearance[appearance], nameClassName)}
			subtitleClassName={cn("text-xs leading-none text-fg-muted", subtitleClassName)}
		/>
	);

	const showLeverage = typeof leverage === "number" && Number.isFinite(leverage) && leverage > 0;
	const leverageLabel = showLeverage ? (
		<span
			className={cn(
				"shrink-0 whitespace-nowrap text-xs font-medium tabular-nums",
				side ? sideTextClass[side] : "text-fg-muted",
			)}
		>
			{leverage}x
		</span>
	) : null;

	const sideDot =
		side && appearance === "pill" ? (
			<span className={cn("size-1.5 shrink-0 rounded-full", sideDotClass[side])} aria-hidden="true" />
		) : null;

	if (!onClick) {
		return (
			<span className={cn(assetClass, className)}>
				{sideDot}
				{display}
				{leverageLabel}
			</span>
		);
	}

	return (
		<Button
			variant="ghost"
			intent="neutral"
			onClick={onClick}
			aria-label={showLeverage ? `${ariaLabel ?? coin}, ${leverage}x leverage` : ariaLabel}
			className={cn(
				assetClass,
				"h-auto min-h-0 font-normal text-fg",
				appearance !== "pill" && "!p-0 !border-0 !rounded-none !bg-transparent",
				appearance === "position" && (side ? sideImportantTextClass[side] : "!text-fg"),
				appearance === "pill" && "hover:bg-control-hover active:bg-control-hover",
				className,
			)}
		>
			{sideDot}
			{display}
			{leverageLabel}
		</Button>
	);
}
