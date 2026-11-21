import {
	CancelKeyDeletionCommand,
	DisableKeyCommand,
	KMSClient,
	ScheduleKeyDeletionCommand,
} from "@aws-sdk/client-kms";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { fromInstanceMetadata, fromTemporaryCredentials } from "@aws-sdk/credential-providers";

export const REGION = "us-east-2";
export const SESSION_NAME = "x1-ec2-keys";
const ROLE = /^arn:aws:iam::(\d{12}):role\/(x1-ec2-key-lifecycle)$/;

export class KmsDenied extends Error {}
export class KmsState extends Error {}

export function parseRole(arn, name) {
	const match = ROLE.exec(arn ?? "");
	if (!match || match[2] !== name) throw Error(`Role ${name} is not configured`);
	return { arn, account: match[1], name };
}
/** Throws unless the caller identity is the expected assumed role in the expected account. */
export function checkIdentity(identity, role) {
	if (
		identity?.Account !== role.account ||
		identity?.Arn !== `arn:aws:sts::${role.account}:assumed-role/${role.name}/${SESSION_NAME}`
	)
		throw Error(`KMS identity check failed for ${role.name}`);
	return true;
}
const mapError = (error) => {
	const name = error?.name ?? "";
	if (name === "AccessDeniedException" || name === "AccessDenied")
		return new KmsDenied("AWS refused this key operation.");
	if (name === "KMSInvalidStateException" || name === "DisabledException")
		return new KmsState("The key is not in a state that allows this change.");
	return error;
};

/**
 * Lifecycle-only adapter for LEGACY /api_keys keys, created in this trading account before keys moved to the signer
 * account. hl-policy-signer can never use them, so the page offers only disable, delete and cancel-delete. Nothing here
 * creates or enables a key: new keys come from the signer-account provisioner (provisioner.js). The lifecycle role's
 * only grant is in each legacy key's own key policy.
 */
export function kmsAdapter({ lifecycleRoleArn }) {
	const lifecycle = parseRole(lifecycleRoleArn, "x1-ec2-key-lifecycle");
	if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SECRET_ACCESS_KEY)
		throw Error("Static credentials are not permitted");
	const credentials = fromTemporaryCredentials({
		masterCredentials: fromInstanceMetadata({ timeout: 2000, maxRetries: 1 }),
		params: { RoleArn: lifecycle.arn, RoleSessionName: SESSION_NAME, DurationSeconds: 3600 },
		clientConfig: { region: REGION },
	});
	const kms = new KMSClient({ region: REGION, maxAttempts: 1, credentials });
	const send = async (command) => {
		try {
			return await kms.send(command);
		} catch (error) {
			throw mapError(error);
		}
	};
	return {
		async verifyIdentity() {
			const sts = new STSClient({ region: REGION, maxAttempts: 1, credentials });
			checkIdentity(await sts.send(new GetCallerIdentityCommand({})), lifecycle);
		},
		async disable(arn) {
			await send(new DisableKeyCommand({ KeyId: arn }));
		},
		async scheduleDeletion(arn, days) {
			const out = await send(new ScheduleKeyDeletionCommand({ KeyId: arn, PendingWindowInDays: days }));
			return { deletionDate: out.DeletionDate ? new Date(out.DeletionDate).getTime() : null };
		},
		async cancelDeletion(arn) {
			await send(new CancelKeyDeletionCommand({ KeyId: arn }));
		},
	};
}
