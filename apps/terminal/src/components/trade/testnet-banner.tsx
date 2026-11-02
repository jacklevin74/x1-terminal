import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { WarningIcon } from "@phosphor-icons/react";
import { APP_BANNER_HEIGHT_CLASS } from "@/config/layout";
import { cn } from "@/lib/cn";
import { useGlobalSettingsActions, useIsTestnet } from "@/stores/use-global-settings-store";

export function TestnetBanner() {
	const isTestnet = useIsTestnet();
	const { setNetwork } = useGlobalSettingsActions();

	if (!isTestnet) return null;

	return (
		<div
			className={cn(
				APP_BANNER_HEIGHT_CLASS,
				"fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 bg-warning px-3 text-xs font-medium text-fg-inverse",
			)}
		>
			<WarningIcon className="size-4 shrink-0" weight="fill" />
			<span className="truncate">{t`You are on Testnet`}</span>
			<Button variant="filled" intent="inverse" size="xxs" onClick={() => setNetwork("mainnet")} className="px-2">
				{t`Switch to Mainnet`}
			</Button>
		</div>
	);
}
