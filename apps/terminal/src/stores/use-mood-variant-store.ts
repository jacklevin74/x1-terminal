import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type MoodVariant = 1 | 2 | 3 | 4 | 5 | 6;
export type MoodBack = 1 | 2 | 3 | 4;
export type MoodGauge = 1 | 2 | 3 | 4;

interface MoodVariantState {
	variant: MoodVariant;
	preview: number | null;
	back: MoodBack;
	gauge: MoodGauge;
	setGauge: (gauge: MoodGauge) => void;
	setBack: (back: MoodBack) => void;
	setVariant: (variant: MoodVariant) => void;
	setPreview: (preview: number | null) => void;
}

export const MOOD_VARIANTS: { id: MoodVariant; label: string }[] = [
	{ id: 1, label: "Header ring" },
	{ id: 2, label: "Market ring + drawer" },
	{ id: 3, label: "Footer stone + sheet" },
	{ id: 4, label: "Nav segments + modal" },
	{ id: 5, label: "Floating orb" },
	{ id: 6, label: "Order form ring" },
];

export const MOOD_GAUGES: { id: MoodGauge; label: string }[] = [
	{ id: 1, label: "Arc with knob" },
	{ id: 2, label: "Mood ring" },
	{ id: 3, label: "Spectrum bar" },
	{ id: 4, label: "Zone dial" },
];

export const MOOD_BACKS: { id: MoodBack; label: string }[] = [
	{ id: 1, label: "Back in header" },
	{ id: 2, label: "Breadcrumb" },
	{ id: 3, label: "Pill + stepper" },
	{ id: 4, label: "Hero corner" },
];

export const useMoodVariantStore = create<MoodVariantState>()(
	persist(
		(set) => ({
			variant: 1,
			preview: null,
			back: 1,
			gauge: 1,
			setGauge: (gauge) => set({ gauge }),
			setBack: (back) => set({ back }),
			setVariant: (variant) => set({ variant }),
			setPreview: (preview) => set({ preview }),
		}),
		{
			name: "x1-mood-variant",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({ variant: state.variant, back: state.back, gauge: state.gauge }),
			onRehydrateStorage: () => (state) => {
				if (typeof location === "undefined" || !state) return;
				const fromUrl = Number(new URLSearchParams(location.search).get("mood"));
				if (fromUrl >= 1 && fromUrl <= 6) state.setVariant(fromUrl as MoodVariant);
			},
		},
	),
);

export function useMoodVariant() {
	return useMoodVariantStore((state) => state.variant);
}

export function useMoodPreview() {
	return useMoodVariantStore((state) => state.preview);
}

export function useMoodBack() {
	return useMoodVariantStore((state) => state.back);
}

export function useMoodGauge() {
	return useMoodVariantStore((state) => state.gauge);
}
