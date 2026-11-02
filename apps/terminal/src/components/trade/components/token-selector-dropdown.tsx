import { Dropdown, type DropdownItem } from "@hypeterminal/ui";
import { cn } from "@/lib/cn";
import { formatToken } from "@/lib/format";
import type { SpotToken } from "@/lib/hyperliquid/markets";
import { AssetDisplay } from "./asset-display";

interface Props {
	tokens: SpotToken[];
	selectedToken: string;
	onSelect: (token: string) => void;
	getBalance: (token: string) => number;
	disabled?: boolean;
	className?: string;
	ariaLabel?: string;
}

export function TokenSelectorDropdown({
	tokens,
	selectedToken,
	onSelect,
	getBalance,
	disabled,
	className,
	ariaLabel = "Select token",
}: Props) {
	const selected = tokens.find((t) => t.name === selectedToken);

	const items: DropdownItem[] = tokens.map((token) => {
		const balance = getBalance(token.name);
		return {
			label: `${token.name}  ${formatToken(balance, 4)}`,
			icon: <AssetDisplay coin={token.name} hideName iconClassName="size-4" />,
			active: token.name === selectedToken,
			onSelect: () => onSelect(token.name),
		};
	});

	return (
		<Dropdown
			items={items}
			disabled={disabled}
			align="end"
			triggerVariant="minimal"
			triggerAriaLabel={`${ariaLabel}: ${selected?.displayName ?? selectedToken}`}
			triggerClassName="text-fg"
			trigger={
				<span className={cn("inline-flex items-center gap-1", className)}>
					{selected ? (
						<AssetDisplay coin={selected.name} iconClassName="size-4" nameClassName="text-xs font-medium" />
					) : (
						<span className="text-xs font-medium">{selectedToken}</span>
					)}
				</span>
			}
		/>
	);
}
