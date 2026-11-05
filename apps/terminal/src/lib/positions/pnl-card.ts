export interface PnlCardData {
	symbol: string;
	dex?: string;
	side: "LONG" | "SHORT";
	leverage: number;
	roe: number;
	pnl: number;
	entryPrice: string;
	markPrice: string;
	timestamp: string;
}
export { buildPnlCardSvg } from "./pnl-card-horizon";

export async function downloadPnlCard(svg: string, symbol: string): Promise<void> {
	const image = new Image();
	const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
	try {
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("Could not render the position card."));
			image.src = svgUrl;
		});
		const canvas = document.createElement("canvas");
		canvas.width = 2400;
		canvas.height = 1520;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Image export is unavailable in this browser.");
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		const blob = await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				(value) => (value ? resolve(value) : reject(new Error("Could not export the position card."))),
				"image/png",
			),
		);
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `x1-${symbol.replace(/[^a-z0-9_-]/gi, "-")}-pnl.png`;
		document.body.append(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	} finally {
		URL.revokeObjectURL(svgUrl);
	}
}
