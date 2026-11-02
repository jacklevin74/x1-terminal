// @vitest-environment jsdom
import {act,createElement} from "react";
import {createRoot} from "react-dom/client";
import {expect,it} from "vitest";
import {ChartMarksMenu} from "@/components/trade/chart/chart-marks-menu";
import {useChartMarksStore} from "@/stores/use-chart-marks-store";
it("right-click toggles all marks, persists the preference and allows restoring them",async()=>{
 useChartMarksStore.setState({hidden:false});const node=document.createElement("div");document.body.append(node);const root=createRoot(node);
 await act(async()=>root.render(createElement(ChartMarksMenu,null,createElement("div",{id:"chart"}))));
 const open=()=>document.getElementById("chart")!.dispatchEvent(new MouseEvent("contextmenu",{bubbles:true,cancelable:true,clientX:50,clientY:50}));
 await act(async()=>{open();});expect(document.querySelector('[role="menuitem"]')?.textContent).toBe("Hide marks on bars");
 await act(async()=>document.querySelector<HTMLButtonElement>('[role="menuitem"]')!.click());expect(useChartMarksStore.getState().hidden).toBe(true);expect(document.querySelector('[role="menu"]')).toBeNull();expect(JSON.parse(localStorage.getItem("x1-chart-marks")!).state.hidden).toBe(true);
 await act(async()=>{open();});expect(document.querySelector('[role="menuitem"]')?.textContent).toBe("Show marks on bars");await act(async()=>document.querySelector<HTMLButtonElement>('[role="menuitem"]')!.click());expect(useChartMarksStore.getState().hidden).toBe(false);
 await act(async()=>root.unmount());node.remove();
});
