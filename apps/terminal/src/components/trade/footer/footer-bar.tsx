import { Button, Divider } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { GithubLogoIcon } from "@phosphor-icons/react";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { APP_VERSION, GITHUB_URL } from "@/config/app";
import { APP_FOOTER_HEIGHT_CLASS } from "@/config/layout";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { type ApiStatus, useApiStatus } from "@/lib/hyperliquid";
import { useCommandMenuActions } from "@/stores/use-global-modal-store";

function getStatusDisplay(status: ApiStatus) {
	switch (status) {
		case "connected":
			return { dotClass: "bg-success", text: t`Connected` };
		case "connecting":
			return { dotClass: "bg-warning animate-pulse motion-reduce:animate-none", text: t`Connecting` };
		case "error":
			return { dotClass: "bg-error", text: t`Disconnected` };
		default:
			return { dotClass: "bg-fg-disabled", text: t`Offline` };
	}
}

function FooterClock() {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const interval = window.setInterval(() => setNow(new Date()), 1_000);
		return () => window.clearInterval(interval);
	}, []);

	return <span className="tabular-nums">{formatTime(now)}</span>;
}

export function FooterBar() {
	const { status } = useApiStatus();
	const { dotClass, text } = getStatusDisplay(status);
	const { open } = useCommandMenuActions();

	return (
		<footer
			className={cn(
				APP_FOOTER_HEIGHT_CLASS,
				"fixed right-0 bottom-0 left-0 z-40 flex items-center justify-between border-t border-stroke-weak bg-background px-3 text-2xs font-normal uppercase tracking-micro text-fg-muted",
			)}
		>
			<div className="flex min-w-0 items-center gap-2">
				<span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dotClass)} />
				<span>{text}</span>
			</div>
			<Button
				variant="secondary"
				intent="neutral"
				size="xxs"
				onClick={open}
				className="absolute left-1/2 -translate-x-1/2 text-fg-muted hover:text-fg"
				aria-label={t`Open command menu`}
			>
				<kbd className="pointer-events-none font-sans tracking-normal tabular-nums">{"⌘K"}</kbd>
			</Button>
			<div className="flex shrink-0 items-center gap-3">
				<a
					href={GITHUB_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-1 rounded-4 transition-colors duration-150 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus"
					aria-label="GitHub"
				>
					<GithubLogoIcon className="size-3" aria-hidden />
					<span>Built on HypeTerminal</span>
				</a>
				<Divider orientation="vertical" className="h-3 self-center" />
				<ClientOnly>
					<FooterClock />
				</ClientOnly>
				<Divider orientation="vertical" className="h-3 self-center" />
				<span className="tabular-nums">{APP_VERSION}</span>
			</div>
		</footer>
	);
}
