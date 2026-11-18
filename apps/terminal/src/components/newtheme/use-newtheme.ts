import { useLayoutEffect } from "react";
import { addNewthemeForcer } from "./theme-mode";
import "./newtheme.css";
/** Apply the shared terminal palette to this route, including menus and dialogs, whatever the saved theme. */
export function useNewtheme() {
	useLayoutEffect(() => {
		const root = document.documentElement,
			previous = root.getAttribute("data-terminal-theme");
		root.setAttribute("data-terminal-theme", "newtheme");
		const release = addNewthemeForcer();
		return () => {
			release();
			if (previous === null) root.removeAttribute("data-terminal-theme");
			else root.setAttribute("data-terminal-theme", previous);
		};
	}, []);
}
