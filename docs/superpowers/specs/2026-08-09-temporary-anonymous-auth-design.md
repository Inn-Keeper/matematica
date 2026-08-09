# Matematica Temporary Anonymous Authentication Design

**Date:** 2026-08-09  
**Status:** Approved for implementation

## Problem

The hosted Supabase project accepts the mobile magic-link request, but the
email link redirects to `http://localhost:3000/#access_token=...`. Matematica
does not pass `emailRedirectTo` when requesting the link and does not handle an
incoming native authentication URL. The token therefore remains in a browser
fragment and no mobile session is created.

Anonymous authentication is enabled temporarily in Supabase so the signed-in
category, budget, transaction, and rollup flows can be exercised before native
magic-link deep linking is implemented.

## Approach

Add one explicit `Continue anonymously` action to the existing web and mobile
authentication screens. The action calls `sb.auth.signInAnonymously()` and
uses the existing `onAuthStateChange` subscription to enter the application.

Do not sign users in automatically. An explicit action prevents silent user
creation and keeps the temporary behavior visible while it is enabled.

## Behavior

- The existing email magic-link form remains unchanged.
- Selecting `Continue anonymously` disables repeated submissions while the
  request is in flight.
- A successful request enters the existing authenticated application flow.
- A failed request displays the Supabase error on the authentication screen.
- Web and mobile anonymous sign-ins create separate users. Validate each
  surface independently and do not claim cross-device identity or shared-data
  parity from these sessions.

## Security

Anonymous users receive normal Supabase authenticated identities. Existing
RLS policies continue to scope rows to `auth.uid()`. The client uses only the
public project key; no service-role credential or RLS bypass is introduced.

## Testing and Verification

- Verify the anonymous action reaches the signed-in month screen on web and
  mobile.
- On each surface, create a category, confirm its zero-value summary row, save
  a monthly budget, add an in-month dated transaction, change months, return,
  and verify the rollup.
- Reload each surface and report session or data persistence exactly as
  observed.
- Run repository typechecking, linting, formatting, tests, and the web build.
- Repeat the iOS simulator launch and confirm that no new Expo Go crash report
  appears.

## Out of Scope

- Automatic anonymous sign-in.
- Linking anonymous identities to permanent accounts.
- Treating separate anonymous sessions as the same user.
- Fixing native magic-link redirects in Expo Go.
- Universal links or production authentication delivery.

## Permanent Follow-Up

Native magic-link authentication needs a stable development or production
build, an allowed `matematica://**` Supabase redirect, an explicit
`emailRedirectTo`, and an inbound URL handler that exchanges the returned
tokens for a session. Expo Go is not the acceptance target for that permanent
flow.
