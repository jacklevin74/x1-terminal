import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "./utils";

const tableVariants = cva(["w-full caption-bottom border-collapse"], {
	variants: {
		variant: {
			default: "",
			striped: "[&_tbody>tr:nth-child(odd)]:bg-band",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const tableHeadVariants = cva(
	[
		"text-left align-middle text-2xs font-normal uppercase tracking-micro text-fg-muted whitespace-nowrap",
		"first:pl-3 last:pr-3",
	],
	{
		variants: {
			size: {
				default: "h-6 px-2",
				dense: "h-6 px-2",
				picker: "h-6 px-2",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

const tableCellVariants = cva(["align-middle text-xs font-normal text-fg tabular-nums first:pl-3 last:pr-3"], {
	variants: {
		size: {
			default: "h-7 px-2",
			dense: "h-7 px-2",
			picker: "h-10 px-2",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

interface TableProps extends React.HTMLAttributes<HTMLTableElement>, VariantProps<typeof tableVariants> {}

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, variant, ...props }, ref) => (
	<div className="w-full overflow-x-auto">
		<table className={cn(tableVariants({ variant, className }))} ref={ref} {...props} />
	</div>
));
Table.displayName = "Table";

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
	band?: boolean;
}

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
	({ className, band = false, ...props }, ref) => (
		<thead className={cn(band && "bg-band", className)} ref={ref} {...props} />
	),
);
TableHeader.displayName = "TableHeader";

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(({ className, ...props }, ref) => (
	<tbody
		className={cn(
			"[&_tr]:border-t [&_tr]:border-stroke-faint [&_tr]:transition-colors [&_tr:hover]:bg-control/50",
			className,
		)}
		ref={ref}
		{...props}
	/>
));
TableBody.displayName = "TableBody";

interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(({ className, ...props }, ref) => (
	<tfoot className={cn("border-t border-stroke-weak font-medium text-fg", className)} ref={ref} {...props} />
));
TableFooter.displayName = "TableFooter";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(({ className, ...props }, ref) => (
	<tr className={cn(className)} ref={ref} {...props} />
));
TableRow.displayName = "TableRow";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement>, VariantProps<typeof tableHeadVariants> {}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(({ className, size, ...props }, ref) => (
	<th className={cn(tableHeadVariants({ size, className }))} ref={ref} {...props} />
));
TableHead.displayName = "TableHead";

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement>, VariantProps<typeof tableCellVariants> {}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(({ className, size, ...props }, ref) => (
	<td className={cn(tableCellVariants({ size, className }))} ref={ref} {...props} />
));
TableCell.displayName = "TableCell";

interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {}

const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(({ className, ...props }, ref) => (
	<caption className={cn("mt-4 text-xs text-fg-muted", className)} ref={ref} {...props} />
));
TableCaption.displayName = "TableCaption";

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableRow,
	TableHead,
	TableCell,
	TableCaption,
	tableVariants,
	tableHeadVariants,
	tableCellVariants,
};
export type {
	TableProps,
	TableHeaderProps,
	TableBodyProps,
	TableFooterProps,
	TableRowProps,
	TableHeadProps,
	TableCellProps,
	TableCaptionProps,
};
