const NAVIGATION_KEYS = new Set([
	"Tab",
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"Home",
	"End",
	"PageUp",
	"PageDown",
	"Enter",
	" ",
	"Escape",
]);

export function trackInputModality() {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	root.dataset.input = "pointer";
	document.addEventListener(
		"pointerdown",
		() => {
			root.dataset.input = "pointer";
		},
		true,
	);
	document.addEventListener(
		"keydown",
		(event) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (NAVIGATION_KEYS.has(event.key)) root.dataset.input = "keyboard";
		},
		true,
	);
}
