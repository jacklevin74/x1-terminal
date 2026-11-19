import { createFileRoute } from "@tanstack/react-router";
import { SubaccountsPage } from "@/components/subaccounts/subaccounts-page";
import { buildPageHead } from "@/lib/seo";
export const Route = createFileRoute("/subAccounts")({
	ssr: false,
	head: () => buildPageHead({ title: "Subaccounts", path: "/subAccounts", noIndex: true }),
	component: SubaccountsPage,
});
