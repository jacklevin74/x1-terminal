export function AppShellSkeleton() {
	return (
		<>
			<div className="md:hidden h-dvh w-full flex flex-col bg-background overflow-hidden">
				<div className="pt-[env(safe-area-inset-top)] border-b border-stroke-weak">
					<div className="h-12 px-3 flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<div className="size-6 rounded-4 bg-surface animate-pulse" />
							<div className="h-3 w-20 rounded-4 bg-surface animate-pulse" />
						</div>
						<div className="flex items-center gap-2">
							<div className="size-8 rounded-8 bg-surface animate-pulse" />
							<div className="size-8 rounded-8 bg-surface animate-pulse" />
						</div>
					</div>
				</div>
				<div className="flex-1 min-h-0 p-3 space-y-3">
					<div className="h-5 w-32 rounded-4 bg-surface animate-pulse" />
					<div className="h-48 w-full rounded-8 bg-surface animate-pulse" />
					<div className="flex gap-3">
						<div className="h-4 w-16 rounded-4 bg-surface animate-pulse" />
						<div className="h-4 w-16 rounded-4 bg-surface animate-pulse" />
						<div className="h-4 w-16 rounded-4 bg-surface animate-pulse" />
					</div>
				</div>
				<div className="border-t border-stroke-weak pb-[env(safe-area-inset-bottom)]">
					<div className="flex items-stretch">
						{["chart", "trade", "book", "positions", "account"].map((tab) => (
							<div key={tab} className="flex-1 h-14 flex flex-col items-center justify-center gap-1 py-2">
								<div className="size-5 rounded-4 bg-surface animate-pulse" />
								<div className="h-2 w-8 rounded-4 bg-surface animate-pulse" />
							</div>
						))}
					</div>
				</div>
			</div>
			<div className="hidden md:flex h-screen w-full flex-col bg-background">
				<div className="h-12 px-4 flex items-center gap-3 shrink-0">
					<div className="h-4 w-32 rounded-4 bg-surface animate-pulse" />
					<div className="h-4 w-24 rounded-4 bg-surface animate-pulse ml-auto" />
				</div>
				<div className="flex-1 min-h-0 flex flex-col gap-1 p-1 pb-7">
					<div className="h-20 shrink-0 rounded-8 bg-surface animate-pulse" />
					<div className="flex-1 min-h-0 rounded-8 bg-surface animate-pulse" />
				</div>
			</div>
		</>
	);
}
