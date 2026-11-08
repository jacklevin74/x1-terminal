import { createContext, useContext, type ReactNode } from "react";
export const TerminalBrandContext = createContext<ReactNode>(null);
export function useTerminalBrand() { return useContext(TerminalBrandContext); }
