import X1TerminalLogo from "@/components/trade/header/x1-terminal-logo";
import V1 from "./v1";
import V2 from "./v2";

const FONT_CSS = `@font-face{font-family:"Aeonik Pro";src:url("/dev-refs/logo-x1mark/AeonikPro-RegularItalic.otf") format("opentype");font-weight:400;font-style:italic;font-display:block}`;

const variants = [
	{ Logo: X1TerminalLogo, title: "Current", note: "X1 set in Aeonik Pro bold." },
	{ Logo: V1, title: "#1 White X1 mark", note: "The real X1 mark in solid white. Terminal in Aeonik Pro regular." },
	{ Logo: V2, title: "#2 White X1 mark, italic Terminal", note: "Same mark. Terminal in Aeonik Pro regular italic." },
];

function NavStrip({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-12 w-[420px] items-center gap-6 border-b border-stroke-weak bg-background px-4">
			{children}
			<span className="flex items-center gap-7 text-xs font-medium">
				<span className="text-fg">Trade</span>
				<span className="text-fg-muted">Tournament</span>
			</span>
		</div>
	);
}

export function LogoX1MarkGallery() {
	return (
		<div className="min-h-screen bg-background p-6 text-fg">
			<style>{FONT_CSS}</style>
			<div className="flex flex-col gap-10">
				{variants.map(({ Logo, title, note }) => (
					<section key={title} data-variant={title} className="flex flex-col gap-3">
						<div className="flex flex-col gap-1">
							<h2 className="text-sm font-medium">{title}</h2>
							<p className="text-xs text-fg-muted">{note}</p>
						</div>
						<NavStrip>
							<Logo />
						</NavStrip>
						<div className="origin-top-left scale-[3] pt-2 pl-2 h-[110px]">
							<Logo />
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
