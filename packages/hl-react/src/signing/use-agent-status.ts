import type { ExtraAgentsResponse, MaxBuilderFeeResponse } from "@nktkas/hyperliquid";
import { type Address, zeroAddress } from "viem";
import { useConnection } from "wagmi";
import { useInfo } from "../hooks/useInfo";
import { useHyperliquid } from "../provider";
import { readAgentFromStorage, useAgentWalletStorage } from "./agent-storage";
import { isAgentApproved, isBuilderFeeApproved } from "./agent-utils";
import type { BuilderConfig } from "./types";

export interface AgentRequirements {
	needsBuilderFee: boolean;
	needsAgent: boolean;
	signaturesRequired: number;
	isReady: boolean;
}

export interface UseAgentStatusResult extends AgentRequirements {
	isLoading: boolean;
	agentAddress: Address | null;
	refetch: () => Promise<AgentRequirements>;
}

function deriveRequirements(
	builderFeeData: MaxBuilderFeeResponse | undefined,
	extraAgentsData: ExtraAgentsResponse | undefined,
	localAgentPublicKey: Address | undefined,
	builderConfig: BuilderConfig | undefined,
): AgentRequirements {
	const hasBuilderConfig = !!builderConfig?.b;
	const builderFeeKnown = !hasBuilderConfig || builderFeeData !== undefined;
	const extraAgentsKnown = extraAgentsData !== undefined;

	const needsBuilderFee =
		hasBuilderConfig && builderFeeKnown && !isBuilderFeeApproved(builderFeeData, builderConfig?.f);
	const needsAgent = extraAgentsKnown && !isAgentApproved(extraAgentsData, localAgentPublicKey);
	const signaturesRequired = (needsBuilderFee ? 1 : 0) + (needsAgent ? 1 : 0);

	return {
		needsBuilderFee,
		needsAgent,
		signaturesRequired,
		isReady: builderFeeKnown && extraAgentsKnown && signaturesRequired === 0,
	};
}

export function useAgentStatus(): UseAgentStatusResult {
	const { env, builderConfig } = useHyperliquid();
	const { address } = useConnection();

	const localAgent = useAgentWalletStorage(env, address);
	const hasBuilderConfig = !!builderConfig?.b;
	const userAddress = address ?? zeroAddress;

	const builderFeeQuery = useInfo(
		"maxBuilderFee",
		{ user: userAddress, builder: builderConfig?.b ?? zeroAddress },
		{ enabled: !!address && hasBuilderConfig, refetchOnWindowFocus: true },
	);

	const extraAgentsQuery = useInfo("extraAgents", { user: userAddress }, { enabled: !!address, refetchOnWindowFocus: true, refetchInterval: 60_000 });

	const isLoading = builderFeeQuery.isLoading || extraAgentsQuery.isLoading;
	const requirements = deriveRequirements(
		builderFeeQuery.data,
		extraAgentsQuery.data,
		localAgent?.publicKey,
		builderConfig,
	);

	async function refetch(): Promise<AgentRequirements> {
		const [feeResult, agentsResult] = await Promise.all([builderFeeQuery.refetch(), extraAgentsQuery.refetch()]);

		if (hasBuilderConfig && feeResult.data === undefined) {
			throw new Error("Could not load builder fee status");
		}
		if (agentsResult.data === undefined) {
			throw new Error("Could not load agent status");
		}

		const savedAgent = address ? readAgentFromStorage(env, address) : null;
        return deriveRequirements(feeResult.data, agentsResult.data, savedAgent?.publicKey, builderConfig);
	}

	return {
		...requirements,
		isReady: !isLoading && requirements.isReady,
		isLoading,
		agentAddress: localAgent?.publicKey ?? null,
		refetch,
	};
}
