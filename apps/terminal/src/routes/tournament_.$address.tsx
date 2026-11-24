import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAddress } from "viem";
import { TraderAccountPage } from "@/components/tournament/trader-account-page";
import { TOURNAMENT_PATH } from "@/config/nav";
import { ROUTE_SEO } from "@/config/seo";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/tournament_/$address")({
	ssr: false,
	beforeLoad: ({ params }) => {
		if (!isAddress(params.address)) throw redirect({ to: TOURNAMENT_PATH });
	},
	head: () => buildPageHead(ROUTE_SEO.TOURNAMENT),
	component: TraderAccount,
});

function TraderAccount() {
	const { address } = Route.useParams();
	return <TraderAccountPage address={address.toLowerCase() as `0x${string}`} />;
}
