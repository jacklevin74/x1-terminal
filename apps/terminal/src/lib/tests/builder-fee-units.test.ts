import {expect,it} from "vitest";
import {convertFeeToPercentageString,isBuilderFeeApproved} from "../../../../../packages/hl-react/src/signing/agent-utils";
it("converts tenths of a basis point to the exact approval percentage",()=>{expect(convertFeeToPercentageString(1)).toBe("0.001%");expect(convertFeeToPercentageString(50)).toBe("0.05%");expect(convertFeeToPercentageString("100")).toBe("0.1%");expect(isBuilderFeeApproved(49,50)).toBe(false);expect(isBuilderFeeApproved(50,50)).toBe(true);});
