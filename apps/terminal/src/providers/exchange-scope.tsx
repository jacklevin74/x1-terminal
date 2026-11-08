import { useLocation } from "@tanstack/react-router";
import { createContext, use, useMemo } from "react";
import type { ExchangeScope } from "@/domain/market";

interface ExchangeScopeContext {
	scope: ExchangeScope;
	dex: string | undefined;
}

const ExchangeScopeCtx = createContext<ExchangeScopeContext>({
	scope: "all",
	dex: undefined,
});

function deriveScope(pathname: string): ExchangeScopeContext {
	const segments = pathname.split("/").filter(Boolean);
	const first = segments[0];

	if (first === "perp") return { scope: "perp", dex: undefined };
	if (first === "spot") return { scope: "spot", dex: undefined };
	if (first === "builders-perp") {
		return { scope: "builders-perp", dex: segments[1] || undefined };
	}

	return { scope: "all", dex: undefined };
}

export function ExchangeScopeProvider({ children }: { children: React.ReactNode }) {
	const { pathname, search } = useLocation();
 const previewScope = (search as { scope?: unknown }).scope;
 const selection: ExchangeScopeContext = pathname === "/newtheme" && (previewScope === "all" || previewScope === "perp" || previewScope === "spot" || previewScope === "builders-perp")
  ? { scope: previewScope, dex: undefined } : deriveScope(pathname);
 const { scope, dex } = selection;
	const value = useMemo(() => ({ scope, dex }), [scope, dex]);

	return <ExchangeScopeCtx value={value}>{children}</ExchangeScopeCtx>;
}

export function useExchangeScope(): ExchangeScopeContext {
	return use(ExchangeScopeCtx);
}
