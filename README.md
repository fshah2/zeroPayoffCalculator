# 0% APR Payoff Calculator (Frontend-only)

A zero-backend, privacy-friendly calculator that estimates the **minimum monthly payment** needed to pay off a credit card balance **before** a 0% APR promotional expiration date.

- **Runs entirely in the browser** (no server, no database)
- **No tracking, no cookies**
- Persists inputs locally via `localStorage`

## How it works

You enter:
- Balance
- Promo expiration date
- **Monthly payment day (1–31)**
- Start payment month
- Optional extra payment per month

The app:
1. Finds the last payment date that is **strictly before** the promo expiration date.
2. Counts how many monthly payments fit in that window.
3. Computes the minimum required payment (rounded **up** to the nearest cent) so the balance reaches $0 within the eligible payment window.

### Payment day rule (1–31)

If you choose a day that doesn’t exist in some months (e.g., **31** in February), the payment date is clamped to the **last day of that month**.

### Strict-before rule

If the promo expires on a day that would otherwise be a payment date, that payment is **not allowed** (must be before). The last eligible payment becomes the prior month’s payment date.

## Shareable URLs

When you calculate, the page URL updates with query parameters so you can share a prefilled calculator state.

Parameters:
- `b` balance (e.g. `3500.25`)
- `e` promo expiry date (`YYYY-MM-DD`)
- `d` payment day (`1`–`31`)
- `s` start month (`YYYY-MM`)
- `x` extra payment (optional)
- `t` show schedule toggle (`1` or `0`)

Example:
