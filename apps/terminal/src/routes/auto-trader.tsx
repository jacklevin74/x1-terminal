import { createFileRoute } from "@tanstack/react-router";
import { AutoTraderPanel } from "@/components/auto-trader/auto-trader-panel";
import { UserMenu } from "@/components/trade/header/user-menu";
export const Route=createFileRoute("/auto-trader")({component:()=> <main className="min-h-dvh bg-background p-4 text-fg sm:p-8"><div className="mx-auto max-w-7xl space-y-5"><header className="flex items-center justify-between gap-4"><a href="/API" className="text-sm text-brand">← API wallets</a><UserMenu /></header><AutoTraderPanel /></div></main>});
