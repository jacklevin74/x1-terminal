export type RollDirection = "up" | "down";

export interface RollCell {
	key: string;
	char: string;
	prevChar: string | null;
	rolls: boolean;
}

function isDigit(char: string): boolean {
	return char >= "0" && char <= "9";
}

export function parseFormattedNumber(text: string): number | null {
	const negative = /^[^0-9]*[-−]/.test(text);
	const digits = text.replace(/[^0-9.]/g, "");
	if (!digits) return null;
	const value = Number(digits);
	if (!Number.isFinite(value)) return null;
	return negative ? -value : value;
}

export function getRollDirection(prev: string, next: string): RollDirection {
	const a = parseFormattedNumber(prev);
	const b = parseFormattedNumber(next);
	if (a == null || b == null) return "up";
	return b < a ? "down" : "up";
}

export function buildRollCells(prev: string | null, next: string, rollId: number): RollCell[] {
	const chars = Array.from(next);
	const prevChars = prev == null ? null : Array.from(prev);
	return chars.map((char, index) => {
		const fromRight = chars.length - 1 - index;
		const prevChar = prevChars ? (prevChars[prevChars.length - 1 - fromRight] ?? null) : null;
		const rolls = prevChars != null && isDigit(char) && prevChar !== char;
		const rolledFrom = rolls && prevChar != null && isDigit(prevChar) ? prevChar : null;
		return { key: rolls ? `${fromRight}:${rollId}` : String(fromRight), char, prevChar: rolledFrom, rolls };
	});
}
