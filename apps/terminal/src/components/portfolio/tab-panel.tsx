import { useState } from "react";
import { type PortfolioData, TABS, type TabId } from "@/lib/portfolio/model";
import { MobileTabRows } from "./mobile-tab-rows";
import { TabsBar } from "./parts";
import { TabTable } from "./tab-table";

function countsOf(data: PortfolioData) {
	return Object.fromEntries(
		TABS.map((t) => [t.id, data.loading[t.id] || data.failed[t.id] ? null : data.rows[t.id].length]),
	) as Record<TabId, number | null>;
}

interface Props {
	data: PortfolioData;
	mobile?: boolean;
}

export function TabPanel({ data, mobile }: Props) {
	const [active, setActive] = useState<TabId>("positions");
	const counts = countsOf(data);

	if (mobile)
		return (
			<div className="mt-6 flex flex-col">
				<div className="border-b border-stroke-weak px-2">
					<TabsBar value={active} onChange={setActive} counts={counts} mobile />
				</div>
				<MobileTabRows tab={active} rows={data.rows} loading={data.loading[active]} failed={data.failed[active]} />
			</div>
		);

	return (
		<section className="flex flex-col rounded-8 bg-surface">
			<div className="flex h-9 items-stretch border-b border-stroke-weak px-3">
				<TabsBar value={active} onChange={setActive} counts={counts} className="h-9 flex-1" />
			</div>
			<TabTable
				tab={active}
				rows={data.rows}
				loading={data.loading[active]}
				failed={data.failed[active]}
				maxHeight={640}
			/>
		</section>
	);
}
