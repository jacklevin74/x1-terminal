import {createFileRoute} from "@tanstack/react-router";
import {isLocalKeysHost} from "@/lib/remote-keys/demo";
import {RemoteKeysPage} from "@/components/remote-keys/remote-keys-page";
export const Route=createFileRoute("/keys")({component:()=> <RemoteKeysPage demo={isLocalKeysHost()&&new URLSearchParams(location.search).get("mode")!=="live"} />});
