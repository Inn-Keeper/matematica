# Matematica Mobile Date Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the crashing mobile native date picker with an accessible, dependency-free day stepper constrained to the selected month.

**Architecture:** Add one pure date-step helper to the existing core month utilities and cover it with focused Vitest tests. The current mobile month screen will render previous/next controls over its existing ISO date state, then remove the unused Expo UI picker dependency and verify the app reaches sign-in without the Worklets crash.

**Tech Stack:** TypeScript, React 19, React Native 0.86, Expo 57, Vitest, pnpm.

## Global Constraints

- Keep transaction dates as ISO `YYYY-MM-DD` strings.
- Keep date selection inside the selected month.
- Preserve the existing initial-date and month-change reset behavior.
- Use no calendar grid, modal picker, free-form date field, new mobile dependency, or custom development client.
- Give both step buttons accessibility labels and disabled boundary states.
- Make no route, database, API, authentication, web, or transaction-persistence changes.
- Follow red-green TDD for the pure date helper.
- Prefix repository commands with `rtk`.

---

### Task 1: Add the In-Month Date Step Helper

**Files:**

- Create: `packages/core/src/month.test.ts`
- Modify: `packages/core/src/month.ts`

**Interfaces:**

- Consumes: an ISO date string and `delta: -1 | 1`.
- Produces: `stepDateWithinMonth(date: string, delta: -1 | 1): string`.
- Contract: return the adjacent ISO calendar date when it remains in the same month; otherwise return the original date.

- [ ] **Step 1: Write the failing helper tests**

Create `packages/core/src/month.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `rtk pnpm --filter @matematica/core test -- month`

Expected: FAIL because `stepDateWithinMonth` is not exported from `month.ts`.

- [ ] **Step 3: Implement the minimum helper**

Append to `packages/core/src/month.ts`:

```ts
export function stepDateWithinMonth(date: string, delta: -1 | 1): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const stepped = new Date(Date.UTC(year, month - 1, day + delta))
    .toISOString()
    .slice(0, 10);
  return stepped.slice(0, 7) === date.slice(0, 7) ? stepped : date;
}
```

Do not add parsing modes or arbitrary deltas; every caller needs only one day backward or forward.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `rtk pnpm --filter @matematica/core test -- month`

Expected: both `stepDateWithinMonth` tests pass.

- [ ] **Step 5: Run core typechecking**

Run: `rtk pnpm --filter @matematica/core typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit the helper**

```bash
rtk git add packages/core/src/month.ts packages/core/src/month.test.ts
rtk git commit -m "feat(core): step dates within selected month"
```

---

### Task 2: Replace the Native Picker with the Day Stepper

**Files:**

- Modify: `apps/mobile/src/app/index.tsx`
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: `stepDateWithinMonth(date, delta)`, `monthDateBounds(month)`, and the screen's existing `date` state.
- Produces: an inline previous/date/next control whose center label is formatted with `Date.prototype.toLocaleDateString`.

- [ ] **Step 1: Remove the native picker wiring**

In `apps/mobile/src/app/index.tsx`:

- Add `stepDateWithinMonth` to the `@matematica/core` import.
- Delete the `@expo/ui/community/datetime-picker` import.
- Delete `Platform` from the `react-native` import.
- Delete `datePickerOpen`, `setDatePickerOpen(false)` from the month reset effect, and the complete conditional `DateTimePicker` block.

Keep `const { min, max } = monthDateBounds(month);` because the new buttons use those values for disabled state.

- [ ] **Step 2: Format the visible date label**

After the existing `monthLabel`, add:

```ts
const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
```

The noon timestamp prevents a timezone offset from visually changing the ISO calendar day.

- [ ] **Step 3: Render the accessible stepper**

Replace the picker trigger and conditional picker with:

```tsx
<View
  style={[
    row,
    {
      justifyContent: "space-between",
      backgroundColor: color.cardAlt,
      borderRadius: 10,
    },
  ]}
>
  <Pressable
    onPress={() => setDate((value) => stepDateWithinMonth(value, -1))}
    disabled={date === min}
    accessibilityRole="button"
    accessibilityLabel="Previous transaction day"
    accessibilityState={{ disabled: date === min }}
    style={{
      paddingHorizontal: 16,
      paddingVertical: 10,
      opacity: date === min ? 0.35 : 1,
    }}
  >
    <Text style={{ color: color.text, fontSize: 18 }}>←</Text>
  </Pressable>
  <Text style={{ color: color.textSecondary }}>Date {dateLabel}</Text>
  <Pressable
    onPress={() => setDate((value) => stepDateWithinMonth(value, 1))}
    disabled={date === max}
    accessibilityRole="button"
    accessibilityLabel="Next transaction day"
    accessibilityState={{ disabled: date === max }}
    style={{
      paddingHorizontal: 16,
      paddingVertical: 10,
      opacity: date === max ? 0.35 : 1,
    }}
  >
    <Text style={{ color: color.text, fontSize: 18 }}>→</Text>
  </Pressable>
</View>
```

Run Prettier after editing so the inline style objects wrap according to the repository format.

- [ ] **Step 4: Remove the unused dependency**

Run: `rtk pnpm --filter mobile remove @expo/ui`

Expected: `@expo/ui` disappears from `apps/mobile/package.json`; pnpm updates only the related lockfile entries that are no longer reachable.

- [ ] **Step 5: Run the mobile static checks**

Run: `rtk pnpm --filter mobile typecheck`

Expected: PASS with no missing imports or JSX type errors.

Run: `rtk pnpm exec prettier --write apps/mobile/src/app/index.tsx apps/mobile/package.json pnpm-lock.yaml`

Expected: Prettier completes successfully.

- [ ] **Step 6: Commit the mobile replacement**

```bash
rtk git add apps/mobile/src/app/index.tsx apps/mobile/package.json pnpm-lock.yaml
rtk git commit -m "fix(mobile): replace crashing native date picker"
```

---

### Task 3: Verify the Repository and Mobile Launch

**Files:**

- No production files expected.

**Interfaces:**

- Consumes: the completed core helper and mobile day stepper.
- Produces: static, bundle, and simulator evidence that the change works and does not reintroduce the Worklets crash.

- [ ] **Step 1: Run complete repository verification**

Run: `rtk pnpm verify`

Expected: typecheck, lint, format check, all core tests, and the production web build pass.

- [ ] **Step 2: Export the iOS bundle**

Run: `rtk pnpm --filter mobile exec expo export --platform ios --output-dir dist/ios`

Expected: Expo completes an iOS export in the ignored `apps/mobile/dist/ios` directory without bundle errors.

- [ ] **Step 3: Launch the iOS simulator flow**

Run: `rtk pnpm --filter mobile ios`

Expected: Expo starts Metro, installs or opens Expo Go, bundles the app, and leaves the Matematica process running instead of returning to the simulator home screen.

- [ ] **Step 4: Assert the sign-in surface is reachable**

With the simulator showing Matematica, run:

`rtk maestro hierarchy | rtk rg 'matematica|you@email.com|Sign in'`

Expected: the hierarchy contains the app title, email input, and sign-in action. There must be no new Expo Go crash report with an `EXC_BAD_ACCESS` Worklets stack in `~/Library/Logs/DiagnosticReports`.

- [ ] **Step 5: Confirm delivery state**

Run: `rtk git status --short --branch`

Expected: `main` is clean and ahead of `origin/main` only by the design, plan, and implementation commits. Do not push until explicitly requested.
