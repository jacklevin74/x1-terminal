import { CheckIcon, InfoIcon, SpinnerGapIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { TOAST_DEFAULT_DURATION_MS } from "@/config/time";
import { cn } from "@/lib/cn";
import { useTheme } from "@/stores/use-global-settings-store";

const RING = 2 * Math.PI * 13;

function RingIcon({ children, drain, tone }: { children: ReactNode; drain?: boolean; tone: string }) {
	return (
		<span className="relative flex size-8 shrink-0 items-center justify-center">
			<svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90" aria-hidden="true">
				<circle cx="16" cy="16" r="13" fill="none" strokeWidth="2" className="stroke-control" />
				{drain && (
					<circle
						cx="16"
						cy="16"
						r="13"
						fill="none"
						strokeWidth="2"
						strokeLinecap="round"
						strokeDasharray={RING}
						className={cn(
							"animate-ring-drain group-hover/toaster:[animation-play-state:paused]",
							tone === "text-market-up" ? "stroke-market-up" : "stroke-fg-muted",
						)}
						style={{ animationDuration: `${TOAST_DEFAULT_DURATION_MS}ms`, ["--ring" as string]: RING }}
					/>
				)}
			</svg>
			<span className={tone}>{children}</span>
		</span>
	);
}

function Toaster(props: ToasterProps) {
	const theme = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group/toaster"
			position="bottom-right"
			expand
			gap={8}
			duration={TOAST_DEFAULT_DURATION_MS}
			icons={{
				success: (
					<RingIcon drain tone="text-market-up">
						<CheckIcon className="size-4" weight="bold" />
					</RingIcon>
				),
				info: (
					<RingIcon drain tone="text-fg-muted">
						<InfoIcon className="size-4" weight="bold" />
					</RingIcon>
				),
				warning: (
					<RingIcon drain tone="text-fg-muted">
						<WarningIcon className="size-4" weight="bold" />
					</RingIcon>
				),
				error: (
					<RingIcon tone="text-market-down">
						<XIcon className="size-4" weight="bold" />
					</RingIcon>
				),
				loading: (
					<RingIcon tone="text-fg-muted">
						<SpinnerGapIcon className="size-4 animate-spin" />
					</RingIcon>
				),
			}}
			toastOptions={{
				unstyled: true,
				classNames: {
					toast:
						"right-0 flex w-fit max-w-[min(360px,calc(100vw-48px))] items-center gap-3 rounded-full bg-black py-2 pr-5 pl-2 font-sans shadow-menu has-[[data-description]]:rounded-[22px]",
					icon: "!relative !m-0 !size-8 !shrink-0 [&_.sonner-loader]:!static [&_.sonner-loader]:![transform:none]",
					content: "flex min-w-0 flex-col",
					title: "text-sm text-fg",
					description: "text-xs text-fg-muted tabular-nums",
					error: "[&_[data-title]]:text-market-down",
				},
			}}
			style={{ "--width": "360px" } as React.CSSProperties}
			{...props}
		/>
	);
}

export { Toaster };
