import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			radius: ["4", "6", "8", "12", "16", "20", "24", "32"],
			shadow: ["raised", "overlay", "menu"],
			"inset-shadow": ["sunken"],
		},
	},
});

export function cn(...classes: ClassValue[]) {
	return twMerge(clsx(...classes));
}
