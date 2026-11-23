import { createFileRoute } from "@tanstack/react-router";
import { MoodTraders2Gallery } from "@/components/dev-variants/mood-traders-2/gallery";

export const Route = createFileRoute("/dev/variants/mood-traders-2")({
	ssr: false,
	component: MoodTraders2Gallery,
});
