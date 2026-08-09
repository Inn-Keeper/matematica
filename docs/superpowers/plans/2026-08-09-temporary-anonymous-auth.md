# Matematica Temporary Anonymous Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let web and mobile enter their existing authenticated month flows through an explicit temporary anonymous sign-in action.

**Architecture:** Add one direct `sb.auth.signInAnonymously()` handler to each existing authentication screen and rely on the current `onAuthStateChange` subscriptions to transition into the app. Keep email magic-link behavior intact, create no shared abstraction, and validate web and mobile as separate anonymous users.

**Tech Stack:** TypeScript, React 19, React Native 0.86, Expo 57, Supabase Auth, pnpm.

## Global Constraints

- Preserve the existing email magic-link form and English UI copy.
- Use an explicit `Continue anonymously` action; never sign users in automatically.
- Disable only the anonymous action while its request is in flight.
- Display Supabase anonymous-auth errors on the existing authentication screen.
- Use the existing public Supabase project key and RLS policies; add no elevated credential.
- Treat web and mobile anonymous sessions as different users.
- Add no route, dependency, shared authentication abstraction, identity-linking flow, or native deep-link fix.
- Apply the approved UI-wiring test exception: use typechecking, linting, builds, and observable runtime behavior instead of adding a component-test framework.
- Prefix repository commands with `rtk`.

---

### Task 1: Add Explicit Anonymous Sign-In on Web

**Files:**

- Modify: `apps/web/src/screens/AuthScreen.tsx`

**Interfaces:**

- Consumes: `sb.auth.signInAnonymously(): Promise<AuthResponse>` and the existing web `onAuthStateChange` subscription in `apps/web/src/App.tsx`.
- Produces: an explicit web action that creates an anonymous session or displays the returned Supabase error.

- [ ] **Step 1: Verify the missing behavior before editing**

Run:

```bash
rtk rg -n "signInAnonymously|Continue anonymously" apps/web/src/screens/AuthScreen.tsx
```

Expected: no matches, confirming that the web authentication screen has no anonymous entry path.

- [ ] **Step 2: Add anonymous request state and handler**

Add this state beside the existing email and status state:

```ts
const [anonymousPending, setAnonymousPending] = useState(false);
```

Add this handler after `sendLink`:

```ts
async function continueAnonymously() {
  setAnonymousPending(true);
  const { error } = await sb.auth.signInAnonymously();
  if (error) setStatus(error.message);
  setAnonymousPending(false);
}
```

Do not set session state directly. `apps/web/src/App.tsx` already subscribes to
`onAuthStateChange` and will render the month screen after success.

- [ ] **Step 3: Render the explicit action**

Inside the existing `<form>`, after the email-status conditional, add:

```tsx
<button
  type="button"
  onClick={continueAnonymously}
  disabled={anonymousPending}
  style={{
    background: color.cardAlt,
    color: color.text,
    border: `1px solid ${color.hairline}`,
    borderRadius: radius.control,
    padding: space.sm,
    fontWeight: 700,
    opacity: anonymousPending ? 0.6 : 1,
  }}
>
  {anonymousPending ? "Signing in..." : "Continue anonymously"}
</button>
```

Keeping the action outside the email-status conditional makes it available
after a magic-link email was sent without changing that message or form.

- [ ] **Step 4: Verify web compilation and linting**

Run:

```bash
rtk pnpm --filter web typecheck
rtk pnpm lint
```

Expected: both commands pass with no errors.

- [ ] **Step 5: Commit the web action**

```bash
rtk git add apps/web/src/screens/AuthScreen.tsx
rtk git commit -m "feat(web): add temporary anonymous sign-in"
```

---

### Task 2: Add Explicit Anonymous Sign-In on Mobile

**Files:**

- Modify: `apps/mobile/src/app/_layout.tsx`

**Interfaces:**

- Consumes: `sb.auth.signInAnonymously(): Promise<AuthResponse>` and the existing mobile `onAuthStateChange` subscription in the same file.
- Produces: an explicit mobile action that creates an anonymous session or displays the returned Supabase error.

- [ ] **Step 1: Verify the missing behavior before editing**

Run:

```bash
rtk rg -n "signInAnonymously|Continue anonymously" apps/mobile/src/app/_layout.tsx
```

Expected: no matches, confirming that the mobile authentication screen has no anonymous entry path.

