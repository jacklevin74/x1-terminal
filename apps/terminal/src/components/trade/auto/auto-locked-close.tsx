import { Button, Tooltip } from "@hypeterminal/ui";
import { LockSimpleIcon } from "@phosphor-icons/react";
import { type ReactElement, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAutoManaged } from "@/hooks/use-auto-managed";
import { cn } from "@/lib/cn";

interface Props {
	label: string;
	coin: string | null;
	trigger?: ReactElement;
	className?: string;
}

function lockBody(coin: string | null) {
	const what = coin ? `${coin} by hand` : "positions by hand";
	return `Auto Trader is on. If you close ${what} now, it will likely reopen the position right after.`;
}

export function AutoLockedClose({ label, coin, trigger, className }: Props) {
	const [on, setOn] = useState(false);
	const auto = useAutoManaged();

	async function pause() {
		if (await auto.pause()) setOn(false);
	}

	return (
		<Popover open={on} onOpenChange={setOn}>
			<Tooltip side="top" content="Locked while Auto Trader is on" open={on ? false : undefined}>
				<span className={cn("inline-flex", className)}>
					<PopoverTrigger
						render={
							trigger ?? (
								<Button
									variant="secondary"
									intent="neutral"
									size="xs"
									className={cn("pr-2 text-fg-muted", on && "bg-control-hover text-fg")}
								/>
							)
						}
						aria-label={`${label} locked while Auto Trader is on`}
					>
						{label}
						<LockSimpleIcon className="size-3 text-fg-disabled" weight="fill" />
					</PopoverTrigger>
				</span>
			</Tooltip>
			<PopoverContent side="bottom" align="end" sideOffset={6} className="w-80 p-0">
				<div className="flex flex-col gap-1 p-3 pb-2">
					<span className="flex items-center gap-1.5 text-sm font-medium">
						<LockSimpleIcon className="size-3.5 text-fg-muted" weight="fill" />
						Turn off Auto Trader first
					</span>
					<span className="text-xs text-fg-secondary">{lockBody(coin)}</span>
				</div>
				<div className="flex gap-2 p-3 pt-2">
					<Button
						variant="filled"
						intent="neutral"
						size="sm"
						className="flex-1"
						disabled={auto.pausing}
						onClick={() => void pause()}
					>
						Pause Auto Trader
					</Button>
					<Button variant="secondary" intent="neutral" size="sm" onClick={() => setOn(false)}>
						Not now
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
