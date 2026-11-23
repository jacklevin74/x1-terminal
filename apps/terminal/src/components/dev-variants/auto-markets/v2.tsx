import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { AssetDisplay } from "@/components/trade/components/asset-display";
import { DemoCard } from "./card";
import { ALL_MARKETS, type MarketsProps, shortName } from "./data";

export default function V2({ selected, onToggle }: MarketsProps) {
	const [adding, setAdding] = useState(false);
	const rest = ALL_MARKETS.filter((m) => !selected.includes(m));
	return (
		<>
			<DemoCard />
			<div className="flex flex-col gap-2">
				<span className="text-xs text-fg-muted">Markets · {selected.length}</span>
				<div className="flex flex-wrap gap-1.5">
					{selected.map((coin) => (
						<button
							key={coin}
							type="button"
							onClick={() => onToggle(coin)}
							className="group inline-flex h-7 items-center gap-1.5 rounded-full bg-control pr-2 pl-1 text-xs transition-colors hover:bg-control-hover"
						>
							<AssetDisplay coin={coin} hideName iconClassName="size-5" />
							{shortName(coin)}
							<XIcon className="size-3 text-fg-muted group-hover:text-fg" />
						</button>
					))}
					<button
						type="button"
						onClick={() => setAdding((a) => !a)}
						className="inline-flex h-7 items-center gap-1 rounded-full bg-control-hover px-2.5 text-xs font-medium"
					>
						<PlusIcon weight="bold" className="size-3" />
						Add
					</button>
				</div>
				{adding && rest.length > 0 && (
					<div className="flex flex-wrap gap-1.5 rounded-8 bg-control p-2">
						{rest.map((coin) => (
							<button
								key={coin}
								type="button"
								onClick={() => onToggle(coin)}
								className="inline-flex h-7 items-center gap-1.5 rounded-full bg-control-hover pr-2.5 pl-1 text-xs text-fg-secondary hover:text-fg"
							>
								<AssetDisplay coin={coin} hideName iconClassName="size-5" />
								{shortName(coin)}
							</button>
						))}
					</div>
				)}
			</div>
		</>
	);
}
