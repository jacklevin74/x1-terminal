// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { keccak256, verifyTypedData } from "viem";
import { clearX1Session, DERIVATION_MESSAGE, DERIVED_KEY_STORAGE, deriveX1PrivateKey, getPhantomProvider, getX1Provider } from "../x1/provider";

const signature = btoa(String.fromCharCode(...Array.from({length: 64}, (_, i) => i + 1)));
afterEach(() => { clearX1Session(); sessionStorage.clear(); localStorage.clear(); vi.unstubAllGlobals(); });
function install(value: unknown = { signature }) {
 const wallet = { connect: vi.fn(async () => {}), signMessage: vi.fn(async (_message: Uint8Array) => (value)) };
 Object.assign(window, { x1_wallet: wallet, x1Wallet: undefined });
 return wallet;
}
describe("X1 derived account", () => {
 it("derives the same Ethereum key from the signature bytes", () => {
  expect(deriveX1PrivateKey(signature)).toBe(keccak256(Uint8Array.from({length: 64}, (_, i) => i + 1)));
  expect(() => deriveX1PrivateKey(btoa("short"))).toThrow("invalid signature");
 });
 it("accepts extension bytes and mobile base64 without changing the derived account", async () => {
  const bytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  const expected = deriveX1PrivateKey(signature);
  for (const result of [{ signature: bytes }, { signature }, bytes, signature]) {
   clearX1Session();
   install(result);
   const [address] = await getX1Provider()!.request({ method: "eth_requestAccounts" });
   expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
   expect(sessionStorage.getItem(DERIVED_KEY_STORAGE)).toBe(expected);
  }
 });
 it("rejects malformed wallet results without persisting a key", async () => {
  for (const result of [{}, null, { signature: "not base64!" }, { signature: new Uint8Array(63) }, { signature: [256] }]) {
   install(result);
   await expect(getX1Provider()!.request({ method: "eth_requestAccounts" })).rejects.toThrow("invalid signature");
   expect(sessionStorage.getItem(DERIVED_KEY_STORAGE)).toBeNull();
   expect(await getX1Provider()!.request({ method: "eth_accounts" })).toEqual([]);
  }
 });
 it("requires an explicit connect and keeps keys in sessionStorage only", async () => {
  const wallet = install();
  const provider = getX1Provider()!;
  expect(await provider.request({ method: "eth_accounts" })).toEqual([]);
  expect(wallet.signMessage).not.toHaveBeenCalled();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  expect(accounts).toHaveLength(1);
  expect(new TextDecoder().decode(wallet.signMessage.mock.calls[0]?.[0] as Uint8Array)).toBe(DERIVATION_MESSAGE);
  expect(sessionStorage.getItem(DERIVED_KEY_STORAGE)).toBe(deriveX1PrivateKey(signature));
  expect(localStorage.length).toBe(0);
  clearX1Session();
  expect(await provider.request({ method: "eth_accounts" })).toEqual([]);
  expect(sessionStorage.getItem(DERIVED_KEY_STORAGE)).toBeNull();
 });
 it("signs EIP-712 data with the derived account", async () => {
  install();
  const provider = getX1Provider()!;
  const [address] = await provider.request({ method: "eth_requestAccounts" });
  const data = { domain: { name: "X1 Test", version: "1", chainId: 1 }, types: { Test: [{ name: "value", type: "string" }] }, primaryType: "Test" as const, message: { value: "approval" } };
  const sig = await provider.request({ method: "eth_signTypedData_v4", params: [address, JSON.stringify(data)] });
  expect(await verifyTypedData({ ...data, address, signature: sig })).toBe(true);
 });
 it("uses Phantom’s Ethereum provider without falling back to another injected wallet", () => {
  const ethereum = { request: vi.fn() };
  Object.assign(window, { ethereum, phantom: undefined });
  expect(getPhantomProvider()).toBeUndefined();
  Object.assign(window, { phantom: { ethereum } });
  expect(getPhantomProvider()).toBe(ethereum);
 });
});

it("signs the real builder-fee SDK approval with the X1-derived owner account",async()=>{
 install();const provider=getX1Provider()!;const [address]=await provider.request({method:"eth_requestAccounts"});
 const {createWalletClient,custom,serializeSignature,zeroAddress}=await import("viem");
 const {ExchangeClient}=await import("@nktkas/hyperliquid");
 const {toHyperliquidWallet}=await import("../../../../../packages/hl-react/src/wallet");
 const {ApproveBuilderFeeTypes}=await import("@nktkas/hyperliquid/api/exchange");
 type Payload={action:{hyperliquidChain:"Mainnet";signatureChainId:`0x${string}`;maxFeeRate:string;builder:`0x${string}`;nonce:number};signature:{r:`0x${string}`;s:`0x${string}`;v:number}};
 const request=vi.fn(async(_endpoint:string,_payload:Payload)=>({status:"ok",response:{type:"default"}}));
 const wallet=createWalletClient({account:address,transport:custom(provider)});
 const exchange=new ExchangeClient({wallet:toHyperliquidWallet(wallet,address)!,transport:{isTestnet:false,request} as unknown as import("@nktkas/hyperliquid").HttpTransport});
 const builder="0x95e1642b6c06e06e6ad9412a90e908dcb09f6c1a";
 await exchange.approveBuilderFee({builder,maxFeeRate:"0.05%"});
 expect(request).toHaveBeenCalledTimes(1);const payload=request.mock.calls[0][1];expect(payload.action).toMatchObject({type:"approveBuilderFee",builder,maxFeeRate:"0.05%",hyperliquidChain:"Mainnet"});
 const signature=serializeSignature({...payload.signature,v:BigInt(payload.signature.v)});
 expect(await verifyTypedData({address,domain:{name:"HyperliquidSignTransaction",version:"1",chainId:parseInt(payload.action.signatureChainId),verifyingContract:zeroAddress},types:ApproveBuilderFeeTypes,primaryType:"HyperliquidTransaction:ApproveBuilderFee",message:payload.action,signature})).toBe(true);
});
