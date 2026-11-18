import { useCallback, useSyncExternalStore } from "react";

/** The terminal's look: the new theme (default) or the classic one. */
export type ThemeMode = "new" | "classic";

export const THEME_STORAGE_KEY = "x1-terminal-theme";
const CHANGE_EVENT = "x1-terminal-theme-change";

/** The saved choice; the new theme unless the viewer picked classic. Storage can be unavailable (private mode). */
export function readThemePreference(): ThemeMode {
	try {
		return window.localStorage.getItem(THEME_STORAGE_KEY) === "classic" ? "classic" : "new";
	} catch {
		return "new";
	}
}

export function writeThemePreference(mode: ThemeMode) {
	try {
		if (mode === "classic") window.localStorage.setItem(THEME_STORAGE_KEY, "classic");
		else window.localStorage.removeItem(THEME_STORAGE_KEY);
	} catch {
		// Not persisted; the choice still applies until reload.
	}
	window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** /newtheme and /classic force their look; every other path follows the saved choice. */
export function themeModeFor(pathname: string, preference: ThemeMode): ThemeMode {
	if (pathname === "/newtheme") return "new";
	if (pathname === "/classic") return "classic";
	return preference;
}

function subscribe(onChange: () => void) {
	const onStorage = (event: StorageEvent) => {
		if (event.key === null || event.key === THEME_STORAGE_KEY) onChange();
	};
	window.addEventListener(CHANGE_EVENT, onChange);
	window.addEventListener("storage", onStorage);
	return () => {
		window.removeEventListener(CHANGE_EVENT, onChange);
		window.removeEventListener("storage", onStorage);
	};
}

export function useThemePreference(): [ThemeMode, (mode: ThemeMode) => void] {
	const mode = useSyncExternalStore(subscribe, readThemePreference, () => "new" as const);
	const set = useCallback((next: ThemeMode) => writeThemePreference(next), []);
	return [mode, set];
}

// Pages built for the new theme (sub-accounts, API keys) force it even in classic mode; the root counts them so it
// doesn't strip the theme they set.
let forcers = 0;
export function addNewthemeForcer() {
	forcers += 1;
	window.dispatchEvent(new Event(CHANGE_EVENT));
	return () => {
		forcers = Math.max(0, forcers - 1);
		window.dispatchEvent(new Event(CHANGE_EVENT));
	};
}
export function useNewthemeForced(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => forcers > 0,
		() => false,
	);
}
