import { createFileRoute } from "@tanstack/react-router";
import { MoodTraders3Gallery } from "@/components/dev-variants/mood-traders-3/gallery";

export const Route = createFileRoute("/dev/variants/mood-traders-3")({
	ssr: false,
	component: MoodTraders3Gallery,
});
