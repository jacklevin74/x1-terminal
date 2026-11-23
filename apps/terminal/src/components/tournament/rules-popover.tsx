import { InfoIcon } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type Tier, usd } from "./data";

const PLACES = ["1st", "2nd", "3rd"];

interface Props {
	tier: Tier;
}

export function RulesPopover({ tier }: Props) {
	return (
		<Popover>
			<PopoverTrigger className="flex h-8 items-center gap-1.5 rounded-8 px-2 text-xs text-fg-muted transition-colors hover:bg-control hover:text-fg">
				<InfoIcon className="size-4" />
				How it works
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 p-4">
				<dl className="flex flex-col gap-2 text-xs tabular-nums">
					<Line label="Ranking" value="Dollar PNL in the round" />
					<Line label="Round length" value="7 days" />
					<Line label="High table" value="Over $1M volume" />
					<Line label="Low table" value="Under $1M volume" />
				</dl>
				<div className="mt-4 text-xs text-fg-muted">Prizes at the {tier.label.toLowerCase()}</div>
				<dl className="mt-2 flex flex-col gap-2 text-xs tabular-nums">
					{tier.payouts.map((amount, i) => (
						<Line key={PLACES[i]} label={PLACES[i]} value={usd(amount)} />
					))}
				</dl>
			</PopoverContent>
		</Popover>
	);
}

function Line({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4">
			<dt className="text-fg-muted">{label}</dt>
			<dd className="text-fg">{value}</dd>
		</div>
	);
}
