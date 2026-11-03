import { isAddress, zeroAddress, type Address, type Hex } from "viem";
export function apiWalletBaseName(name:string){return name.replace(/ valid_until \d+$/,"").trim();}
export function apiWalletName(name:string,days:number,now=Date.now()){
 const base=apiWalletBaseName(name);
 if(!/^[a-zA-Z0-9 _-]{1,16}$/.test(base))throw new Error("Use 1–16 letters, numbers, spaces, dashes or underscores.");
 if(["x1 terminal","mobile"].includes(base.toLowerCase()))throw new Error("Choose a name different from the terminal's trading key.");
 if(!Number.isInteger(days)||days<1||days>180)throw new Error("Choose an expiry between 1 and 180 days.");
 return `${base} valid_until ${now+days*86400000}`;
}
export function validateApiWalletAddress(value:string,owner:string):Address{
 if(!isAddress(value)||value.toLowerCase()===zeroAddress||value.toLowerCase()===owner.toLowerCase())throw new Error("Enter a separate API wallet address, not your account address.");
 return value as Address;
}
export function apiWalletEnv(owner:Address,key:Hex,network:"Mainnet"|"Testnet"){
 return `# Trading-only agent secret. Keep this file private.\nX1_ACCOUNT_ADDRESS=${owner}\nX1_AGENT_PRIVATE_KEY=${key}\nX1_NETWORK=${network.toLowerCase()}\n`;
}
