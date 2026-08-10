# Matematica mobile

Expo client for the Matematica monthly budget flow.

## Local development

Copy `.env.example` to `.env.local`, fill the public Supabase and AI API
values, then run from the repository root:

```bash
pnpm dev:mobile
```

Expo Go is useful for ordinary UI work, but its callback URL is not stable.
Use the `preview-simulator` EAS profile when testing email magic links.

## EAS preview build

```bash
eas env:push preview --path .env.local
eas build --platform ios --profile preview-simulator
```

Supabase must allow `matematica://**` as an authentication redirect URL.
