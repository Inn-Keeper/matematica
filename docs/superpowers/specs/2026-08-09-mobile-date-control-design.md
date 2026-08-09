# Matematica Mobile Date Control Design

**Date:** 2026-08-09  
**Status:** Approved for implementation

## Problem

The mobile app crashes before sign-in when opened in Expo Go 57.0.6. The crash
reproduces on iOS 18.3 and iOS 26.3 as an `EXC_BAD_ACCESS` on React Native's
JavaScript thread while Worklets initializes through
`JSIWorkletsModuleProxy::toOptimizedObject`. The date picker's
`@expo/ui/community/datetime-picker` import is the narrowest removable startup
path associated with Worklets in the core-flow change.

This replaces the unstable picker path while preserving the approved ability
to choose a transaction date inside the selected month.

## Approach

Use a dependency-free inline day stepper in the transaction form:

`Previous day  |  August 9, 2026  |  Next day`

The center label shows the complete selected date. The adjacent buttons move
one calendar day backward or forward. A button is disabled when its action
would leave the selected month.

This is preferred over a free-form date field, which creates formatting and
validation friction, and over another native picker dependency or custom
development-build requirement.

## Behavior

- The initial date remains today when today belongs to the selected month;
  otherwise it is the month's first day.
- Previous and next move exactly one calendar day while remaining within the
  selected month.
- Changing months resets the date through the existing default-date behavior.
- The saved transaction continues to use the existing ISO `YYYY-MM-DD` value.
- Each step button has an accessibility label and a disabled state at its
  month boundary.

## Code Shape

Add one small pure core helper that returns the adjacent in-month date or the
current date when the requested move would cross a boundary. The mobile screen
uses that helper to update its existing `date` state and format the visible
label with the platform's built-in date formatter.

Remove the `@expo/ui` picker import, picker-open state, picker rendering, and
the direct `@expo/ui` dependency. No route, database, API, or authentication
changes are required.

## Error Handling

The control cannot produce a malformed or out-of-month date. Boundary actions
are disabled in the UI and remain safe if invoked programmatically because the
pure helper returns the unchanged date.

## Testing and Verification

Follow red-green TDD for the helper:

- It moves to the previous and next in-month day.
- It does not cross either month boundary.

Then run the repository verification command, export the iOS bundle, and
repeat the simulator launch assertion through sign-in. If Expo Go still
crashes, inspect the new crash report before making another change.

## Out of Scope

- A calendar grid or modal picker.
- Free-form date entry.
- A new mobile dependency or custom development client.
- Changes to web date entry or transaction persistence.
