import { Button, Modal, ModalPopup, Slider } from "@hypeterminal/ui";
import { CaretRightIcon, CirclesThreeIcon, PencilSimpleIcon, UserFocusIcon, XIcon } from "@phosphor-icons/react";
import { type ComponentType, createContext, type ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
	basketMood,
	byId,
	count,
	DEFAULT_BASKET,
	type DirTrader,
	echo,
	hypeSide,
	LEVERAGE_MARKS,
	MOOD_MARKET,
	moodLabel,
	type Open,
	usd,
	type VariantProps,
} from "./data";
import { Identicon } from "./identicon";

/**
 * Gallery stage: when set, Surface draws the modal (desktop) or the bottom sheet (mobile) inside a fixed
 * size stage instead of the page, so every variant can show both open at once without iframes.
 * Outside the gallery stage Surface is the shared Modal / ModalPopup, which renders as a bottom sheet under 768px.
 * Variant bodies use container queries (@3xl = 768px), so the layout follows the surface width the same way.
 */
export const StageContext = createContext<{ el: HTMLElement | null; kind: "desktop" | "mobile" } | null>(null);

interface SurfaceProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Desktop width, for example "max-w-[920px]". */
	width: string;
	children: ReactNode;
}

const closeClass =
	"absolute top-3 right-3 z-20 grid size-8 place-items-center rounded-8 text-fg-muted transition-colors hover:bg-control hover:text-fg";

export function Surface({ open, onOpenChange, width, children }: SurfaceProps) {
	const stage = useContext(StageContext);
	if (!stage)
		return (
			<Modal open={open} onOpenChange={onOpenChange}>
				<ModalPopup
					size="lg"
					className={cn(width, "h-[min(720px,calc(100dvh-3rem))] overflow-hidden max-md:h-[88dvh]")}
				>
					<span className="absolute top-2 left-1/2 hidden h-1 w-8 -translate-x-1/2 rounded-full bg-control-hover max-md:block" />
					<div className="@container flex min-h-0 flex-1 flex-col">{children}</div>
				</ModalPopup>
			</Modal>
		);
	if (!open || !stage.el) return null;
	const close = (
		<button type="button" aria-label="Close" onClick={() => onOpenChange(false)} className={closeClass}>
			<XIcon size={16} weight="bold" />
		</button>
	);
	return createPortal(
		<div
			className={cn(
				"absolute inset-0 z-50 flex",
				stage.kind === "desktop" ? "items-center justify-center p-6" : "items-end",
			)}
		>
			<style>
				{"@keyframes ct2-in{from{opacity:0;transform:scale(.97)}}@keyframes ct2-up{from{transform:translateY(100%)}}"}
			</style>
			<button
				type="button"
				aria-label="Close"
				onClick={() => onOpenChange(false)}
				className="absolute inset-0 cursor-default bg-scrim"
			/>
			{stage.kind === "desktop" ? (
				<div
					className={cn(
						"@container relative flex h-[min(720px,calc(100%-3rem))] w-full animate-[ct2-in_200ms_ease-out] flex-col overflow-hidden rounded-16 bg-overlay text-fg shadow-menu",
						width,
					)}
				>
					{children}
					{close}
				</div>
			) : (
				<div className="@container relative flex h-[88%] w-full animate-[ct2-up_250ms_ease-out] flex-col overflow-hidden rounded-t-16 bg-overlay text-fg shadow-menu">
					<span className="absolute top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-control-hover" />
					{children}
					{close}
				</div>
			)}
		</div>,
		stage.el,
	);
}

export function SurfaceTitle({ children }: { children: ReactNode }) {
	return <h2 className="text-base font-medium text-balance text-fg">{children}</h2>;
}

export interface Member {
	id: string;
	on: boolean;
}

export interface DirectoryProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pickedId: string | null;
	onPick: (t: DirTrader) => void;
}

export interface BasketEditorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	members: Member[];
	onChange: (next: Member[]) => void;
	startInAdd: boolean;
}

export const defaultMembers = (): Member[] => DEFAULT_BASKET.map((id) => ({ id, on: true }));

