import { readSolDepositBalance } from "../solana/deposit-balance";
import { PublicKey, SystemInstruction, Transaction } from "@solana/web3.js";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { sendSolDeposit } from "../solana/phantom-deposit";
const state = vi.hoisted(() => ({
 status: vi.fn(async () => ({ value: null })),
 raw: vi.fn(async (_bytes: Uint8Array) => ""),
 genesis: vi.fn(async () => "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"),
 balance: vi.fn(async () => 1_000_000_000), fee: vi.fn(async () => ({ value: 5000 })),
 block: vi.fn(async () => ({ blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 100 })),
 confirm: vi.fn(async () => ({ value: { err: null as unknown } })),
}));
vi.mock("@solana/web3.js", async importOriginal => {
 const actual = await importOriginal<typeof import("@solana/web3.js")>();
 return { ...actual, Connection: class { getGenesisHash = state.genesis; getBalance = state.balance; getFeeForMessage = state.fee; getLatestBlockhash = state.block; confirmTransaction = state.confirm; getSignatureStatus = state.status; sendRawTransaction = state.raw; } };
});
const source = new PublicKey("9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS");
const destination = "So11111111111111111111111111111111111111112";
const provider = { publicKey: source, connect: vi.fn(async () => ({ publicKey: source })), signAndSendTransaction: vi.fn(async (_transaction: Transaction) => ({ signature: "1".repeat(64) })) };
beforeEach(() => {
 vi.clearAllMocks(); state.genesis.mockResolvedValue("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"); state.balance.mockResolvedValue(1_000_000_000); state.confirm.mockResolvedValue({ value: { err: null } });
 provider.signAndSendTransaction.mockResolvedValue({ signature: "1".repeat(64) });
 vi.stubGlobal("window", { phantom: { solana: provider } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("builds a native SOL transfer from Phantom's Solana account to the Unit address", async () => {
 const submitted = vi.fn(); const current = vi.fn();
 expect(await sendSolDeposit(destination, "0.12", submitted, current)).toBe("1".repeat(64));
 const tx = provider.signAndSendTransaction.mock.calls[0][0];
 const transfer = SystemInstruction.decodeTransfer(tx.instructions[0]);
 expect(transfer.fromPubkey.toBase58()).toBe(source.toBase58());
 expect(transfer.toPubkey.toBase58()).toBe(destination);
 expect(transfer.lamports).toBe(120_000_000n);
 expect(tx.feePayer?.toBase58()).toBe(source.toBase58());
 expect(submitted).toHaveBeenCalledWith("1".repeat(64));
 expect(state.confirm).toHaveBeenCalledOnce();
});
it("rejects a non-mainnet RPC before asking Phantom to connect", async () => {
 state.genesis.mockResolvedValue("devnet");
 await expect(sendSolDeposit(destination, "0.12", vi.fn(), vi.fn())).rejects.toThrow("mainnet RPC");
 expect(provider.connect).not.toHaveBeenCalled(); expect(provider.signAndSendTransaction).not.toHaveBeenCalled();
});
it("requires enough SOL for both the transfer and network fee", async () => {
 state.balance.mockResolvedValue(120_000_000);
 await expect(sendSolDeposit(destination, "0.12", vi.fn(), vi.fn())).rejects.toThrow("network fees");
 expect(provider.signAndSendTransaction).not.toHaveBeenCalled();
});
it("stops when the Hyperliquid account changes before wallet approval", async () => {
 await expect(sendSolDeposit(destination, "0.12", vi.fn(), () => { throw new Error("account changed"); })).rejects.toThrow("account changed");
 expect(provider.signAndSendTransaction).not.toHaveBeenCalled();
});
it("preserves wallet rejection and does not mark a transfer as submitted", async () => {
 provider.signAndSendTransaction.mockRejectedValue(new Error("User rejected")); const submitted = vi.fn();
 await expect(sendSolDeposit(destination, "0.12", submitted, vi.fn())).rejects.toThrow("User rejected");
 expect(submitted).not.toHaveBeenCalled(); expect(state.confirm).not.toHaveBeenCalled();
});
it("reports failed chain confirmation without pretending the deposit succeeded", async () => {
 state.confirm.mockResolvedValue({ value: { err: { InstructionError: [0, "failure"] } } });
 const submitted = vi.fn();
 await expect(sendSolDeposit(destination, "0.12", submitted, vi.fn())).rejects.toThrow("transfer failed on-chain");
 expect(submitted).toHaveBeenCalledOnce();
});

it("does not automatically retry a rate-limited preflight or request a transfer", async () => {
 state.genesis.mockRejectedValueOnce(new Error("429 Too Many Requests - null"));
 await expect(sendSolDeposit(destination, "0.12", vi.fn(), vi.fn())).rejects.toThrow("copy your SOL deposit address");
 expect(state.genesis).toHaveBeenCalledOnce();
 expect(provider.signAndSendTransaction).not.toHaveBeenCalled();
});
it("preserves submitted transaction state when confirmation is rate-limited", async () => {
 state.confirm.mockRejectedValueOnce(new Error("429 Too Many Requests - null"));
 const submitted = vi.fn();
 await expect(sendSolDeposit(destination, "0.12", submitted, vi.fn())).rejects.toThrow("confirmation is unavailable");
 expect(submitted).toHaveBeenCalledWith("1".repeat(64));
 expect(provider.signAndSendTransaction).toHaveBeenCalledOnce();
});

it("offers no spendable maximum when the source has no SOL", async () => {
 state.balance.mockResolvedValue(0);
 expect((await readSolDepositBalance("phantom", destination, vi.fn())).maxLamports).toBe(0n);
});
