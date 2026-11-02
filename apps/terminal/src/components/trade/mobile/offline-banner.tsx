import { Button, ButtonIcon } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowClockwiseIcon, WifiHighIcon, WifiSlashIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/hooks/use-mobile";
import { cn } from "@/lib/cn";

interface Props {
	className?: string;
}

export function OfflineBanner({ className }: Props) {
	const isOnline = useOnlineStatus();
	const [dismissed, setDismissed] = useState(false);
	const [showReconnected, setShowReconnected] = useState(false);
	const wasOfflineRef = useRef(false);

	useEffect(() => {
		if (!isOnline) {
			wasOfflineRef.current = true;
			setDismissed(false);
			setShowReconnected(false);
			return;
		}

		if (!wasOfflineRef.current) return;

		setShowReconnected(true);
		const timer = setTimeout(() => {
			setShowReconnected(false);
			wasOfflineRef.current = false;
		}, 3000);

		return () => clearTimeout(timer);
	}, [isOnline]);

	if (isOnline && !showReconnected) return null;
	if (!isOnline && dismissed) return null;

	return (
		<div
			role="alert"
			aria-live="polite"
			className={cn(
				"shrink-0 min-h-10 px-3 py-1",
				"flex items-center justify-between gap-2",
				"text-xs font-medium text-fg-inverse",
				isOnline ? "bg-success" : "bg-warning",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				{isOnline ? (
					<>
						<WifiHighIcon className="size-4" />
						<span>
							<Trans>Back online</Trans>
						</span>
					</>
				) : (
					<>
						<WifiSlashIcon className="size-4" />
						<span>
							<Trans>You're offline</Trans>
						</span>
					</>
				)}
			</div>

			{!isOnline && (
				<div className="flex items-center gap-1">
					<Button
						variant="secondary"
						intent="inverse"
						size="sm"
						onClick={() => window.location.reload()}
						iconLeft={<ArrowClockwiseIcon className="size-3.5" />}
					>
						<Trans>Retry</Trans>
					</Button>
					<ButtonIcon
						variant="ghost"
						intent="inverse"
						size="sm"
						onClick={() => setDismissed(true)}
						aria-label={t`Dismiss`}
					>
						<XIcon className="size-4" />
					</ButtonIcon>
				</div>
			)}
		</div>
	);
}
