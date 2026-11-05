import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
	copied: boolean;
	idle: ReactNode;
	done: ReactNode;
}

export function CopySwapLabel({ copied, idle, done }: Props) {
	return (
		<span className="inline-grid justify-items-start">
			<span className={cn("col-start-1 row-start-1", copied && "invisible")}>{idle}</span>
			<span aria-hidden="true" className={cn("col-start-1 row-start-1", !copied && "invisible")}>
				{done}
			</span>
		</span>
	);
}
