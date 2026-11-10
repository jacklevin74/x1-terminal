import { createFileRoute } from "@tanstack/react-router";
import { ApiWalletsPage } from "@/components/api-wallets/api-wallets-page";
import { buildPageHead } from "@/lib/seo";
export const Route = createFileRoute("/api_keys")({
 head:()=>buildPageHead({title:"API wallet management",path:"/api_keys",noIndex:true}),
 component:()=> <ApiWalletsPage managementOnly />,
});
