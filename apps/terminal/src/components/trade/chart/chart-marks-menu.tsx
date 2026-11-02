import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChartMarksStore, toggleChartMarks } from "@/stores/use-chart-marks-store";

export function ChartMarksMenu({children}:{children:ReactNode}){
 const hidden=useChartMarksStore(state=>state.hidden);
 const [point,setPoint]=useState<{x:number;y:number}|null>(null);
 const menu=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!point)return;
  menu.current?.querySelector("button")?.focus();
  const close=(event:Event)=>{if(!menu.current?.contains(event.target as Node))setPoint(null);};
  const key=(event:KeyboardEvent)=>{if(event.key==="Escape")setPoint(null);};
  window.addEventListener("pointerdown",close);window.addEventListener("keydown",key);window.addEventListener("scroll",close,true);
  return()=>{window.removeEventListener("pointerdown",close);window.removeEventListener("keydown",key);window.removeEventListener("scroll",close,true);};
 },[point]);
 return <div className="flex-1 min-h-0" onContextMenu={event=>{event.preventDefault();setPoint({x:Math.max(8,Math.min(event.clientX,window.innerWidth-220)),y:Math.max(8,Math.min(event.clientY,window.innerHeight-56))});}}>
  {children}
  {point && createPortal(<div ref={menu} role="menu" aria-label="Chart options" className="fixed z-50 min-w-52 rounded border border-stroke-weak bg-surface p-1 shadow-xl" style={{left:point.x,top:point.y}}><button type="button" role="menuitem" className="w-full rounded px-3 py-2 text-left text-sm text-fg hover:bg-fill-hover focus:bg-fill-hover focus:outline-none" onClick={()=>{toggleChartMarks();setPoint(null);}}>{hidden?"Show marks on bars":"Hide marks on bars"}</button></div>,document.body)}
 </div>;
}
