import { Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle, Select } from "@hypeterminal/ui";
import { Trans } from "@lingui/react/macro";
import {
	ArrowSquareOutIcon,
	CheckCircleIcon,
	SpinnerGapIcon,
	WalletIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { NETWORKS, type NetworkId } from "@/config/networks";
import { getExplorerTxUrl } from "@/lib/explorer";

interface NetworkSelectProps {
	label: React.ReactNode;
	value: NetworkId;
	onChange: (value: NetworkId) => void;
	disabled?: boolean;
}

export function NetworkSelect({ label, value, onChange, disabled }: NetworkSelectProps) {
	return (
		<Select
			inlineLabel={label}
			value={value}
			onValueChange={(v) => v && onChange(v as NetworkId)}
			disabled={disabled}
			options={NETWORKS.map((n) => ({ value: n.id, label: n.name }))}
		/>
	);
}

type StatusIconKind = "success" | "error" | "loading";

interface StatusScreenProps {
	title: React.ReactNode;
	icon: StatusIconKind;
	heading: React.ReactNode;
	description?: React.ReactNode;
	txHash?: string;
	children?: React.ReactNode;
	onClose?: () => void;
	closable?: boolean;
}

export const explorerLinkClass =
	"inline-flex items-center gap-1 text-xs text-fg-secondary underline decoration-dashed underline-offset-4 transition-colors hover:text-fg";

export const readOnlyFieldClass =
	"flex h-8 items-center justify-between gap-3 rounded-8 bg-control px-3 text-xs max-md:h-10";

export const fieldChipClass =
	"bg-control-hover text-fg-muted hover:text-fg data-disabled:bg-control-hover data-disabled:text-fg-disabled";

export const inlineLinkButtonClass =
	"inline h-auto align-baseline font-normal text-fg tabular-nums decoration-dashed decoration-fg-muted hover:text-fg-secondary hover:brightness-100";

export const warningNoticeClass = "rounded-8 bg-control p-3 text-xs text-market-down";

export function StatusIcon({ icon }: { icon: StatusIconKind }) {
	return (
		<div className="flex size-12 items-center justify-center rounded-8 bg-control">
			{icon === "loading" && <SpinnerGapIcon className="size-6 animate-spin text-fg-muted" />}
			{icon === "success" && <CheckCircleIcon className="size-6 text-market-up" />}
			{icon === "error" && <WarningCircleIcon className="size-6 text-market-down" />}
		</div>
	);
}

export function StatusScreen({
	title,
	icon,
	heading,
	description,
	txHash,
	children,
	onClose,
	closable = true,
}: StatusScreenProps) {
	const explorerUrl = txHash ? getExplorerTxUrl(txHash) : null;

	return (
		<Modal open onOpenChange={closable ? onClose : undefined}>
			<ModalPopup size="sm" showClose={closable}>
				<ModalHeader>
					<ModalTitle>{title}</ModalTitle>
				</ModalHeader>
				<ModalContent>
					<div className="flex flex-col items-center gap-4 py-6">
						<StatusIcon icon={icon} />
						<div className="space-y-1 text-center">
							<p className="text-base font-medium text-fg">{heading}</p>
							{description && <p className="text-xs text-fg-muted">{description}</p>}
						</div>
						{explorerUrl && (
							<a href={explorerUrl} target="_blank" rel="noopener noreferrer" className={explorerLinkClass}>
								<Trans>View on explorer</Trans>
								<ArrowSquareOutIcon className="size-3" aria-hidden="true" />
							</a>
						)}
						{children && <div className="w-full pt-2">{children}</div>}
					</div>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}

export function WalletNotConnected() {
	return (
		<div className="flex flex-col items-center gap-4 py-8">
			<div className="flex size-12 items-center justify-center rounded-8 bg-control">
				<WalletIcon className="size-6 text-fg-muted" />
			</div>
			<div className="space-y-1 text-center">
				<p className="text-lg font-medium text-fg">
					<Trans>Wallet not connected</Trans>
				</p>
				<p className="text-xs text-fg-muted">
					<Trans>Connect your wallet to withdraw funds</Trans>
				</p>
			</div>
		</div>
	);
}
