import { useLayoutEffect, useId } from "react";
import { Link } from "@tanstack/react-router";
import { TradeTerminalPage } from "@/components/trade/trade-terminal-page";
import { TerminalBrandContext } from "@/components/trade/header/terminal-brand";
import "./newtheme.css";

export function NewthemePage() {
 useLayoutEffect(() => {
  const root = document.documentElement;
  const previous = root.getAttribute("data-terminal-theme");
  root.setAttribute("data-terminal-theme", "newtheme");
  return () => {
   if (previous === null) root.removeAttribute("data-terminal-theme");
   else root.setAttribute("data-terminal-theme", previous);
  };
 }, []);
 return <TerminalBrandContext value={<NewthemeBrand />}><TradeTerminalPage /></TerminalBrandContext>;
}

function NewthemeBrand() {
 const gradient = `newtheme-x1-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
 return <>
  <Link to="/" className="newtheme-brand" aria-label="X1 Terminal — return to current theme">
   <span className="newtheme-tile"><svg viewBox="0 0 123 80" aria-hidden="true">
    <path d="M76.9314 0H62.289L42.451 26.1546L23.9103 0H0L29.6265 39.6956L0 80H23.0058L41.8736 54.0388L59.7085 80H82.7143L54.7044 39.7582L85.3119 0H76.9314Z" fill="currentColor" />
    <path d="M85.3125 15.7479L97.3316 0H123.001L123.001 79.9681H104.697L104.697 15.7479H85.3125Z" fill={`url(#${gradient})`} />
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#00c6ff" /><stop offset="1" stopColor="#0072ff" /></linearGradient></defs>
   </svg></span>
   <span className="newtheme-brand-word">TERMINAL</span>
  </Link>
  <span className="newtheme-badge" title="Design preview based on GitHub PR #2">New theme</span>
 </>;
}
