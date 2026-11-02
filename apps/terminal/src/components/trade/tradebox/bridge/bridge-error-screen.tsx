import { Button } from "@hypeterminal/ui";
import { Trans } from "@lingui/react/macro";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { StatusBadgeIcon } from "./shared-ui";

const BRIDGE_MESSAGE_MAX_WIDTH = "max-w-70";

interface Props {
	error: string;
	onBack: () => void;
	onRetry: () => void;
}

export function BridgeErrorScreen({ error, onBack, onRetry }: Props) {
	return (
		<div className="flex flex-1 flex-col items-center">
			<div className="flex flex-1 flex-col items-center justify-center gap-4">
				<StatusBadgeIcon>
					<WarningCircleIcon className="size-6 text-market-down" />
				</StatusBadgeIcon>
				<div className="space-y-1 text-center">
					<p className="text-base font-medium text-fg">
						<Trans>Bridge failed</Trans>
					</p>
					<p className={`text-xs text-fg-muted ${BRIDGE_MESSAGE_MAX_WIDTH}`}>{error}</p>
				</div>
			</div>
			<div className="mt-auto flex w-full gap-2">
				<Button variant="secondary" intent="neutral" size="md" className="flex-1" onClick={onBack}>
					<Trans>Back</Trans>
				</Button>
				<Button variant="filled" intent="neutral" size="md" className="flex-1" onClick={onRetry}>
					<Trans>Try Again</Trans>
				</Button>
			</div>
		</div>
	);
}
