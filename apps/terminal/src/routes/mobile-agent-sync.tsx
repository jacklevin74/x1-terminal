import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/mobile-agent-sync")({
 component: () => <main className="p-8"><h1>Connect on this device</h1><p>X1 Terminal keeps trading keys in this tab. Connect Phantom or X1 Wallet on each device.</p><a href="/">Return to terminal</a></main>,
});
