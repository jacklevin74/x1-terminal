import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useChartMarksStore = create<{ hidden: boolean }>()(persist((): {hidden:boolean} => ({hidden:false}),{
 name:"x1-chart-marks",
 merge:(saved,current)=>({...current,hidden:typeof (saved as {hidden?:unknown})?.hidden==="boolean"?(saved as {hidden:boolean}).hidden:false}),
}));
export function toggleChartMarks(){useChartMarksStore.setState(state=>({hidden:!state.hidden}));}
export function chartMarksLabel(){return useChartMarksStore.getState().hidden?"Show marks on bars":"Hide marks on bars";}
