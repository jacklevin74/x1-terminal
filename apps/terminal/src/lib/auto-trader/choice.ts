import { AutoTraderResponseError } from "./api";
import { validateSettings } from "./targets";
import type { AutoTraderSettings } from "./types";

export interface ChoiceFields {
	follow?: string;
	followLeverage?: number;
	basket?: string[];
}

export const COPY_UNAVAILABLE =
	"Copying one trader is not available yet. The bot will ignore the choice until the server supports it.";
export const BASKET_UNAVAILABLE =
	"A custom basket is not available yet. The bot will ignore the choice until the server supports it.";

export function copyFields(trader: string, leverage: number): ChoiceFields {
	return { follow: trader.toLowerCase(), followLeverage: leverage };
}

export function basketFields(basket: string[] | undefined): ChoiceFields {
	return basket ? { basket } : {};
}

export function withChoice(settings: AutoTraderSettings, fields: ChoiceFields): AutoTraderSettings {
	const { follow: _f, followLeverage: _l, basket: _b, ...rest } = settings;
	return {
		...rest,
		...(fields.follow ? { follow: fields.follow, followLeverage: fields.followLeverage } : {}),
		...(fields.basket ? { basket: fields.basket } : {}),
	};
}

function sameList(a: string[] | undefined, b: string[] | undefined) {
	if (!a || !b) return !a && !b;
	return a.length === b.length && a.every((x, i) => x.toLowerCase() === b[i].toLowerCase());
}

export function sameChoice(settings: AutoTraderSettings | undefined, fields: ChoiceFields) {
	return (
		(settings?.follow?.toLowerCase() ?? undefined) === (fields.follow?.toLowerCase() ?? undefined) &&
		(fields.follow ? settings?.followLeverage === fields.followLeverage : true) &&
		sameList(settings?.basket, fields.basket)
	);
}

export function unavailableText(fields: ChoiceFields) {
	return fields.follow ? COPY_UNAVAILABLE : BASKET_UNAVAILABLE;
}

interface SubmitChoice {
	current: AutoTraderSettings | undefined;
	fields: ChoiceFields;
	universe: readonly string[];
	send: (body: AutoTraderSettings) => Promise<unknown>;
	reload: () => Promise<AutoTraderSettings | undefined | null>;
}

/** Saves the copy or basket choice. Any server error, or a save that drops the fields, leaves the bot as it was. */
export async function submitChoice({ current, fields, universe, send, reload }: SubmitChoice) {
	if (!current || sameChoice(current, fields)) return false;
	const next = validateSettings(withChoice(current, fields), universe);
	try {
		await send({ ...next, exclude: next.exclude ?? [] });
	} catch (e) {
		if (e instanceof AutoTraderResponseError) throw new Error(unavailableText(fields));
		throw e;
	}
	const saved = await reload();
	if (saved !== null && !sameChoice(saved, fields)) throw new Error(unavailableText(fields));
	return true;
}
