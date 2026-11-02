import { cn } from "@/lib/cn";

interface Props {
	label: string;
}

const skeletonWidths = ["w-3/4", "w-1/2", "w-2/3", "w-2/5"];

export function LoadingRows({ label }: Props) {
	return (
		<output aria-live="polite" className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<span className="sr-only">{label}</span>
			<span aria-hidden="true" className="h-6 shrink-0" />
			{skeletonWidths.map((width) => (
				<span
					key={width}
					aria-hidden="true"
					className="flex h-7 shrink-0 items-center border-t border-stroke-faint px-3"
				>
					<span className={cn("h-3 rounded-4 bg-control animate-pulse motion-reduce:animate-none", width)} />
				</span>
			))}
		</output>
	);
}
