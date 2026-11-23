import type { ReactNode } from "react";

export interface MenuAccount {
	address: `0x${string}`;
	name: string;
	master: boolean;
	value: string | undefined;
	withdrawable: string | undefined;
}

export interface MenuItem {
	label: string;
	icon: ReactNode;
	detail?: ReactNode;
	keepOpen?: boolean;
	onSelect: () => void;
}
