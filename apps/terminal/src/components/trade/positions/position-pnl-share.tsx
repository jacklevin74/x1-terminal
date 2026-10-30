import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { ArrowSquareOutIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import type { Position } from "@/lib/hyperliquid";
import { buildPnlCardSvg, downloadPnlCard } from "@/lib/positions/pnl-card";

export function PositionPnlShare({ position, markPx, symbol, szDecimals }: {
 position: Position; markPx: string | undefined; symbol: string; szDecimals: number;
}) {
 const [open, setOpen] = useState(false);
 const [downloading, setDownloading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const dex = position.coin.includes(":") ? position.coin.split(":")[0] : undefined;
 const svg = open ? buildPnlCardSvg({
  symbol, dex, side: Number(position.szi) > 0 ? "LONG" : "SHORT", leverage: position.leverage.value,
  roe: Number(position.returnOnEquity), pnl: Number(position.unrealizedPnl),
  entryPrice: formatPrice(position.entryPx, { szDecimals }), markPrice: formatPrice(markPx, { szDecimals }),
  timestamp: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
 }) : "";
 return <>
  <button type="button" aria-label={`View ${symbol} position PNL card`} title="View and download position PNL"
   className="inline-flex shrink-0 items-center justify-center rounded p-0.5 text-brand hover:bg-fill-hover focus-visible:outline-2 focus-visible:outline-stroke-focus"
   onClick={() => { setError(null); setOpen(true); }}><ArrowSquareOutIcon className="size-3.5" /></button>
  <Modal open={open} onOpenChange={setOpen}>
   <ModalPopup size="lg" className="!max-w-3xl">
    <ModalHeader><ModalTitle>{symbol} · Position PNL</ModalTitle></ModalHeader>
    <ModalContent className="space-y-3">
     {open && <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`${symbol} position gain or loss, leverage, entry price and mark price`} className="w-full rounded-lg" />}
     <p className="text-xs text-fg-muted">Shows unrealized PNL and return on equity (ROE). Values update while this view is open. Downloading saves the current snapshot.</p>
     {error && <p role="alert" className="text-xs text-error">{error}</p>}
     <Button size="sm" className="w-full" disabled={downloading} iconLeft={<DownloadSimpleIcon className="size-4" />} onClick={async () => {
      setDownloading(true); setError(null);
      try { await downloadPnlCard(svg, symbol); } catch (e) { setError(e instanceof Error ? e.message : "Could not download image."); } finally { setDownloading(false); }
     }}>{downloading ? "Creating image…" : "Download PNG"}</Button>
    </ModalContent>
   </ModalPopup>
  </Modal>
 </>;
}
