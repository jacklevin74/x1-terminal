const MASK =
	"linear-gradient(to bottom, transparent 0, black 96px, black var(--horizon-y, 100%), transparent calc(var(--horizon-y, 100%) + 40px))";

export function ChartHorizonGlow() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 hidden mix-blend-screen md:dark:block"
			style={{ maskImage: MASK, WebkitMaskImage: MASK }}
		>
			<div className="absolute inset-x-0 top-0 h-(--horizon-y) opacity-20 blur-[56px]">
				<div className="absolute -bottom-10 left-1/2 h-36 w-[62%] -translate-x-1/2 rounded-[50%] bg-horizon-rim" />
				<div className="absolute -bottom-6 left-1/2 h-20 w-[38%] -translate-x-[46%] rounded-[50%] bg-horizon-blue" />
				<div className="absolute -bottom-2.5 left-1/2 h-8 w-[16%] -translate-x-[42%] rounded-[50%] bg-horizon-core" />
			</div>
			<div className="absolute left-1/2 top-(--horizon-y) h-px w-[68%] -translate-x-1/2 bg-linear-to-r from-transparent via-horizon-core to-transparent opacity-40" />
		</div>
	);
}
