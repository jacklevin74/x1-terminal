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
function xml(text: string): string {
 return text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
}
export function buildPnlCardSvg(data: PnlCardData): string {
 const gain = Number.isFinite(data.pnl) ? data.pnl >= 0 : data.roe >= 0;
 const accent = gain ? "#50d8bd" : "#ff809c";
 const background = gain ? "#061b19" : "#210f19";
 const roe = Number.isFinite(data.roe) ? `${data.roe >= 0 ? "+" : ""}${(data.roe * 100).toFixed(1)}%` : "—";
 const pnl = Number.isFinite(data.pnl) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(data.pnl) : "—";
 const leverage = Number.isFinite(data.leverage) && data.leverage > 0 ? `${data.leverage}X` : "—";
 const rings = Array.from({ length: 17 }, (_, index) => `<circle cx="1010" cy="345" r="${105 + index * 32}" opacity="${(0.25 - index * 0.011).toFixed(3)}"/>`).join("");
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
 <defs><linearGradient id="shade" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="#071014"/></linearGradient></defs>
 <rect width="1200" height="760" fill="url(#shade)"/>
 <g fill="none" stroke="${accent}" stroke-width="1.4">${rings}</g>
 <path d="M0 647L1200 103M0 710L1200 166M0 584L1200 40" stroke="${accent}" opacity=".05"/>
 <g font-family="Arial, Helvetica, sans-serif">
 <text x="64" y="85" font-size="43" font-weight="700" letter-spacing="-2" fill="${accent}">X1</text>
 <text x="135" y="83" font-size="25" letter-spacing="6" fill="#e7f7f3">TERMINAL</text>
 <text x="1136" y="79" text-anchor="end" fill="#9bb6b1" font-size="15" letter-spacing="3">POSITION SNAPSHOT</text>
 <text x="1002" y="397" text-anchor="middle" font-size="155" font-weight="700" fill="${accent}" opacity=".12">X1</text>
 <text x="64" y="221" fill="#effffc" font-size="36" font-weight="700">${xml(data.symbol.slice(0, 22))}</text>
 <text x="64" y="267" fill="${accent}" font-size="23" letter-spacing="2">${data.side} ${leverage}${data.dex ? `  ·  ${xml(data.dex.slice(0, 20))}` : ""}</text>
 <text x="56" y="438" fill="${accent}" font-size="${roe.length > 9 ? 112 : 148}" letter-spacing="-6">${roe}</text>
 <text x="66" y="491" fill="#a7bfba" font-size="21">UNREALIZED PNL <tspan dx="17" fill="${accent}" font-size="30" font-weight="600">${xml(pnl)}</tspan></text>
 <text x="64" y="589" fill="#9bb6b1" font-size="19">Entry price</text>
 <text x="350" y="589" fill="#9bb6b1" font-size="19">Mark price</text>
 <text x="64" y="633" fill="#f0fffb" font-size="31">${xml(data.entryPrice)}</text>
 <text x="350" y="633" fill="#f0fffb" font-size="31">${xml(data.markPrice)}</text>
 <path d="M64 680H1136" stroke="#8ca8a3" opacity=".2"/>
 <text x="64" y="716" fill="#9bb6b1" font-size="15">Hyperliquid · ${xml(data.timestamp)} · Unrealized returns may change</text>
 <text x="1136" y="716" text-anchor="end" fill="${accent}" font-size="16" letter-spacing="2">X1 TERMINAL</text>
 </g></svg>`;
}

export async function downloadPnlCard(svg: string, symbol: string): Promise<void> {
 const image = new Image();
 const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
 try {
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not render the position card.")); image.src = svgUrl; });
  const canvas = document.createElement("canvas"); canvas.width = 2400; canvas.height = 1520;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not export the position card.")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `x1-${symbol.replace(/[^a-z0-9_-]/gi, "-")}-pnl.png`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
 } finally { URL.revokeObjectURL(svgUrl); }
}
