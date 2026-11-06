// @vitest-environment jsdom
import {expect,it,vi} from "vitest";
it("migrates stored light preferences to dark while preserving other settings",async()=>{
 vi.resetModules();localStorage.clear();document.documentElement.className="light";
 const {STORAGE_KEYS}=await import("@/config/app");
 localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS,JSON.stringify({state:{theme:"light",hideSmallBalances:false},version:2}));
 const {useGlobalSettingsActions,useGlobalSettings}=await import("@/stores/use-global-settings-store");
 expect(document.documentElement.classList.contains("dark")).toBe(true);expect(document.documentElement.classList.contains("light")).toBe(false);
 const {createRoot}=await import("react-dom/client");const {act,createElement}=await import("react");
 let hideSmallBalances:unknown,actions:unknown;
 function Probe(){const mod=useGlobalSettingsActions();actions=mod;hideSmallBalances=useGlobalSettings().hideSmallBalances;return null;}
 const host=document.createElement("div"),root=createRoot(host);await act(async()=>root.render(createElement(Probe)));expect(actions).not.toHaveProperty("setTheme");
 expect(hideSmallBalances).toBe(false);
 await act(async()=>root.unmount());localStorage.clear();
});
