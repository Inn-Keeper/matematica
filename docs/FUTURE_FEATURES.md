# Future features

These ideas are intentionally outside the current MVP. Revisit them after the
manual monthly workflow and AI assistant are stable in production.

## Mobile receipt reader

- Capture a receipt with the phone camera or choose an existing photo.
- Extract the date, merchant, total, and useful line items.
- Suggest a category, but always show an editable confirmation screen before
  creating a transaction.
- Treat camera permission, image retention, OCR accuracy, and duplicate receipt
  detection as explicit design decisions.

## Income usage percentage

- Show how much actual income was consumed by actual expenses:
  `expense actual / income actual * 100`.
- Provide monthly and yearly views, with yearly totals calculated from the
  underlying months rather than averaging percentages.
- Handle months with no income without displaying a misleading percentage.

## Guided Excel import

- Accept an Excel workbook and analyze its sheets, headers, dates, categories,
  budgets, and transactions before writing anything.
- Organize detected records into the correct months and surface uncertain
  mappings clearly.
- Review the import with the user one month at a time. Ask questions and allow
  corrections for each month before applying that month.
- Present a final preview, duplicate warnings, and an explicit confirmation.
  Keep the import idempotent and provide a safe rollback path for imported
  batches.
