import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { ImageIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { formatPrice, formatToken } from "@/lib/format";
import { buildPnlCardSvg, downloadPnlCard } from "@/lib/positions/pnl-card";

type Trade = { coin: string; dir: string; px: string; sz: string; closedPnl: string; fee: string; feeToken: string; time: number };
export function TradePnlShare({ fill, symbol, quote, szDecimals }: { fill: Trade; symbol: string; quote: string; szDecimals: number }) {
 const [open,setOpen]=useState(false),[downloading,setDownloading]=useState(false),[error,setError]=useState<string|null>(null);
 const svg=open?buildPnlCardSvg({symbol,dex:fill.coin.includes(":")?fill.coin.split(":")[0]:undefined,side:"LONG",leverage:NaN,roe:NaN,pnl:Number(fill.closedPnl),entryPrice:formatPrice(fill.px,{szDecimals}),markPrice:"",timestamp:new Date(fill.time).toISOString().replace("T"," ").slice(0,19)+" UTC",trade:{direction:fill.dir,quote,size:formatToken(fill.sz,{decimals:szDecimals,symbol,compact:false}),fee:formatToken(fill.fee,{decimals:8,symbol:fill.feeToken,compact:false})}}):"";
 return <>
  <button type="button" aria-label={`View ${symbol} trade PNL card`} title="View and download trade PNL" className="inline-flex shrink-0 items-center justify-center rounded p-0.5 text-brand hover:bg-fill-hover focus-visible:outline-2 focus-visible:outline-stroke-focus" onClick={()=>{setError(null);setOpen(true);}}><ImageIcon className="size-3.5" /></button>
  <Modal open={open} onOpenChange={setOpen}><ModalPopup size="lg" className="!max-w-3xl"><ModalHeader><ModalTitle>{symbol} · Trade PNL</ModalTitle></ModalHeader><ModalContent className="space-y-3">
   {open && <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`${symbol} realized trade PNL, fill price and size`} className="w-full rounded-lg" />}
   <p className="text-xs text-fg-muted">Realized PNL for this fill, before fees.</p>
   {error && <p role="alert" className="text-xs text-error">{error}</p>}
   <Button size="sm" className="w-full" disabled={downloading} iconLeft={<DownloadSimpleIcon className="size-4" />} onClick={async()=>{setDownloading(true);setError(null);try{await downloadPnlCard(svg,symbol);}catch(e){setError(e instanceof Error?e.message:"Could not download image.");}finally{setDownloading(false);}}}>{downloading?"Creating image…":"Download PNG"}</Button>
  </ModalContent></ModalPopup></Modal>
 </>;
}
