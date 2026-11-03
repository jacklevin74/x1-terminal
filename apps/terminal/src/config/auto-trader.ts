const configuredApi = import.meta.env.VITE_COPYBOT_API;
// The hosted service has no CORS support. Use our fixed same-origin proxy.
export const AUTO_TRADER_API = !configuredApi || configuredApi === "https://wxnt-sale-sim.vercel.app/api/copybot" ? "/api/copybot" : configuredApi;
export const AUTO_TRADER_SIGNAL = "/api/auto-trader-signal?view=sent";
export const AUTO_TRADER_BUILDER = "0x95e1642b6c06e06e6ad9412a90e908dcb09f6c1a";
export const AUTO_TRADER_DEADBAND=15;
export const AUTO_TRADER_MIN_EQUITY=15;
export const AUTO_TRADER_AGENT_NAME="X1 AutoTrader";
export const AUTO_TRADER_DEFAULTS={leverage:3,killPct:0.1,include:null,exclude:[],minOrderUsd:10};
