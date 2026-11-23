import { Icon as TerminalPromptIcon } from "@/components/trade/header/terminal-prompt-icon";
import { X1MarkWhite } from "./mark";

export default function X1TerminalLogo() {
	return (
		<span role="img" aria-label="X1 Terminal" className="inline-flex shrink-0 items-center gap-[9px] select-none">
			<TerminalPromptIcon size={26} />
			<span aria-hidden="true" data-part="word" className="inline-flex items-baseline gap-[5px] whitespace-nowrap">
				<X1MarkWhite height={11.4} style={{ alignSelf: "center" }} />
				<span
					className="font-wordmark text-wordmark leading-none font-normal tracking-[-0.01em] text-fg"
					style={{ fontStyle: "normal" }}
				>
					Terminal
				</span>
			</span>
		</span>
	);
}
