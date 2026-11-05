import type { ExchangeClient } from "@nktkas/hyperliquid";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { assertExchange } from "../errors";
import { useHyperliquid } from "../provider";
import { getExchangeMethodConfig } from "../registries/exchange";
import type { HyperliquidQueryError, MutationParameter } from "../types";
import type { ExchangeMethod, ExchangeParams, ExchangeResponse } from "../types/clients";
import { useHyperliquidClients } from "./useClients";

export function useExchange<M extends ExchangeMethod>(
	method: M,
	options: MutationParameter<ExchangeResponse<M>, ExchangeParams<M>> = {},
): UseMutationResult<ExchangeResponse<M>, HyperliquidQueryError, ExchangeParams<M>> {
	const { trading, user } = useHyperliquidClients();
	const { builderConfig, clientKey, vaultAddress } = useHyperliquid();

	const config = getExchangeMethodConfig(method);
	const exchange = config.client === "user" ? user : trading;

	const mutationKey = config.useClientKey ? ["hl", method, clientKey] : ["hl", method];

	const mutationFn = (params: ExchangeParams<M>): Promise<ExchangeResponse<M>> => {
        const subaccountMethods=new Set(["order","cancel","cancelByCloid","batchModify","modify","updateLeverage","updateIsolatedMargin","twapOrder","twapCancel","scheduleCancel"]);
        const ownerMethods=new Set(["approveAgent","approveBuilderFee"]);
        if(vaultAddress&&!subaccountMethods.has(method)&&!ownerMethods.has(method))throw new Error("Switch to Main account for transfers, withdrawals and account management.");
        const scope=vaultAddress&&subaccountMethods.has(method)?{vaultAddress}:undefined;
		if (!exchange && config.client === "trading") {
            if (typeof window !== "undefined") window.dispatchEvent(new Event("x1:setup"));
            throw new Error("Trading approval required. Complete the approval, then submit your trade again.");
        }
        assertExchange(exchange);
		const fn = (exchange as ExchangeClient)[method] as (...args: unknown[]) => Promise<ExchangeResponse<M>>;
		if ((config.injectBuilder || method === "approveBuilderFee" || method === "approveAgent") &&
 (!builderConfig?.b || /^0x0{40}$/i.test(builderConfig.b))) {
 throw new Error("Trading setup is unavailable: configure VITE_BUILDER_ADDRESS.");
 }
 if (config.injectBuilder && params != null && typeof params === "object") {
			return fn.call(exchange, { ...params, builder: builderConfig }, ...(scope?[scope]:[]));
		}
		return params !== undefined ? fn.call(exchange, params, ...(scope?[scope]:[])) : fn.call(exchange, ...(scope?[scope]:[]));
	};

	return useMutation({
		...options,
		mutationKey,
		mutationFn,
	});
}
