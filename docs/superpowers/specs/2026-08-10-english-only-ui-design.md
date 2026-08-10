# Matematica English-Only UI Design

**Date:** 2026-08-10
**Status:** Approved for implementation

## Goal

Remove the remaining Portuguese interface labels so the web and mobile apps
present one consistent English-language UI.

## Approach

Replace the four remaining Portuguese runtime labels directly in their
existing components. Matematica supports one interface language, so do not add
an i18n library, translation catalog, shared strings object, or locale switcher.

## Copy Changes

- Web `Categoria` becomes `Category`.
- Web `fechar` becomes `Close`.
- Web `adicionar` becomes `Add`.
- Mobile `Adicionar` becomes `Add`.

## Locale Rules

- User-visible interface copy and date labels remain English.
- Dates continue to use the existing `en-US` locale.
- BRL remains the only currency and continues to use Brazilian currency
  formatting through the existing `pt-BR` formatter.
- User-entered category names and transaction descriptions are never
  translated.

## Verification

- Scan runtime source for Portuguese UI labels before and after the change.
- Run web and mobile typechecks.
- Run the complete repository verification command.
- Confirm the web app still renders after the React-runtime fix.

## Out of Scope

- Historical design and implementation documents.
- Test fixtures that intentionally verify Unicode handling.
- AI responses produced by the separate `matematica-ai-api` repository.
- Additional locales or runtime language selection.