/** Demo edit for the gallery frames: the 3 highest degen pool traders holding HYPE off, the 2 most consistent outsiders added. */
export function demoMembers(): Member[] {
	const pool = DEFAULT_BASKET.map((id) => byId.get(id)).filter((t): t is DirTrader => !!t && !!hypeSide(t.id));
	const off = new Set(
		[...pool]
			.sort((a, b) => b.degen - a.degen)
			.slice(0, 3)
			.map((t) => t.id),
	);
	const added = [...byId.values()]
		.filter((t) => !t.inPool && t.named)
		.sort((a, b) => b.consistency - a.consistency)
		.slice(0, 2)
		.map((t) => ({ id: t.id, on: true }));
	return [...DEFAULT_BASKET.map((id) => ({ id, on: !off.has(id) })), ...added];
}

export const onIds = (m: Member[]) => m.filter((x) => x.on).map((x) => x.id);

export function isDefault(m: Member[]) {
	return m.length === DEFAULT_BASKET.length && m.every((x, i) => x.on && x.id === DEFAULT_BASKET[i]);
}

interface Props extends VariantProps {
	Directory: ComponentType<DirectoryProps>;
	BasketEditor: ComponentType<BasketEditorProps>;
	edited?: boolean;
}

type Mode = "copy" | "basket";

function firstOpen(open: Open | undefined, target: Open) {
	return open === target;
}

export function AutoPanel({ stage, open, mode: initialMode, Directory, BasketEditor, edited }: Props) {
	const [mode, setMode] = useState<Mode>(initialMode ?? (open === "basket" || open === "add" ? "basket" : "copy"));
	const [picked, setPicked] = useState<DirTrader | null>(() =>
		stage === "copy-running" || stage === "copy-picked"
			? (byId.get("0x418aa6bf98a2b2bc93779f810330d88cde488888") ?? null)
			: null,
	);
	const [dirOpen, setDirOpen] = useState(firstOpen(open, "directory"));
	const [editorOpen, setEditorOpen] = useState(firstOpen(open, "basket") || firstOpen(open, "add"));
	const [members, setMembers] = useState<Member[]>(() => (edited ? demoMembers() : defaultMembers()));
	const [leverage, setLeverage] = useState(10);
	const [running, setRunning] = useState<Mode | null>(() => {
		if (stage === "copy-running") return "copy";
		if (stage === "basket-running") return "basket";
		return null;
	});

	const ids = onIds(members);
	const mood = basketMood(ids);

	const editor = (
		<BasketEditor
			open={editorOpen}
			onOpenChange={setEditorOpen}
			members={members}
			onChange={setMembers}
			startInAdd={open === "add"}
		/>
	);

	if (running === "copy" && picked)
		return <CopyRunning trader={picked} leverage={leverage} onStop={() => setRunning(null)} />;

	if (running === "basket")
		return (
			<div className="flex animate-[ct2-in_200ms_ease-out] flex-col gap-3 px-3 pt-4 pb-4">
				<style>{"@keyframes ct2-in{from{opacity:0;transform:scale(.97)}}"}</style>
				<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
					<div className="flex items-center justify-between gap-3">
						<span className="flex min-w-0 flex-col">
							<span className="text-2xs tracking-micro text-fg-muted uppercase">Basket</span>
							<span className="text-sm font-medium">{count(ids.length)} traders</span>
						</span>
						<LivePill />
					</div>
					<MoodLine score={mood.score} counted={mood.counted} />
					<MemberStack ids={ids} />
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Button variant="secondary" intent="neutral" size="sm" onClick={() => setEditorOpen(true)}>
						Edit basket
					</Button>
					<Button
						variant="secondary"
						intent="neutral"
						size="sm"
						onClick={() => {
							setRunning(null);
							toast.success("Basket paused. Positions stay open.");
						}}
					>
						Pause
					</Button>
				</div>
				{editor}
			</div>
		);

	return (
		<div className="flex flex-col gap-4 px-3 pt-4 pb-4">
			<div className="grid grid-cols-2 gap-1 rounded-8 bg-control p-1">
				<ModeTab
					on={mode === "copy"}
					icon={<UserFocusIcon className="size-4" />}
					label="Copy a trader"
					onClick={() => setMode("copy")}
				/>
				<ModeTab
					on={mode === "basket"}
					icon={<CirclesThreeIcon className="size-4" />}
					label="Basket"
					onClick={() => setMode("basket")}
				/>
			</div>

			{mode === "copy" ? (
				<>
					<div className="flex flex-col gap-2">
						<span className="text-xs text-fg-muted">Trader</span>
						<button
							type="button"
							onClick={() => setDirOpen(true)}
							className="group flex items-center gap-3 rounded-8 bg-control px-3 py-2.5 text-left transition-colors hover:bg-control-hover"
						>
							{picked ? (
								<>
									<Identicon id={picked.id} />
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="truncate text-xs font-medium">{picked.name}</span>
										<span className="truncate text-2xs text-fg-muted">
											Degen {picked.degen}, consistency {picked.consistency}
										</span>
									</span>
									<span className="text-xs text-fg-secondary">Change</span>
								</>
							) : (
								<>
									<span className="grid size-8 place-items-center rounded-full bg-surface text-fg-muted">
										<UserFocusIcon className="size-4" />
									</span>
									<span className="flex flex-1 flex-col">
										<span className="text-xs font-medium">Choose trader</span>
										<span className="text-2xs text-fg-muted">Browse 87 traders or paste an address</span>
									</span>
								</>
							)}
							<CaretRightIcon weight="bold" className="size-3 text-fg-muted" />
						</button>
					</div>
					{picked && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-fg-muted">Max leverage</span>
								<span className="tabular-nums">{leverage}x</span>
							</div>
							<Slider
								value={leverage}
								onValueChange={(v) => setLeverage(Array.isArray(v) ? v[0] : v)}
								min={1}
								max={40}
								step={1}
								marks={LEVERAGE_MARKS}
								onMarkSelect={setLeverage}
							/>
						</div>
					)}
					<Button
						variant="filled"
						intent="brand"
						size="md"
						disabled={!picked}
						onClick={() => {
							if (!picked) return;
							setRunning("copy");
							toast.success(`Copying ${picked.name}. Max leverage ${leverage}x.`);
						}}
					>
						{picked ? "Start copy trading" : "Choose a trader first"}
					</Button>
				</>
			) : (
				<>
					<div className="flex flex-col gap-3 rounded-12 bg-control p-3">
						<div className="flex items-center justify-between gap-3">
							<span className="flex flex-col">
								<span className="text-sm font-medium">{count(ids.length)} traders</span>
								<span className="text-2xs text-fg-muted">
									{isDefault(members) ? "Default mood pool" : "Edited basket"}
								</span>
							</span>
							<button
								type="button"
								onClick={() => setEditorOpen(true)}
								className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-xs transition-colors hover:bg-control-hover"
							>
								<PencilSimpleIcon className="size-3.5" />
								Edit
							</button>
						</div>
						<MemberStack ids={ids} />
						<MoodLine score={mood.score} counted={mood.counted} />
					</div>
					<Button
						variant="filled"
						intent="brand"
						size="md"
						disabled={!ids.length}
						onClick={() => {
							setRunning("basket");
							toast.success(`Basket started with ${ids.length} traders.`);
						}}
					>
						Start basket
					</Button>
				</>
			)}

			<Directory
				open={dirOpen}
				onOpenChange={setDirOpen}
				pickedId={picked?.id ?? null}
				onPick={(t) => {
					setPicked(t);
					setDirOpen(false);
				}}
			/>
			{editor}
		</div>
	);
}

