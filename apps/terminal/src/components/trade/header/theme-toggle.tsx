import { ButtonIcon, type ButtonIconProps } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { ClientOnly } from "@tanstack/react-router";
import { cn } from "@/lib/cn";
import { useSetTheme, useTheme } from "@/stores/use-global-settings-store";

interface Props {
	size?: ButtonIconProps["size"];
	className?: string;
}

export function ThemeToggle({ size = "sm", className }: Props) {
	return (
		<ClientOnly>
			<ThemeToggleButton size={size} className={className} />
		</ClientOnly>
	);
}

function ThemeToggleButton({ size, className }: Props) {
	const theme = useTheme();
	const setTheme = useSetTheme();

	const isDark = theme === "dark";

	return (
		<ButtonIcon
			variant="ghost"
			intent="neutral"
			size={size}
			className={cn("text-fg-muted hover:text-fg", className)}
			onClick={() => setTheme(isDark ? "light" : "dark")}
			aria-label={isDark ? t`Switch to light mode` : t`Switch to dark mode`}
		>
			{isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
		</ButtonIcon>
	);
}
