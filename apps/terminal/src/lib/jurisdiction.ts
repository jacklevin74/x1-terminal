export const RESTRICTED_JURISDICTION_MESSAGE = "You are accessing our products and services from a restricted jurisdiction. We do not allow access from certain jurisdictions including locations subject to sanctions restrictions and other jurisdictions where our services are ineligible for use.";

export async function checkJurisdiction(signal?: AbortSignal): Promise<boolean> {
 const response = await fetch("/api/jurisdiction", { cache: "no-store", signal });
 if (!response.ok) throw new Error("Location check unavailable");
 const data = await response.json();
 if (typeof data?.restricted !== "boolean") throw new Error("Invalid location response");
 return data.restricted;
}

// Product copy for Unit deposit-address fetch failures; this is not IP geolocation.
export function formatDepositAddressError(error: unknown): string {
 const messages: string[] = [];
 let current: unknown = error;
 for (let depth = 0; current && depth < 6; depth++) {
  if (typeof current === "string") { messages.push(current); break; }
  if (typeof current !== "object") break;
  const detail = current as { message?: unknown; shortMessage?: unknown; details?: unknown; cause?: unknown };
  for (const value of [detail.message, detail.shortMessage, detail.details]) if (typeof value === "string") messages.push(value);
  current = detail.cause;
 }
 return messages.some(message => /failed\s+to\s+fetch/i.test(message)) ? RESTRICTED_JURISDICTION_MESSAGE
  : messages[0] ?? "Unable to generate a deposit address.";
}
