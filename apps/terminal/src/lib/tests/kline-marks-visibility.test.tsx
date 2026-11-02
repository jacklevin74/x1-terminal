// @vitest-environment jsdom
import {act,createElement} from "react";
import {createRoot} from "react-dom/client";
import {expect,it,vi} from "vitest";
import type {Chart} from "klinecharts";
import {useKlineExecutions} from "@/components/trade/chart/use-kline-executions";
import {useKlineOrderOverlays} from "@/components/trade/chart/use-kline-order-overlays";
import {useKlinePositionOverlays} from "@/components/trade/chart/use-kline-position-overlays";
import {useChartMarksStore} from "@/stores/use-chart-marks-store";
vi.mock("wagmi",()=>({useConnection:()=>({address:"0x123",isConnected:true})}));
vi.mock("@/components/trade/chart/use-execution-fills",()=>({useExecutionFills:()=>[{coin:"BTC",side:"B",time:1800000000000,px:"100",sz:"1",tid:1}]}));
vi.mock("@/lib/chart/execution-overlay",()=>({EXECUTION_OVERLAY:"execution",registerExecutionOverlay:vi.fn()}));
vi.mock("@/lib/hyperliquid",()=>({useUserPositions:()=>({getPosition:()=>({szi:"1",entryPx:"100",liquidationPx:"80"})}),useSubscription:()=>({data:{orders:[{coin:"BTC",isTrigger:false,limitPx:"110",side:"A",orderType:"Limit",reduceOnly:false}]}})}));
it("removes executions, position, liquidation and order overlays while hidden and restores them",async()=>{
 useChartMarksStore.setState({hidden:false});const chart={createOverlay:vi.fn(),removeOverlay:vi.fn()};const ref={current:chart as unknown as Chart};
 function Harness(){useKlineExecutions(ref,"BTC",60000);useKlineOrderOverlays({chartRef:ref,symbol:"BTC"});useKlinePositionOverlays({chartRef:ref,symbol:"BTC"});return null;}
 const root=createRoot(document.createElement("div"));await act(async()=>root.render(createElement(Harness)));expect(chart.createOverlay).toHaveBeenCalledTimes(4);const names=new Set(chart.createOverlay.mock.calls.map(([value])=>value.name));
 chart.removeOverlay.mockClear();await act(async()=>useChartMarksStore.setState({hidden:true}));expect(chart.createOverlay).toHaveBeenCalledTimes(4);expect(new Set(chart.removeOverlay.mock.calls.map(([value])=>value.name))).toEqual(names);
 await act(async()=>root.render(createElement(Harness)));expect(chart.createOverlay).toHaveBeenCalledTimes(4);
 await act(async()=>useChartMarksStore.setState({hidden:false}));expect(chart.createOverlay).toHaveBeenCalledTimes(8);await act(async()=>root.unmount());
});
