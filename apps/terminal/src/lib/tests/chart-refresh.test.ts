// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {startChartRefresh} from "@/lib/chart/refresh";
let stop:(()=>void)|undefined;
afterEach(()=>{stop?.();vi.useRealTimers();vi.restoreAllMocks();});
it("refreshes on focus, coalesces focus/visibility events, polls while visible, and pauses when hidden",async()=>{
 vi.useFakeTimers();let visible="visible";vi.spyOn(document,"visibilityState","get").mockImplementation(()=>visible as DocumentVisibilityState);
 const refresh=vi.fn(async()=>{});stop=startChartRefresh(refresh);
 window.dispatchEvent(new Event("focus"));document.dispatchEvent(new Event("visibilitychange"));await vi.advanceTimersByTimeAsync(0);expect(refresh).toHaveBeenCalledTimes(1);
 await vi.advanceTimersByTimeAsync(15000);expect(refresh).toHaveBeenCalledTimes(2);
 visible="hidden";await vi.advanceTimersByTimeAsync(30000);expect(refresh).toHaveBeenCalledTimes(2);
 visible="visible";document.dispatchEvent(new Event("visibilitychange"));await vi.advanceTimersByTimeAsync(0);expect(refresh).toHaveBeenCalledTimes(3);
 stop();await vi.advanceTimersByTimeAsync(30000);window.dispatchEvent(new Event("focus"));expect(refresh).toHaveBeenCalledTimes(3);
});
it("does not overlap slow requests and recovers from a failed fetch",async()=>{
 vi.useFakeTimers();let done!:(v?:unknown)=>void;const refresh=vi.fn().mockImplementationOnce(()=>new Promise(r=>{done=r;})).mockRejectedValueOnce(Error("offline")).mockResolvedValue(undefined);stop=startChartRefresh(refresh);
 window.dispatchEvent(new Event("focus"));await vi.advanceTimersByTimeAsync(30000);expect(refresh).toHaveBeenCalledTimes(1);done();await vi.advanceTimersByTimeAsync(15000);expect(refresh).toHaveBeenCalledTimes(2);await vi.advanceTimersByTimeAsync(15000);expect(refresh).toHaveBeenCalledTimes(3);
});
