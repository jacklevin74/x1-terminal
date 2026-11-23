import { Dropdown } from "@hypeterminal/ui";
import { CaretRightIcon, CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
	type DirTrader,
	isAddress,
	pastedTrader,
	pnlTone,
	queryDirectory,
	SORT_KEYS,
	SORT_LABEL,
	type SortKey,
	sortValue,
	tradesText,
	usd,
	WINDOW_LABEL,
	type Window,
} from "./data";
import { Identicon } from "./identicon";
import { Pill } from "./pill";
import { Surface, SurfaceTitle } from "./surface";
import { TraderDetail } from "./trader-detail";
import { TwoPane } from "./two-pane";

const WINDOWS: Window[] = ["d7", "d30", "all"];
const WIDTH = "max-w-[960px]";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pickedId: string | null;
	onPick: (t: DirTrader) => void;
}

export function TraderDirectory({ open, onOpenChange, pickedId, onPick }: Props) {
	return (
		<Surface open={open} onOpenChange={onOpenChange} width={WIDTH}>
			<header className="p-4 pr-14">
				<SurfaceTitle>Trader directory</SurfaceTitle>
			</header>
			<Browser
				pickedId={pickedId}
				onPick={(t) => {
					onPick(t);
					toast.success(`Selected ${t.name}.`);
				}}
			/>
		</Surface>
	);
}

function sortText(t: DirTrader, key: SortKey, window: Window) {
	if (key === "pnl") return usd(t.pnl[window], true);
	if (key === "trades") return tradesText(t);
	const v = sortValue(t, key, window);
	return v === null ? "n/a" : String(v);
}

function SortHeader({ sort, window, onWindow }: { sort: SortKey; window: Window; onWindow: (w: Window) => void }) {
	return (
		<div className="flex h-7 shrink-0 items-center justify-between pr-1 pl-2 text-xs text-fg-muted">
			<span>Trader</span>
			{sort === "pnl" ? (
				<Dropdown
					size="sm"
					align="end"
					triggerVariant="minimal"
					triggerAriaLabel="PNL range"
					trigger={`PNL ${WINDOW_LABEL[window]}`}
					triggerClassName="text-fg-secondary"
					popupClassName="min-w-28"
					items={WINDOWS.map((w) => ({ label: WINDOW_LABEL[w], active: w === window, onSelect: () => onWindow(w) }))}
				/>
			) : (
				<span className="pr-1">{SORT_LABEL[sort]}</span>
			)}
		</div>
	);
}

function Browser({ pickedId, onPick }: { pickedId: string | null; onPick: (t: DirTrader) => void }) {
	const [sort, setSort] = useState<SortKey>("consistency");
	const [window, setWindow] = useState<Window>("d30");
	const [text, setText] = useState("");
	const [focusId, setFocusId] = useState<string | null>(null);
	const [pushed, setPushed] = useState(false);
	const list = isAddress(text) ? [pastedTrader(text)] : queryDirectory({ sort, window, text });
	const focus = list.find((t) => t.id === (focusId ?? pickedId)) ?? list.find((t) => t.inPool) ?? list[0];

	return (
		<TwoPane
			pushed={pushed}
			onBack={() => setPushed(false)}
			listClassName="w-[340px] shrink-0"
			detailClassName="flex-1"
			list={
				<>
					<label className="flex h-9 shrink-0 items-center gap-2 rounded-8 bg-control px-3">
						<MagnifyingGlassIcon className="size-4 text-fg-muted" />
						<input
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Search or paste an address"
							className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-muted"
						/>
					</label>
					<div className="flex shrink-0 gap-1 overflow-x-auto">
						{SORT_KEYS.map((k) => (
							<Pill key={k} on={sort === k} onClick={() => setSort(k)}>
								{SORT_LABEL[k]}
							</Pill>
						))}
					</div>
					<SortHeader sort={sort} window={window} onWindow={setWindow} />
					<div className="min-h-0 flex-1 overflow-y-auto pb-4">
						{list.map((t, i) => (
							<button
								key={t.id}
								type="button"
								onClick={() => {
									setFocusId(t.id);
									setPushed(true);
								}}
								className={cn(
									"flex w-full items-center gap-2.5 rounded-8 px-2 py-2 text-left text-xs transition-colors",
									focus?.id === t.id ? "bg-control-hover" : "hover:bg-control",
								)}
							>
								<span className="w-5 text-2xs text-fg-muted tabular-nums">{i + 1}</span>
								<Identicon id={t.id} className="size-7" />
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="truncate font-medium">{t.name}</span>
									<span className="truncate text-2xs text-fg-muted">
										Degen {t.degen}, consistency {t.consistency}
									</span>
								</span>
								<span className={cn("tabular-nums", sort === "pnl" && pnlTone(t.pnl[window]))}>
									{sortText(t, sort, window)}
								</span>
								{pickedId === t.id && <CheckIcon weight="bold" className="size-3.5" />}
								<CaretRightIcon className="hidden size-3 text-fg-muted @max-3xl:block" />
							</button>
						))}
						{!list.length && <p className="py-10 text-center text-xs text-fg-muted">No traders match.</p>}
					</div>
				</>
			}
			detail={
				focus && (
					<TraderDetail
						key={focus.id}
						t={focus}
						actionLabel={pickedId === focus.id ? "Selected" : "Copy this trader"}
						actionDisabled={pickedId === focus.id}
						onAction={() => onPick(focus)}
					/>
				)
			}
		/>
	);
}
