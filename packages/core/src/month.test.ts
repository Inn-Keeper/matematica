import { describe, expect, it } from "vitest";
import { stepDateWithinMonth } from "./month";

describe("stepDateWithinMonth", () => {
  it("moves one day within the selected month", () => {
    expect(stepDateWithinMonth("2026-08-09", -1)).toBe("2026-08-08");
    expect(stepDateWithinMonth("2026-08-09", 1)).toBe("2026-08-10");
    expect(stepDateWithinMonth("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("stays on the current date at month boundaries", () => {
    expect(stepDateWithinMonth("2026-08-01", -1)).toBe("2026-08-01");
    expect(stepDateWithinMonth("2026-08-31", 1)).toBe("2026-08-31");
  });
});
