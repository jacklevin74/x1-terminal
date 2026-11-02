import { Tooltip } from "@hypeterminal/ui";
import type { ReactElement } from "react";
import { getTooltip, type TooltipId } from "@/config/tooltips";

interface Props {
	topic: TooltipId;
	only?: readonly string[];
	side?: "top" | "bottom" | "left" | "right";
	align?: "start" | "center" | "end";
	children: ReactElement;
}

export function DefinitionTooltip({ topic, only, side = "top", align, children }: Props) {
	const content = getTooltip(topic, { only });
	return (
		<Tooltip
			side={side}
			align={align}
			underline
			content={
				<div className="flex max-w-xs flex-col gap-2">
					<div className="font-medium">{content.title}</div>
					{content.items.map((item) => (
						<div key={item.key}>
							<span className="font-medium">{item.term}:</span>{" "}
							<span className="text-fg-secondary">{item.definition}</span>
						</div>
					))}
				</div>
			}
		>
			{children}
		</Tooltip>
	);
}
