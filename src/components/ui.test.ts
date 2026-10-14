import { describe, expect, it } from "vitest";
import { pnlBadge, pnlText } from "./ui";

describe("ui pnl tones (Korean convention: profit red, loss blue)", () => {
  it("colors positive as red and negative as blue", () => {
    expect(pnlText(100)).toContain("red");
    expect(pnlText(-100)).toContain("blue");
    expect(pnlText(0)).toContain("zinc");
  });

  it("badges follow the same convention", () => {
    expect(pnlBadge(1)).toContain("red");
    expect(pnlBadge(-1)).toContain("blue");
  });
});
