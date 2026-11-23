import { X1Tile } from "@/components/trade/header/x1-terminal-logo";
import { Lettering } from "./letters";

export function Logo() {
	return (
		<span
			role="img"
			aria-label="X1 Terminal"
			className="inline-flex shrink-0 items-center select-none text-fg"
			style={{ gap: 10 }}
		>
			<X1Tile size={26} />
			<Lettering height={11} weight={17} width={1.12} stencil={7} gap={15} />
		</span>
	);
}
