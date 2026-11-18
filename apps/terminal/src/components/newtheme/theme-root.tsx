import { useLocation } from "@tanstack/react-router";
import { type ReactNode, useLayoutEffect } from "react";
import { TerminalBrandContext } from "@/components/trade/header/terminal-brand";
import { NewthemeBrand } from "./newtheme-page";
import { themeModeFor, useNewthemeForced, useThemePreference } from "./theme-mode";
import "./newtheme.css";

/** Applies the terminal theme app-wide: the new theme by default, classic when chosen (or on /classic). */
export function TerminalThemeRoot({ children }: { children: ReactNode }) {
	const { pathname } = useLocation();
	const [preference] = useThemePreference();
	const forced = useNewthemeForced();
	const mode = themeModeFor(pathname, preference);
	const applied = mode === "new" || forced;
	useLayoutEffect(() => {
		const root = document.documentElement;
		if (applied) root.setAttribute("data-terminal-theme", "newtheme");
		else if (root.getAttribute("data-terminal-theme") === "newtheme") root.removeAttribute("data-terminal-theme");
	}, [applied]);
	return mode === "new" ? (
		<TerminalBrandContext value={<NewthemeBrand />}>{children}</TerminalBrandContext>
	) : (
		<>{children}</>
	);
}
