# Cashflow calculator

This module adapts the Cashflow calculator from personal-finance-dashboard into a browser-local, full-page feature. The [route](../../routes/cashflow/+page.svelte) owns editable inputs, synchronization with the [settings controller](../settings/README.md), the balance-sheet period preference, and composition of [monthly-income and balance-sheet views](../components/views/cashflow/). Annual model values use the shared [USD formatter](../text/README.md) for display. The [income model](income.ts) owns normalization, income-mode conversion, and calculations; it has no browser state, listeners, timers, or teardown.

## Calculation contract

The initial illustration is $120,000 annual gross income, a 24% effective tax rate, $12,000 in annual retirement contributions, and no other deductions. Its annual net income is $79,200 and monthly net income is $6,600. Hourly assumptions start at 40 hours per week and 52 working weeks per year.

| Quantity | Calculation |
| --- | --- |
| Annual gross | Annual salary, or hourly rate × hours per week × weeks worked |
| Annual taxes | Annual gross × effective tax rate / 100 |
| Annual net | max(0, annual gross − annual taxes − retirement contributions − other deductions) |
| Monthly net | Annual net / 12 |

The reference's policy is retained: empty, invalid, nonfinite, and negative input values read as zero, rates are clamped to 0–100%, and net income has a zero floor. All six numeric inputs and mode conversions use the [shared number-input adapter](../calculator/presentation/number-input.ts), backed by Scratchpad’s lexer. Dollar signs, comma/underscore digit separators, and case-insensitive k/m/b/t suffixes are accepted, including `$125k`. Percentage inputs take percentage points, such as `24`, without a `%` suffix. Expressions and declarations remain in Scratchpad. Retirement contributions and other deductions are subtracted after estimated taxes; they do not reduce the tax basis. The effective tax rate is supplied by the user, with no tax-bracket or payroll-rule calculation. Overflow while annualizing valid finite inputs returns an explanation instead of displaying infinite results.

Switching annual/hourly modes converts the current income using the saved work assumptions. The implementation retains numerical precision rather than rounding an intermediate hourly rate to cents, so repeated mode changes do not progressively change take-home pay. A blank income stays blank; converting an annual amount without positive working hours produces zero, following the reference. An overflowing conversion preserves the existing inputs and mode. Values stay unrounded until USD display.

## Route state and presentation

The route renders deterministic defaults during SSR, adopts the root controller’s saved `cashflow_inputs_v1` working copy on mount, and writes subsequent edits to the working copy in the root-owned [settings controller](../settings/README.md), backed by the [storage primitive](../state/README.md). Normalization accepts only the expected field types and retains intentional empty strings. Editing state belongs to the mounted route, while its saved working copy belongs to the root settings controller and one browser profile; there is no account, remote API, or cross-tab synchronization. The shell's initialization spinner hides default/restored-state changes before revealing the view.

Inputs occupy the wider left column on desktop. Monthly net income and the gross/taxes/contributions/deductions balance sheet sit to the right and follow the inputs on small screens. Hourly assumptions appear when hourly mode is selected. The shared `OptionSwitch` highlights the selected Annual/Hourly label while its track keeps a neutral color, matching the Amount/Percentage control in Amortization. Clear empties all six numeric inputs while keeping the income mode; Reset restores the saved Settings preset, including mode and work assumptions; the reference illustration applies until a custom preset is saved. Both have pointer and keyboard hover text and share the same persisted state as ordinary edits. Fields supply the dark ground required by the shared form-control contract.

The balance sheet has its own Annual/Monthly `OptionSwitch`, initially Annual. Monthly divides each annual line item and net income by twelve before currency formatting, without changing the model or the separate monthly take-home summary. Displayed cents can differ slightly when summing individually rounded monthly rows. This presentation choice persists separately under `cashflow_monthly_balance_v1`, is restored on route mount, and survives both individual and global calculator resets. The page-level assumptions `InfoNote` has a centered maximum width of 56rem and left-aligned text; notes inside cards use their available container width.

Extend the model when a new feature changes the financial rules, a feature component for its presentation or transient interaction, and the route for composition or persistence. Shared input-card framing remains in the reusable component layer, while income fields and financial summaries retain their feature contracts. Tax-basis adjustments, payroll calendars, additional contribution modes, or negative-net reporting require an explicit change to the calculation contract and reconciliation tests.

## Validation

The [model tests](../tests/cashflow/income.test.ts) cover the reference illustration, annual/hourly equivalence, fractional work assumptions, the tax basis, zero-floor behavior, normalized storage, invalid values, and finite-number boundaries. Run the [application gates](../../../README.md#run-and-validate) and exercise mode conversion, persistence, Clear/Reset, both themes, mobile layout, navigation, and startup rendering in the browser.
