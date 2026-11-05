import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "./utils";

const sliderVariants = cva([
	"flex w-full touch-none select-none flex-col gap-2",
	"data-disabled:cursor-not-allowed",
	"[--slider-thumb:14px] max-md:[--slider-thumb:20px]",
]);

type SliderThumbSize = "sm" | "md" | "lg";
type SliderTone = "brand" | "up" | "down";

interface SliderProps
	extends Omit<React.ComponentPropsWithoutRef<typeof BaseSlider.Root>, "className">,
		VariantProps<typeof sliderVariants> {
	className?: string;
	label?: string;
	showValue?: boolean;
	thumbSize?: SliderThumbSize;
	tone?: SliderTone;
	marks?: readonly number[];
	onMarkSelect?: (value: number) => void;
}

const rangeToneClasses: Record<SliderTone, string> = {
	brand: "bg-brand",
	up: "bg-market-up",
	down: "bg-market-down",
};

function getFirstValue(value: number | readonly number[] | undefined) {
	if (value == null) return 0;
	if (typeof value === "number") return value;
	return value[0] ?? 0;
}

function getMarkPercent(mark: number, min: number, max: number) {
	if (max <= min) return 0;
	return ((mark - min) / (max - min)) * 100;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
	({ className, label, showValue, thumbSize = "md", tone = "brand", marks, onMarkSelect, disabled, ...props }, ref) => {
		const val = props.value ?? props.defaultValue;
		const thumbCount = Array.isArray(val) ? val.length : 1;
		const thumbIndexes = Array.from({ length: thumbCount }, (_, thumbIndex) => thumbIndex);
		const min = props.min ?? 0;
		const max = props.max ?? 100;
		const current = getFirstValue(val);

		return (
			<BaseSlider.Root
				ref={ref}
				thumbAlignment="edge"
				disabled={disabled}
				className={cn(sliderVariants({ className }))}
				data-thumb-size={thumbSize}
				{...props}
			>
				{(label || showValue) && (
					<div className="flex items-center gap-4">
						{label && <BaseSlider.Label className="flex-1 text-xs font-normal text-fg-muted">{label}</BaseSlider.Label>}
						{showValue && <BaseSlider.Value className="text-xs font-normal text-fg tabular-nums" />}
					</div>
				)}
				<BaseSlider.Control className="relative flex h-5 max-md:h-11 w-full items-center">
					<BaseSlider.Track className="relative h-1 w-full rounded-full bg-control">
						<BaseSlider.Indicator
							className={cn("absolute inset-y-0 rounded-full", disabled ? "bg-fg-disabled" : rangeToneClasses[tone])}
						/>
						{marks?.map((mark) => {
							const percent = getMarkPercent(mark, min, max);
							const reached = mark <= current;
							const underThumb = Math.abs(mark - current) <= (max - min) * 0.02;
							const dotClass = cn(
								"absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
								reached && !disabled ? rangeToneClasses[tone] : "bg-fg-disabled",
								underThumb && "invisible",
							);
							const style = {
								left: `calc(var(--slider-thumb) / 2 + (100% - var(--slider-thumb)) * ${percent / 100})`,
							};
							if (!onMarkSelect) {
								return <span key={mark} aria-hidden="true" className={dotClass} style={style} />;
							}
							return (
								<button
									key={mark}
									type="button"
									tabIndex={-1}
									aria-label={`${mark}`}
									disabled={disabled}
									onPointerDown={(event) => event.stopPropagation()}
									onClick={() => onMarkSelect(mark)}
									className={cn(
										dotClass,
										"z-10 cursor-pointer after:absolute after:-inset-1.5 after:content-[''] disabled:cursor-not-allowed",
									)}
									style={style}
								/>
							);
						})}
					</BaseSlider.Track>
					{thumbIndexes.map((thumbIndex) => (
						<BaseSlider.Thumb
							key={`thumb-${thumbIndex}`}
							index={thumbIndex}
							className={cn(
								"relative z-20 size-(--slider-thumb) rounded-full",
								disabled ? "bg-fg-disabled" : "bg-inverse-surface",
								"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
								"before:absolute before:-inset-3 before:content-[''] max-md:before:-inset-3",
							)}
						/>
					))}
				</BaseSlider.Control>
			</BaseSlider.Root>
		);
	},
);
Slider.displayName = "Slider";

export { Slider, sliderVariants };
export type { SliderProps, SliderThumbSize, SliderTone };
