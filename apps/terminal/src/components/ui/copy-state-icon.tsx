import { t } from "@lingui/core/macro";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

interface Props {
	copied: boolean;
	announcement?: string;
	inheritColor?: boolean;
	className?: string;
}

const LAYER =
	"absolute inset-0 size-full transition-[opacity,scale,filter] duration-150 ease-out motion-reduce:transition-none";

export function CopyStateIcon({ copied, announcement, inheritColor = false, className }: Props) {
	return (
		<>
			<span aria-hidden="true" className={cn("relative inline-block size-4 shrink-0", className)}>
				<CopyIcon
					className={cn(
						LAYER,
						!inheritColor && "text-fg-muted",
						copied ? "scale-50 opacity-0 blur-[2px]" : "scale-100 opacity-100",
					)}
				/>
				<CheckIcon
					weight="bold"
					className={cn(
						LAYER,
						!inheritColor && "text-fg",
						copied ? "scale-100 opacity-100" : "scale-50 opacity-0 blur-[2px]",
					)}
				/>
			</span>
			<output className="sr-only">{copied ? (announcement ?? t`Copied`) : ""}</output>
		</>
	);
}
