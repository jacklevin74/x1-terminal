import {afterEach,expect,it,vi} from "vitest";
import {browserChartTimezone} from "@/lib/chart/timezone";
afterEach(()=>vi.restoreAllMocks());
it.each(["Pacific/Honolulu","America/Toronto","America/Vancouver"])("uses browser timezone %s",zone=>{
 vi.spyOn(Intl,"DateTimeFormat").mockReturnValue({resolvedOptions:()=>({timeZone:zone})} as Intl.DateTimeFormat);
 expect(browserChartTimezone()).toBe(zone);
});
it("normalizes UTC and falls back when browser timezone lookup fails",()=>{
 vi.spyOn(Intl,"DateTimeFormat").mockReturnValue({resolvedOptions:()=>({timeZone:"UTC"})} as Intl.DateTimeFormat);
 expect(browserChartTimezone()).toBe("Etc/UTC");
 vi.mocked(Intl.DateTimeFormat).mockImplementation(()=>{throw Error("unavailable")});
 expect(browserChartTimezone()).toBe("Etc/UTC");
});
