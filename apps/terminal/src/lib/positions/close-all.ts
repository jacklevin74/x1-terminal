export async function closePositionsInSequence<T>(positions: readonly T[], isCurrentAccount: () => boolean, close: (position: T) => Promise<boolean>): Promise<number> {
 let closed = 0;
 for (const position of positions) {
  if (!isCurrentAccount()) throw new Error("Wallet changed. Remaining positions were not closed.");
  if (!await close(position)) break;
  closed++;
 }
 return closed;
}
