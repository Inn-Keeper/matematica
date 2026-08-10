# Matematica English-Only UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every remaining Portuguese runtime label with approved English copy on web and mobile.

**Architecture:** Update literal UI copy in the two existing components and retain the current locale behavior. Add no translation layer because the product supports English only.

**Tech Stack:** TypeScript, React 19, React Native 0.86, Expo 57, pnpm.

## Global Constraints

- User-visible interface copy and date labels are English.
- Dates continue to use `en-US`.
- BRL remains the only currency and continues to use the existing `pt-BR` formatter.
- User-entered data is never translated.
- Add no i18n dependency, translation catalog, shared strings object, or locale switcher.
- Leave historical docs and Unicode parser fixtures unchanged.
- Prefix repository commands with `rtk`.

---

### Task 1: Replace Remaining Portuguese Runtime Labels

**Files:**

- Modify: `apps/web/src/components/CategoryManager.tsx`
- Modify: `apps/web/src/components/SummaryTable.tsx`
- Modify: `apps/mobile/src/app/index.tsx`

**Interfaces:**

- Consumes: the existing web and mobile UI components and locale configuration.
- Produces: English-only runtime labels without changing data, formatting, or behavior.

- [ ] **Step 1: Verify the mixed-language behavior before editing**

Run:

```bash
rtk rg -n -i "\\b(fechar|adicionar|categoria)\\b" apps/web/src apps/mobile/src
```

Expected: four matches: `Categoria`, `fechar`, and `adicionar` on web, plus
`Adicionar` on mobile.

- [ ] **Step 2: Replace the four labels**

Apply these exact changes:

```text
Categoria -> Category
fechar -> Close
adicionar -> Add
Adicionar -> Add
```

Do not modify the date locale, BRL formatter, user data, historical docs, or
Unicode test fixture.

- [ ] **Step 3: Verify the Portuguese labels are absent**

Run:

```bash
rtk rg -n -i "\\b(fechar|adicionar|categoria)\\b" apps/web/src apps/mobile/src
```

Expected: exit 1 with no matches.

- [ ] **Step 4: Verify compilation and repository health**

Run:

```bash
rtk pnpm --filter web typecheck
rtk pnpm --filter mobile typecheck
rtk pnpm verify
```

Expected: both focused typechecks and the full repository gate pass. The
existing web chunk-size warning is acceptable.

- [ ] **Step 5: Commit the runtime cleanup**

```bash
rtk git add apps/web/src/components/CategoryManager.tsx apps/web/src/components/SummaryTable.tsx apps/mobile/src/app/index.tsx
rtk git commit -m "fix(ui): keep interface copy in English"
```