function ModeTab({ on, icon, label, onClick }: { on: boolean; icon: ReactNode; label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex h-9 items-center justify-center gap-1.5 rounded-6 text-xs transition-colors",
				on ? "bg-control-hover font-medium text-fg" : "text-fg-muted hover:text-fg",
			)}
		>
			{icon}
			{label}
		</button>
	);
}

export function MemberStack({ ids, max = 7 }: { ids: string[]; max?: number }) {
	return (
		<span className="flex items-center">
			{ids.slice(0, max).map((id, i) => (
				<span key={id} className="rounded-full ring-2 ring-control" style={{ marginLeft: i ? -6 : 0, zIndex: max - i }}>
					<Identicon id={id} className="size-6" />
				</span>
			))}
			{ids.length > max && <span className="pl-2 text-2xs text-fg-muted">+{ids.length - max}</span>}
		</span>
	);
}

export function MoodLine({ score, counted }: { score: number; counted: number }) {
	const label = moodLabel(score);
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-xs">
				<span className="text-fg-muted">{MOOD_MARKET} mood</span>
				<span
					className={cn(
						"tabular-nums",
						label === "Bullish" && "text-market-up",
						label === "Bearish" && "text-market-down",
					)}
				>
					{score > 0 ? "+" : ""}
					{score} {label}
				</span>
			</div>
			<MoodBar score={score} />
			<span className="text-2xs text-fg-muted">
				{counted} of the selected traders hold {MOOD_MARKET} now
			</span>
		</div>
	);
}

