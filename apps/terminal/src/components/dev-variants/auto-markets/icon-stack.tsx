import { AssetDisplay } from "@/components/trade/components/asset-display";

export function IconStack({ coins, max = 4, size = "size-5" }: { coins: string[]; max?: number; size?: string }) {
	const shown = coins.slice(0, max);
	return (
		<span className="flex items-center">
			{shown.map((coin, i) => (
				<span
					key={coin}
					className="rounded-full ring-2 ring-control"
					style={{ marginLeft: i ? -6 : 0, zIndex: max - i }}
				>
					<AssetDisplay coin={coin} hideName iconClassName={size} />
				</span>
			))}
		</span>
	);
}
