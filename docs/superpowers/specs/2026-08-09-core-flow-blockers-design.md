# Matematica Core Flow Blockers Design

**Date:** 2026-08-09  
**Status:** Approved for planning

## Goal

Let a new user complete the core monthly-finance loop on both web and mobile:
create a category, set its planned amount, and add a transaction on a chosen
date within the selected month.

## Scope

This change addresses only the confirmed first-use blockers:

- Active categories must appear in the monthly summary before they have a
  budget or transaction.
- Web must lead a user with no active categories directly into category setup.
- Mobile must support category creation and monthly budget editing.
- Mobile must support choosing a transaction date.
- Web and mobile transaction dates must remain inside the selected month.

The existing English UI copy remains unchanged.

## Approach

Keep the existing one-screen month workflow and add inline controls. Do not add
routes, onboarding wizards, seeded financial categories, shared UI packages, or
new dependencies.

The installed `@expo/ui` package supplies the mobile system date picker through
`@expo/ui/community/datetime-picker`.

## Core Rollup

`summarizeMonth` will build rows from:

1. Every non-archived category.
2. Any archived category that has a budget or transaction in the selected
   month.

An active category with no facts receives zero planned, actual, and difference
amounts. This makes the row immediately available to both budget editors while
preserving historical rows for archived categories.

## Web Flow

When there are no active categories, the month screen will present category
setup before the summary and transaction form. The existing category manager
will support an initially-open state instead of introducing a second form.

After the first category is created and data reloads, its zero-valued summary
row appears. The existing planned-amount editor can then create the first
budget.

The quick-add date input will use the selected month's first and last dates as
its minimum and maximum values. The existing default remains today when today
is inside the selected month, otherwise the first day of that month.

## Mobile Flow

The month screen will gain three focused inline capabilities:

- A compact category form with name and expense/income kind. It appears as the
  primary empty state when no active categories exist and remains available as
  a secondary management action afterward.
- An editable planned amount for each active summary row. Saving uses the
  existing `upsertBudget` data function and BRL parser.
- A native date picker in the transaction form, using the already-installed
  `@expo/ui` package. Its selectable range is constrained to the selected
  month.

Changing months resets the transaction date to today when applicable or the
first day of the newly selected month. Category creation and budget saves use
the existing screen error state and reload path.

## Data and Error Handling

No database or API changes are required. The implementation reuses
`addCategory`, `upsertBudget`, `addTransaction`, and `fetchMonthData`.

Invalid category names and planned amounts are rejected before a request. Data
operation failures continue to surface inline through the existing error
state. Broader loading, retry, duplicate-submit, undo, and friendly-error work
remains outside this patch.

## Testing and Verification

The rollup behavior will follow red-green TDD:

- A failing test will require active zero-data categories to appear.
- A failing test will require archived zero-data categories to remain hidden.
- Existing plan/activity and archived-history behavior must remain green.

The project deliberately has no app component-test harness. With the user's
approved limited exception, UI wiring will be verified through TypeScript,
linting, formatting, the complete existing test suite, production web build,
and mobile runtime inspection where the environment supports it. No testing
framework will be added for this patch.

## Out of Scope

- Category rename or archive redesign on mobile.
- Transaction editing, confirmation, or undo.
- Loading and retry states.
- Copy-plan feedback.
- Localization changes.
- Navigation or information-architecture redesign.
- AI assistant changes.
