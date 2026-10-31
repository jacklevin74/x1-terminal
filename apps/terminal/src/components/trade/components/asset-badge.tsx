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
	buy: "bg-success",
	sell: "bg-error",
};

const pillClass =
	"inline-flex items-center gap-1.5 rounded-full border border-stroke-weak bg-fill-weak px-1.5 py-0.5 leading-none max-w-full";

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
			nameClassName={cn(appearance === "position" ? "text-xs font-bold leading-5" : appearance === "plain" ? "text-2xs font-medium text-fg" : "text-xs font-semibold leading-none text-fg", nameClassName)}
			subtitleClassName={cn("text-2xs leading-none text-fg-muted", subtitleClassName)}
		/>
	);

 const showLeverage = typeof leverage === "number" && Number.isFinite(leverage) && leverage > 0;
 const leverageLabel = showLeverage ? (
  <span className={cn("shrink-0 whitespace-nowrap text-xs font-medium tabular-nums", side === "buy" ? "text-success" : side === "sell" ? "text-error" : "text-fg-muted")}>
   {leverage}x
  </span>
 ) : null;

	const sideDot = side && appearance === "pill" ? (
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
    appearance === "position" && (side === "buy" ? "!text-success" : side === "sell" ? "!text-error" : "!text-fg"),
				"hover:bg-fill-hover active:bg-fill-press",
				className,
			)}
		>
			{sideDot}
			{display}
    {leverageLabel}
		</Button>
	);
}
