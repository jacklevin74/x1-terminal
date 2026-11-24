import { ArrowLeftIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
	list: ReactNode;
	detail: ReactNode;
	pushed: boolean;
	onBack: () => void;
	listClassName: string;
	detailClassName: string;
}

export function TwoPane({ list, detail, pushed, onBack, listClassName, detailClassName }: Props) {
	return (
		<div className="flex min-h-0 flex-1 @max-3xl:flex-col">
			<div
				className={cn(
					"flex min-h-0 flex-col gap-2 pl-4 @max-3xl:w-full @max-3xl:flex-1 @max-3xl:pr-4",
					listClassName,
					pushed && "@max-3xl:hidden",
				)}
			>
				{list}
			</div>
			<div
				className={cn(
					"flex min-h-0 flex-col px-4 pb-4 @max-3xl:w-full @max-3xl:flex-1",
					detailClassName,
					!pushed && "@max-3xl:hidden",
				)}
			>
				{pushed && (
					<button
						type="button"
						onClick={onBack}
						className="mb-3 hidden shrink-0 items-center self-start gap-1.5 text-xs text-fg-muted hover:text-fg @max-3xl:flex"
					>
						<ArrowLeftIcon className="size-3.5" />
						All traders
					</button>
				)}
				{detail}
			</div>
		</div>
	);
}
