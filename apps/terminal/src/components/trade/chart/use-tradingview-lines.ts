import { useEffect, useMemo } from "react";
import { useConnection } from "wagmi";
import { HL_ALL_DEXS } from "@/config/app";
import { buildTradingLines } from "@/lib/chart/trading-lines";
import { useSubscription, useUserPositions } from "@/lib/hyperliquid";
import { getOrderLineLabel } from "@/lib/trade/open-orders";
import type { EntityId, IChartingLibraryWidget } from "@/types/charting_library";

export function useTradingViewLines(widget: IChartingLibraryWidget | null, symbol: string, dex?: string) {
 const { address, isConnected } = useConnection();
 const { getPosition } = useUserPositions();
 const position = isConnected ? getPosition(symbol, dex) ?? getPosition(symbol.split(":").at(-1)!, dex) : undefined;
 const { data } = useSubscription("openOrders", { user: address ?? "0x0", dex: HL_ALL_DEXS }, { enabled: isConnected && !!address });
 const lines = useMemo(() => !isConnected ? [] : buildTradingLines(symbol, position ?? undefined, (data && data.user?.toLowerCase() === address?.toLowerCase() ? data.orders : []).map(order => ({ ...order, label: getOrderLineLabel(order) }))), [isConnected, address, symbol, position, data]);
 useEffect(() => {
  if (!widget) return;
  let active = true;
  const ids: EntityId[] = [];
  const chart = widget.activeChart();
  const draw = () => {
   if (!active) return;
   for (const line of lines) {
    const id = chart.createShape({ time: Math.floor(Date.now() / 1000), price: line.price }, {
     shape: "horizontal_line", text: line.label, lock: true, disableSelection: true, disableSave: true, disableUndo: true, showInObjectsTree: false,
     overrides: { linecolor: line.color, textcolor: line.color, linewidth: 1, linestyle: 2, showLabel: true, showPrice: true, fontsize: 11 },
    });
    if (id !== null) ids.push(id);
   }
  };
  if (chart.dataReady()) draw(); else chart.dataReady(draw);
  return () => { active = false; for (const id of ids) { try { chart.removeEntity(id, { disableUndo: true }); } catch { /* Widget may already be disposed. */ } } };
 }, [widget, lines]);
}