- [ ] **Step 2: Add anonymous request state and handler**

Add this state beside the existing email and status state:

```ts
const [anonymousPending, setAnonymousPending] = useState(false);
```

Add this handler after `sendLink`:

```ts
async function continueAnonymously() {
  setAnonymousPending(true);
  const { error } = await sb.auth.signInAnonymously();
  if (error) setStatus(error.message);
  setAnonymousPending(false);
}
```

Do not set session state directly. The existing mobile `onAuthStateChange`
subscription will render the Expo Router stack after success.

- [ ] **Step 3: Render the explicit action**

After the email-status conditional and before the authentication screen's
closing `</View>`, add:

```tsx
<View style={{ marginTop: 12 }}>
  <Button
    title={anonymousPending ? "Signing in..." : "Continue anonymously"}
    color={color.textSecondary}
    disabled={anonymousPending}
    onPress={continueAnonymously}
  />
</View>
```

Keeping the action outside the email-status conditional makes it available
after a magic-link email was sent without changing the existing message.

- [ ] **Step 4: Verify mobile compilation and linting**

Run:

```bash
rtk pnpm --filter mobile typecheck
rtk pnpm lint
```

Expected: both commands pass with no errors.

- [ ] **Step 5: Commit the mobile action**

```bash
rtk git add apps/mobile/src/app/_layout.tsx
rtk git commit -m "feat(mobile): add temporary anonymous sign-in"
```

---

### Task 3: Verify Anonymous Authentication and the Core Flow

**Files:**

- Verify only; modify implementation files only if an observed failure is reproduced and separately diagnosed.

**Interfaces:**

- Consumes: the web and mobile anonymous actions, existing category creation, budget upsert, transaction insert, month navigation, rollups, Supabase persistence, and RLS.
- Produces: per-surface runtime evidence without claiming that the two anonymous sessions share an identity.

- [ ] **Step 1: Run the complete repository gate**

Run:

```bash
rtk pnpm verify
```

Expected: core, web, and mobile typechecks; lint; formatting; all core tests;
and the production web build pass. The existing web chunk-size warning is
acceptable.

- [ ] **Step 2: Verify web anonymous entry**

Run:

```bash
rtk pnpm --filter web dev --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`, select `Continue anonymously`, and observe the
month screen.

Expected: the button shows `Signing in...` while pending and the app enters the
month screen without an email link. If no controllable browser is available,
report this runtime step as not executed; a successful build or HTTP response
does not substitute for the UI assertion.

- [ ] **Step 3: Exercise the web first-month flow**

In the web anonymous session:

1. Create an expense category named `Core flow expense`.
2. Confirm its summary row appears with zero planned and actual values.
3. Set its monthly plan to `100.00`.
4. Add a transaction dated inside the selected month with amount `25.50` and
   description `Core flow check`.
5. Confirm planned `100.00`, actual `25.50`, difference `74.50`, and remaining
   `-25.50` in BRL formatting.
6. Change months, return, and reload the page.

Expected: the category, plan, dated transaction, and calculated values remain
correct after navigation and reload.

- [ ] **Step 4: Verify mobile anonymous entry**

Run:

```bash
rtk pnpm --filter mobile ios
rtk maestro hierarchy
```

Select `Continue anonymously` in Expo Go, then inspect the hierarchy again.

Expected: the iPhone simulator reaches `Create your first category` without a
magic link, startup crash, or anonymous-auth error.

- [ ] **Step 5: Exercise the mobile first-month flow**

In the mobile anonymous session, repeat the values from Step 3. Use the date
stepper to choose the transaction date and confirm its previous/next actions
are disabled at the first and last day of the month.

Expected: mobile independently produces planned `100.00`, actual `25.50`,
difference `74.50`, and remaining `-25.50` in BRL formatting. Change months,
return, relaunch the app, and report session and data persistence exactly as
observed.

- [ ] **Step 6: Confirm crash and delivery evidence**

Run:

```bash
rtk rg --files ~/Library/Logs/DiagnosticReports | rtk rg "Expo Go"
rtk git status --short --branch
```

Expected: no new Expo Go crash report was created during the validation. The
worktree is clean apart from previously identified user-owned changes, and the
local branch is ahead of `origin/main` only by the scoped design, plan, and
implementation commits. Do not push until explicitly requested.
