import { expect,it,vi } from "vitest";
import { useAgentStatus } from "../../../../../packages/hl-react/src/signing/use-agent-status";
vi.mock("wagmi",()=>({useConnection:()=>({address:`0x${"ab".repeat(20)}`})}));
vi.mock("@hypeterminal/hl-react/provider",()=>({useHyperliquid:()=>({env:"Mainnet",builderConfig:{b:`0x${"ef".repeat(20)}`,f:5}})}));
vi.mock("@hypeterminal/hl-react/signing/agent-storage",()=>({useAgentWalletStorage:()=>null,readAgentFromStorage:()=>({publicKey:`0x${"cd".repeat(20)}`})}));
vi.mock("@hypeterminal/hl-react/hooks/useInfo",()=>({useInfo:(method:string)=>{const data=method==="maxBuilderFee"?5:[{address:`0x${"cd".repeat(20)}`,validUntil:Date.now()+60000}];return {data,isLoading:false,refetch:async()=>({data})};}}));
it("verification reads the newly saved agent rather than the render's old key",async()=>{
 const status=useAgentStatus();expect(status.isReady).toBe(false);expect((await status.refetch()).isReady).toBe(true);
});
