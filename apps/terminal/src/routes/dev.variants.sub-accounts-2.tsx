import { createFileRoute } from "@tanstack/react-router";
import { SubAccounts2Gallery } from "@/components/dev-variants/sub-accounts-2/gallery";

export const Route = createFileRoute("/dev/variants/sub-accounts-2")({
	ssr: false,
	component: SubAccounts2Gallery,
});
