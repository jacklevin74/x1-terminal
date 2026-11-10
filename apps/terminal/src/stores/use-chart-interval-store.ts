import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RESOLUTIONS } from "@/lib/chart/resolution";
export function validChartResolution(value: unknown): string {
 const normalized = value === "D" ? "1D" : value === "W" ? "1W" : value === "M" ? "1M" : value;
 return typeof normalized === "string" && Object.hasOwn(RESOLUTIONS, normalized) ? normalized : "60";
}
export const useChartIntervalStore = create<{resolution:string}>()(persist(()=>({resolution:"60"}),{
 name:"x1-chart-interval",
 merge:(saved,current)=>({...current,resolution:validChartResolution((saved as {resolution?:unknown})?.resolution)}),
}));
export function setChartResolution(resolution:string) {useChartIntervalStore.setState({resolution:validChartResolution(resolution)});}
