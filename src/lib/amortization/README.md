# Amortization model

This module owns fixed-rate loan assumptions, validation, monthly payment calculation, and period aggregation. The [Amortization route](../../routes/amortization/+page.svelte) owns editing, working-copy synchronization with the [settings controller](../settings/README.md), composition of the summary, payment chart, options rail, and schedule from [feature views](../components/views/amortization/). USD formatting uses the shared [text presentation policy](../text/README.md). The model has no browser state, chart dependency, external resources, or teardown requirement.

The model adapts the personal-finance-dashboard amortization calculator: a purchase price, down payment entered as dollars or a percentage, whole-year term, and annual interest rate produce monthly principal/interest payments. The initial illustration is a $450,000 purchase with 20% down, 30 years, and 6.5% interest. The route preserves the reference's stacked principal/interest visual and year/quarter/month grouping, using the existing [chart library](../components/charts/README.md).

## Inputs and validation

Clear empties all four numeric inputs, clears the current chart tooltip, and focuses purchase price while retaining the chosen down-payment mode and chart grouping. Reset restores the saved [Settings preset](../settings/README.md), including its mode and grouping; the reference illustration is used until a custom preset is saved. Both actions update the same browser-local input state as manual edits, so an intentionally empty form also survives navigation and reload.

`LoanInputs` keeps edits as strings so empty or incomplete inputs are not silently converted into financial assumptions. Every numeric field uses the [shared number-input adapter](../calculator/presentation/number-input.ts), which delegates dollar signs, decimal fractions, comma/underscore digit separators, and case-insensitive k/m/b/t suffixes to Scratchpad’s lexer. Thus `$125k`, `$1,250.50`, and `1_250` retain the same numerical meaning across views. Empty, malformed, and negative loan values remain invalid. Percentage fields take percentage points such as `6.5`, without a `%` suffix. Mode conversions expand scientific notation back into a decimal string without rounding, so the resulting input remains readable by that same lexer. `normalizeLoanInputs` validates storage field types independently and supplies defaults for missing fields; `calculateAmortization` validates the numerical meaning before allocating a schedule.

| Assumption | Supported range |
| --- | --- |
| Purchase price | Greater than zero, up to $1 trillion |
| Down payment | Zero through the purchase price, or 0–100% |
| Term | 1–100 whole years |
| Annual rate | 0–100%, nominal with monthly compounding |

Invalid assumptions return an explanatory message rather than a plausible-looking zero payment. The term bound caps schedule allocation at 1,200 rows. A 100% down payment produces a zero payment and empty schedule; an interest-free loan divides principal evenly across its months.

## Calculation and grouping

For financed principal `P`, monthly rate `r`, and `n` monthly payments, the payment is `P * r / (1 - (1 + r)^(-n))`; at `r = 0`, it is `P / n`. `log1p` and `expm1` preserve precision for very small positive rates. The remaining balance is the present value of the remaining payments, avoiding accumulated subtraction error or an artificial final balloon for high rates and long terms. Each payment records principal retired, interest, and remaining balance; the last balance is zero.

Money stays unrounded in the model. The view components format USD cents only for display, so displayed rounded rows can differ by a few cents from adding displayed totals. This is an estimate, not a lender's cent-rounded servicing ledger. Taxes, insurance, fees, extra payments, and variable rates are outside the model. Total loan payments include financed principal and interest and exclude the upfront down payment.

`PAYMENT_RESOLUTIONS` defines the available choices for both the rail and Settings. `getResolutionPayment` scales the monthly installment to the selected resolution and `getResolutionPaymentLabel` supplies the matching heading, so the summary card's headline figure reads Annual, Quarterly, or Monthly payment as the rail changes; the loan totals beside it are lifetime figures and do not scale. `groupPayments` aggregates one schedule into years, quarters, or months. It preserves total principal and interest and carries each period's final balance. Keys include the year to remain unique, while shorter labels and year labels support the chart's secondary axis. Both chart and table consume these same periods; neither recomputes the loan independently. The chart fits the available container width at every resolution. Axis labels thin as needed, and dense monthly or quarterly charts use year labels; every bar retains its full period identity for the floating pointer tooltip and table. The payment-chart component owns width-dependent axis labels and transient hover; it discards hover associated with a replaced schedule. The tooltip follows the hovered segment and closes on pointer leave, scrolling, resolution changes, or route teardown.

## State and extension

The route starts from deterministic defaults during SSR and adopts the root controller’s saved `amortization_inputs_v1` working copy on mount. Subsequent edits replace the working copy in the root-owned [settings controller](../settings/README.md), which persists it through the [browser persistence primitive](../state/README.md). The route registers an Amortization options rail and releases it on navigation. Year/Quarter/Month selection lives in this rail because it groups both the chart and table; the chart’s Principal/Interest legend is centered beneath the plot. Its Show tooltips switch defaults on and remembers its choice under `amortization_tooltips_v1`; disabling it removes the floating tooltip immediately and suppresses subsequent hover bubbles. The shell supplies the desktop sidebar and mobile drawer, toggled by its button or Shift R outside text fields. Data stays in the browser profile; there is no account, backend, or cross-tab synchronization. Changing down-payment mode converts the existing figure so toggling preserves its monetary meaning.

Add new loan behavior here when it changes the schedule's policy. Keep chart drawing generic and validate assumptions before computation. Extra payments or lender-specific rounding would require an explicit model contract, updated summaries, and conservation/payoff tests, not a presentation-only adjustment.

Run the [application gates](../../../README.md#run-and-validate). The [model tests](../tests/amortization/schedule.test.ts) cover the reference payment, principal/interest conservation, payoff, zero interest, full down payment, period grouping, resolution-scaled payments and labels, malformed storage, invalid inputs, and numerical extremes. Exercise mode conversion, grouping, persistence, responsive chart sizing and pointer tooltips, both themes, and mobile layout in the dev server as well.
