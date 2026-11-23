import { PALETTES } from "./palettes";
import { Preview } from "./preview";

export function MarketColorsGallery() {
	return (
		<div className="dark min-h-dvh bg-background px-8 py-8 font-sans text-fg">
			<div className="mx-auto flex max-w-[1200px] flex-col gap-10">
				{PALETTES.map((p) => (
					<section key={p.n} className="flex flex-col gap-3" data-variant={p.n}>
						<div className="flex items-center gap-3 text-sm">
							<span className="rounded-full bg-fill px-2 py-0.5 text-xs font-semibold text-fg-inverse">{p.n}</span>
							<span className="text-fg">{p.name}</span>
							<span className="text-fg-muted">{p.note}</span>
						</div>
						<Preview p={p} />
					</section>
				))}
			</div>
		</div>
	);
}
