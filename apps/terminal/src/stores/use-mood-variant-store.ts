import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type MoodVariant = 1 | 2 | 3 | 4 | 5 | 6;

interface MoodVariantState {
	variant: MoodVariant;
	preview: number | null;
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

export const useMoodVariantStore = create<MoodVariantState>()(
	persist(
		(set) => ({
			variant: 1,
			preview: null,
			setVariant: (variant) => set({ variant }),
			setPreview: (preview) => set({ preview }),
		}),
		{
			name: "x1-mood-variant",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({ variant: state.variant }),
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
