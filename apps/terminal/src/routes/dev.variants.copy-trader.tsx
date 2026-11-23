import { createFileRoute } from "@tanstack/react-router";
import { CopyTraderGallery } from "@/components/dev-variants/copy-trader/gallery";

export const Route = createFileRoute("/dev/variants/copy-trader")({
	ssr: false,
	component: CopyTraderGallery,
});
