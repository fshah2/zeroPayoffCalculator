# 0% APR Payoff Calculator

A frontend-only, privacy-friendly calculator that estimates how much you need to pay each month to fully pay off a credit card balance before a 0% APR promotional period expires.

There is no backend, no database, and no tracking. Everything runs entirely in your browser.

---

## What this tool does

You enter:
- Credit card balance
- 0% APR promo expiration date
- Monthly payment day (1–31)
- Start payment month
- Optional extra monthly payment

The calculator:
- Determines the last payment date that is strictly before the promo expiration
- Counts how many monthly payments fit in that window
- Calculates the minimum required monthly payment (rounded up to the nearest cent)
- Optionally shows a month-by-month payment schedule

All calculations assume a 0% APR (no interest).

---

## Payment day rules (1–31)

If you choose a payment day that does not exist in a given month (for example, the 31st in February), the payment date is automatically moved to the last day of that month.

Example:
- Payment day: 31
- February payment date: February 28 (or 29 in leap years)

---

## Promo expiration rule (important)

Payments must occur strictly before the promo expiration date.

If the promo expires on a day that would normally be a payment date, that payment is not allowed and the previous month becomes the final eligible payment.

Example:
- Promo expires: March 15
- Payment day: 15
- The March payment is excluded
- The February payment is the final eligible payment

---

## Accuracy and rounding

- All currency math is done using integer cents (not floating-point dollars)
- Monthly payments are rounded up so the balance reaches $0.00 within the allowed window
- The payment schedule stops once the remaining balance reaches $0.00

---

## Monthly payment schedule

You can toggle “Show monthly payment schedule” on or off at any time.

The schedule:
- Lists each payment date
- Shows the payment amount and remaining balance
- Updates correctly when the toggle is enabled or disabled
- Is saved locally and included in shareable links

---

## Shareable links

After calculating, the page URL updates with parameters representing the current inputs. This allows you to bookmark or share a prefilled calculator state.

Example format:

?b=3500&e=2026-12-15&d=31&s=2026-03&x=50&t=1

Notes:
- Anyone with the link can see the values in the URL
- Do not share links containing sensitive financial information

---

## Disclaimer

Estimates only.

This calculator assumes a 0% APR for the entire period and equal monthly payments made on the selected day.

Payment posting dates, minimums, fees, and promo terms vary by card issuer. Always confirm details with your credit card issuer.


