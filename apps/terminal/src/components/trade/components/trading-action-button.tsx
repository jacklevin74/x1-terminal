import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import type { ComponentProps, ReactNode } from "react";
import { useTradingGuard } from "@/lib/hyperliquid";

type ButtonProps = ComponentProps<typeof Button>;

interface Props extends Omit<ButtonProps, "onClick"> {
	onClick: () => void | Promise<void>;
	children: ReactNode;
}

function getLabel(isEnabling: boolean, showEnableTrading: boolean, children: ReactNode) {
	if (isEnabling) {
		return (
			<>
				<SpinnerGapIcon className="size-3 animate-spin" />
				{t`Enabling`}
			</>
		);
	}
	if (showEnableTrading) return t`Enable`;
	return children;
}

export function TradingActionButton({
	onClick,
	children,
	disabled,
	className,
	variant = "filled",
	intent = "neutral",
	...buttonProps
}: Props) {
	const { isReady, isEnabling, needsTrading, guardAction } = useTradingGuard();

	function runGuardedAction() {
		guardAction(onClick);
	}

	const showEnableTrading = needsTrading && !isEnabling;

	return (
		<div className="flex flex-col items-end gap-1">
			<Button
				{...buttonProps}
				variant={showEnableTrading ? "filled" : variant}
				intent={showEnableTrading ? "brand" : intent}
				onClick={runGuardedAction}
				disabled={disabled || isEnabling || (!isReady && !needsTrading)}
				className={className}
			>
				{getLabel(isEnabling, showEnableTrading, children)}
			</Button>
		</div>
	);
}