export function MoodBar({ score }: { score: number }) {
	return (
		<span className="relative h-1.5 rounded-full bg-surface">
			<span className="absolute top-0 left-1/2 h-full w-px bg-fg-muted" />
			<span
				className={cn(
					"absolute top-0 h-full rounded-full transition-all",
					score >= 0 ? "bg-market-up" : "bg-market-down",
				)}
				style={score >= 0 ? { left: "50%", width: `${score / 2}%` } : { right: "50%", width: `${-score / 2}%` }}
			/>
		</span>
	);
}

function LivePill() {
	return (
		<span className="flex items-center gap-1.5 rounded-full bg-control-hover px-2.5 py-1 text-xs text-market-up">
			<span className="size-1.5 rounded-full bg-market-up" />
			Live
		</span>
	);
}

function CopyRunning({ trader, leverage, onStop }: { trader: DirTrader; leverage: number; onStop: () => void }) {
	return (
		<div className="flex animate-[ct2-in_200ms_ease-out] flex-col gap-3 px-3 pt-4 pb-4">
			<style>{"@keyframes ct2-in{from{opacity:0;transform:scale(.97)}}"}</style>
			<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
				<div className="flex items-center gap-3">
					<Identicon id={trader.id} />
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="text-2xs tracking-micro text-fg-muted uppercase">Copying</span>
						<span className="truncate text-sm font-medium">{trader.name}</span>
					</span>
					<LivePill />
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Stat label="Your PNL" value={usd(echo.botPnl, true)} />
					<Stat label="Their PNL" value={usd(echo.whalePnl, true)} />
				</div>
				<div className="flex flex-col gap-3">
					<Bars label="Trades" you={echo.botTrades} them={echo.whaleTrades} fmt={count} approx />
					<Bars label="Fees a day" you={echo.botFeesDay} them={echo.whaleFeesDay} fmt={(n) => usd(n)} />
					<Bars label="Turnover a day" you={echo.botTurnoverDay} them={echo.whaleTurnoverDay} fmt={(n) => `${n}%`} />
				</div>
				<p className="text-2xs text-fg-muted">
					Per $100K over {echo.days} days. Max leverage {leverage}x.
				</p>
			</div>
			<div className="grid grid-cols-2 gap-2">
				<Button
					variant="secondary"
					intent="neutral"
					size="sm"
					onClick={() => toast.success("Copy trading paused. Positions stay open.")}
				>
					Pause
				</Button>
				<Button
					variant="secondary"
					intent="neutral"
					size="sm"
					onClick={() => {
						onStop();
						toast.success("Stopped copying.");
					}}
				>
					Change trader
				</Button>
			</div>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<span className="flex flex-col gap-0.5 rounded-8 bg-control-hover px-3 py-2">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className="text-sm font-medium text-market-up tabular-nums">{value}</span>
		</span>
	);
}

function Bars({
	label,
	you,
	them,
	fmt,
	approx,
}: {
	label: string;
	you: number;
	them: number;
	fmt: (n: number) => string;
	approx?: boolean;
}) {
	const max = Math.max(you, them);
	return (
		<div className="flex flex-col gap-1 text-xs">
			<span className="text-fg-muted">{label}</span>
			<div className="grid grid-cols-[36px_1fr_56px] items-center gap-2 tabular-nums">
				<span className="text-2xs text-fg-muted">You</span>
				<span className="h-1.5 rounded-full bg-control-hover">
					<span className="block h-full rounded-full bg-fg" style={{ width: `${(you / max) * 100}%` }} />
				</span>
				<span className="text-right">{fmt(you)}</span>
				<span className="text-2xs text-fg-muted">Them</span>
				<span className="h-1.5 rounded-full bg-control-hover">
					<span className="block h-full rounded-full bg-fg-muted" style={{ width: `${(them / max) * 100}%` }} />
				</span>
				<span className="text-right text-fg-secondary">
					{approx ? "~" : ""}
					{fmt(them)}
				</span>
			</div>
		</div>
	);
}
