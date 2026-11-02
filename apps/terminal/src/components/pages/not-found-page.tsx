import { buttonVariants } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";

export function NotFoundPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-3 text-fg">
			<div className="flex flex-col items-center gap-4 text-center">
				<div className="flex flex-col items-center gap-1">
					<p className="text-2xs uppercase tracking-micro tabular-nums text-fg-muted">404</p>
					<h1 className="text-lg font-medium text-fg">
						<Trans>Page not found</Trans>
					</h1>
					<p className="text-xs text-fg-muted">
						<Trans>The page you are looking for does not exist.</Trans>
					</p>
				</div>
				<a
					href="/"
					aria-label={t`Go to trading terminal`}
					className={buttonVariants({ variant: "filled", intent: "brand", size: "md" })}
				>
					<Trans>Go to trading terminal</Trans>
				</a>
			</div>
		</div>
	);
}
