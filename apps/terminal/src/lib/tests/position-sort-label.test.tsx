// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { PositionSortLabel } from "@/components/trade/positions/position-sort-label";
import type { PositionSort } from "../positions/sort-positions";
it("updates the active direction when the sort header is clicked", async () => {
 const node = document.createElement("div"); const root = createRoot(node);
 function Probe() {
  const [sort, setSort] = useState<PositionSort>({ key: "pnl", descending: true });
  return createElement(PositionSortLabel, { label: "PNL", field: "pnl", sort, onSort: key => setSort(previous => ({ key, descending: !previous.descending })) });
 }
 await act(async () => root.render(createElement(Probe)));
 const button = node.querySelector("button")!;
 expect(button.getAttribute("aria-label")).toBe("Sort by PNL");
 expect(button.title).toContain("descending");
 await act(async () => button.click());
 expect(button.title).toContain("ascending");
 await act(async () => button.click());
 expect(button.title).toContain("descending");
 await act(async () => root.unmount());
});
