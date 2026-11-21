import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { fromInstanceMetadata, fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { REGION, SESSION_NAME } from "./kms.js";

// Client for the key provisioner Lambda in the SIGNER account (hl-ws signer/src/follower-provisioner.js +
// terminal-wallets.js). New /api_keys keys are created there, never in this (trading) account, so hl-policy-signer can
// use them. This service only relays the owner's exact signed request: the provisioner verifies the owner's EIP-712
// signature itself, so this host cannot create, bind, enable or delete a key on its own. It can disable one (fail-safe).
//
// Identity: the EC2 instance role assumes x1-signer-key-client (trading account; its only permission is
// lambda:InvokeFunction on the provisioner). The provisioner's resource policy admits only that role.
const ROLE = /^arn:aws:iam::(\d{12}):role\/x1-signer-key-client$/;
const FUNCTION = /^arn:aws:lambda:us-east-2:(\d{12}):function:hl-copybot-provisioner$/;
export const TIMEOUT_MS = 12000;

/** Transport, throttling or a Lambda FunctionError: the outcome is unknown. */
export class ProvisionerUnavailable extends Error {}

export function parseProvisionerConfig({ roleArn, functionArn }) {
	const role = ROLE.exec(roleArn ?? ""),
		fn = FUNCTION.exec(functionArn ?? "");
	if (!role) throw Error("X1_SIGNER_CLIENT_ROLE_ARN is not configured");
	if (!fn) throw Error("X1_PROVISIONER_ARN is not configured");
	if (role[1] === fn[1]) throw Error("The provisioner must live in the signer account, not this account");
	return { roleArn, roleName: "x1-signer-key-client", account: role[1], functionArn };
}

/**
 * invoke(payload) → the provisioner's JSON answer ({ok:true,…} | {ok:false, reason}).
 * Throws ProvisionerUnavailable when the answer is unknown (callers treat that as uncertain, never as a refusal).
 */
export function provisionerClient({ roleArn, functionArn }) {
	const cfg = parseProvisionerConfig({ roleArn, functionArn });
	if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SECRET_ACCESS_KEY)
		throw Error("Static credentials are not permitted");
	const credentials = fromTemporaryCredentials({
		masterCredentials: fromInstanceMetadata({ timeout: 2000, maxRetries: 1 }),
		params: { RoleArn: cfg.roleArn, RoleSessionName: SESSION_NAME, DurationSeconds: 3600 },
		clientConfig: { region: REGION },
	});
	const lambda = new LambdaClient({
		region: REGION,
		maxAttempts: 1,
		credentials,
		requestHandler: { requestTimeout: TIMEOUT_MS, connectionTimeout: 3000 },
	});
	return {
		async verifyIdentity() {
			const sts = new STSClient({ region: REGION, maxAttempts: 1, credentials });
			const id = await sts.send(new GetCallerIdentityCommand({}));
			if (
				id?.Account !== cfg.account ||
				id?.Arn !== `arn:aws:sts::${cfg.account}:assumed-role/${cfg.roleName}/${SESSION_NAME}`
			)
				throw Error("Signer client identity check failed");
		},
		async invoke(payload) {
			let out;
			try {
				out = await lambda.send(
					new InvokeCommand({
						FunctionName: cfg.functionArn,
						InvocationType: "RequestResponse",
						Payload: Buffer.from(JSON.stringify(payload)),
					}),
					{ abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
				);
			} catch (error) {
				throw new ProvisionerUnavailable(String(error?.name ?? "invoke failed").slice(0, 60));
			}
			if (out.FunctionError) throw new ProvisionerUnavailable("function error");
			let data;
			try {
				data = JSON.parse(Buffer.from(out.Payload ?? []).toString("utf8"));
			} catch {
				throw new ProvisionerUnavailable("malformed answer");
			}
			if (!data || typeof data !== "object" || typeof data.ok !== "boolean")
				throw new ProvisionerUnavailable("malformed answer");
			return data;
		},
	};
}
