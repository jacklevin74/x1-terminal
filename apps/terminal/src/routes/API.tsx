import { createFileRoute } from "@tanstack/react-router";
import { ApiWalletsPage } from "@/components/api-wallets/api-wallets-page";
export const Route = createFileRoute("/API")({component:ApiWalletsPage});
