import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { WalletModal } from "../components/wallet-modal";
import { Placeholder } from "./placeholder";

interface Props {
	message: string;
}

export function ConnectPlaceholder({ message }: Props) {
	const [walletModalOpen, setWalletModalOpen] = useState(false);
	return (
		<>
			<Placeholder
				action={
					<Button variant="secondary" intent="neutral" size="xs" onClick={() => setWalletModalOpen(true)}>
						{t`Connect Wallet`}
					</Button>
				}
			>
				{message}
			</Placeholder>
			<WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
		</>
	);
}
