import { createFileRoute } from "@tanstack/react-router";
import { SubAccounts3Gallery } from "@/components/dev-variants/sub-accounts-3/gallery";

export const Route = createFileRoute("/dev/variants/sub-accounts-3")({
	ssr: false,
	component: SubAccounts3Gallery,
});
