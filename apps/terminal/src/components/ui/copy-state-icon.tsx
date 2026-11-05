import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

interface Props {
	copied: boolean;
	className?: string;
}

const LAYER =
	"absolute inset-0 size-full transition-[opacity,scale,filter] duration-150 ease-out motion-reduce:transition-none";

export function CopyStateIcon({ copied, className }: Props) {
	return (
		<span aria-hidden="true" className={cn("relative inline-block size-4 shrink-0", className)}>
			<CopyIcon
				className={cn(LAYER, "text-fg-muted", copied ? "scale-50 opacity-0 blur-[2px]" : "scale-100 opacity-100")}
			/>
			<CheckIcon
				weight="bold"
				className={cn(LAYER, "text-fg", copied ? "scale-100 opacity-100" : "scale-50 opacity-0 blur-[2px]")}
			/>
		</span>
	);
}
