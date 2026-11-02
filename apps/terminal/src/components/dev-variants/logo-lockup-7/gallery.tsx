import type { CSSProperties, ComponentType } from "react";
import V1, { FONT_NAME as F1, NAME as N1 } from "./v1";
import V2, { FONT_NAME as F2, NAME as N2 } from "./v2";
import V3, { FONT_NAME as F3, NAME as N3 } from "./v3";
import V4, { FONT_NAME as F4, NAME as N4 } from "./v4";

const FONTS_HREF =
	"https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..700&display=swap";

const VARIANTS: { Logo: ComponentType; name: string; font: string }[] = [
	{ Logo: V1, name: N1, font: F1 },
	{ Logo: V2, name: N2, font: F2 },
	{ Logo: V3, name: N3, font: F3 },
	{ Logo: V4, name: N4, font: F4 },
];

const LIGHT_TOKENS = {
	"--text-strong": "#000626e5",
	"--text-weak": "#000933a6",
	"--stroke-weak": "#0011661a",
	"--fill-control": "#eceef3",
	background: "#ffffff",
} as CSSProperties;

function NavMock({ Logo }: { Logo: ComponentType }) {
	return (
		<div className="flex h-11 items-center gap-4 px-3">
			<span>
				<Logo />
			</span>
			<span className="h-4 w-px bg-stroke-weak" />
			<span className="flex items-center gap-1 text-xs">
				<span className="rounded-8 bg-control px-2.5 py-1 text-fg">All</span>
				<span className="px-2.5 py-1 text-fg-muted">Perp</span>
				<span className="px-2.5 py-1 text-fg-muted">Spot</span>
				<span className="px-2.5 py-1 text-fg-muted">Builders</span>
			</span>
		</div>
	);
}

export function LogoLockup7Gallery() {
	if (!import.meta.env.DEV) return null;
	return (
		<main className="min-h-dvh bg-background text-fg">
			<link rel="stylesheet" href={FONTS_HREF} />
			<header className="px-6 py-8">
				<h1 className="text-xl font-semibold">X1 Terminal logo lockups, round 7</h1>
				<p className="text-sm text-fg-muted">Each row shows the nav at real size (dark and light) and a large preview.</p>
			</header>
			<div className="flex flex-col gap-3 px-6 pb-16">
				{VARIANTS.map(({ Logo, name, font }, index) => (
					<section key={name} className="relative grid gap-3 rounded-12 bg-surface p-4 lg:grid-cols-[1fr_1fr]">
						<div className="flex items-center gap-2 lg:col-span-2">
							<span className="rounded-full bg-fg px-2.5 py-1 text-sm font-bold text-background">#{index + 1}</span>
							<span className="text-sm font-semibold">{name}</span>
							<span className="text-xs text-fg-muted">{font}</span>
						</div>
						<div className="flex flex-col gap-2">
							<div className="rounded-8 bg-background">
								<NavMock Logo={Logo} />
							</div>
							<div className="rounded-8" style={LIGHT_TOKENS}>
								<NavMock Logo={Logo} />
							</div>
						</div>
						<div data-preview className="flex min-h-16 items-center justify-center rounded-8 bg-background" style={{ zoom: 3 }}>
							<Logo />
						</div>
					</section>
				))}
			</div>
		</main>
	);
}
