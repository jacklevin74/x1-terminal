// @vitest-environment jsdom
import { expect, it } from "vitest";
import { setChartResolution, useChartIntervalStore, validChartResolution } from "@/stores/use-chart-interval-store";
it("persists one interval across assets and restores it on reload",async()=>{
 setChartResolution("240");
 expect(JSON.parse(localStorage.getItem("x1-chart-interval")!).state.resolution).toBe("240");
 useChartIntervalStore.setState({resolution:"60"});
 localStorage.setItem("x1-chart-interval",JSON.stringify({state:{resolution:"240"},version:0}));
 await useChartIntervalStore.persist.rehydrate();expect(useChartIntervalStore.getState().resolution).toBe("240");
});
it("normalizes calendar aliases and rejects unsupported saved values",()=>{
 expect(validChartResolution("D")).toBe("1D");expect(validChartResolution("W")).toBe("1W");expect(validChartResolution("nonsense")).toBe("60");expect(validChartResolution("__proto__")).toBe("60");
});
