import type * as React from "react";
import { cn } from "@/lib/cn";

export const labelTypographyClass = "text-2xs font-normal uppercase tracking-micro text-fg-muted";
export const inlineLabelTypographyClass = "text-xs font-normal text-fg-muted";

interface Props {
	htmlFor?: string;
	className?: string;
	children: React.ReactNode;
}

export function FieldLabel({ htmlFor, className, children }: Props) {
	const Tag = htmlFor ? "label" : "span";
	return (
		<Tag htmlFor={htmlFor} className={cn(labelTypographyClass, className)}>
			{children}
		</Tag>
	);
}
