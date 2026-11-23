import { X1Mark } from "@/components/trade/header/x1-terminal-logo";
import { Lettering } from "./letters";

export function Logo() {
	return (
		<span
			role="img"
			aria-label="X1 Terminal"
			className="inline-flex shrink-0 items-center select-none text-fg"
			style={{ gap: 12 }}
		>
			<X1Mark className="block shrink-0" style={{ height: 14, width: 21.53 }} />
			<Lettering height={14} weight={7} width={1.25} gap={24} aBar={false} />
		</span>
	);
}
