import {expect,it} from "vitest";
import {apiWalletName,apiWalletBaseName,apiWalletEnv,validateApiWalletAddress} from "@/lib/trade/api-wallets";
const owner=`0x${"ab".repeat(20)}` as const,agent=`0x${"cd".repeat(20)}` as const;
it("builds distinct expiring names within Hyperliquid's limits",()=>{
 expect(apiWalletName("X1 Bot",30,1000)).toBe(`X1 Bot valid_until ${1000+30*86400000}`);
 expect(apiWalletBaseName("X1 Bot valid_until 123")).toBe("X1 Bot");
 expect(()=>apiWalletName("X1 Terminal",30)).toThrow();expect(()=>apiWalletName("a".repeat(17),30)).toThrow();expect(()=>apiWalletName("Bot",181)).toThrow();expect(()=>apiWalletName("Bot valid_until 123",30)).not.toThrow();
});
it("rejects an owner address or invalid API address",()=>{expect(validateApiWalletAddress(agent,owner)).toBe(agent);expect(()=>validateApiWalletAddress(owner,owner)).toThrow();expect(()=>validateApiWalletAddress("0x0",owner)).toThrow();});
it("exports only the generated agent key and public owner/network configuration",()=>{const key=`0x${"11".repeat(32)}` as const;const file=apiWalletEnv(owner,key,"Testnet");expect(file).toContain(`X1_ACCOUNT_ADDRESS=${owner}`);expect(file).toContain(`X1_AGENT_PRIVATE_KEY=${key}`);expect(file).toContain("X1_NETWORK=testnet");});
