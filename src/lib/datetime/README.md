# Date and time policy

The `datetime` module owns reusable interpretation, validation, and presentation of calendar and time values. Each operation states its calendar, time-zone, and invalid-input policy so callers can choose it deliberately. Keeping those policies visible prevents a display helper from quietly becoming an input validator or a viewer's time zone from changing an aggregation bucket. The module has no Svelte, route, storage, or application-domain dependency.

## Responsibilities and boundaries

Calendar validation, local timestamp display, and UTC period grouping serve distinct boundaries. Keeping their policies separate prevents a permissive display helper from silently becoming an input validator.

| Policy boundary              | Input and output                                                             | Intended boundary                                                     |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Calendar-date validation     | Calendar text to UTC midnight or epoch milliseconds; UTC fields to date text | Validate date-only input and retain calendar-day identity             |
| Local timestamp presentation | Native-parseable timestamp to a local date or date-time label                | Display an event in the viewer/runtime's local time zone              |
| Calendar labels              | English month/weekday labels and UTC month/day presentation                  | Small chart and picker labels after validation                        |
| UTC period grouping          | Timestamps to UTC period keys; ordered keys to labels/ranges                 | Prepare chart-axis data without introducing domain aggregation policy |

## Strict calendar-date parsing

`parseDateISO(raw)` trims surrounding whitespace, requires exactly four year digits and two month/day digits, and constructs UTC midnight. It then compares all UTC fields with the input. That comparison is essential: native `Date` construction normalizes an impossible date such as February 31 into another month. The helper returns `null` instead of accepting that normalization.

```ts
import { parseDateISO, parseDateISOMs } from '#lib/datetime/date.js';

parseDateISO(' 2024-02-29 ')?.toISOString(); // '2024-02-29T00:00:00.000Z'
parseDateISO('2026-02-29'); // null
parseDateISO('2026-2-09'); // null
parseDateISO('2026-02-09T10:00:00Z'); // null: timestamps are another contract
parseDateISOMs('2026-02-09'); // UTC midnight expressed in epoch milliseconds
```

The accepted year range is **0100 through 9999**. `Date.UTC` treats numeric years 0 through 99 as 1900 through 1999; the field-comparison guard consequently rejects input years `0000` through `0099`. The four-digit grammar rejects expanded or signed years. This is the inherited policy, not a claim to support every ISO calendar representation.

`parseDateISOMs(raw)` delegates to the same parser and returns a number or `null`. Do not test a returned timestamp for truthiness: zero is a valid epoch timestamp, and dates before the epoch produce negative values.

`formatDateISO(date)` reads UTC fields and pads only month and day. It assumes a valid `Date` and does not pad the numeric year. Thus `0100-01-02` can be parsed, but formatting the result yields `100-01-02`, which the four-digit parser rejects. **Round-trip date strings are supported for years 1000 through 9999.** An invalid `Date` formats as `NaN-NaN-NaN`. Validate at the input boundary and keep this historical behavior in mind before using the formatter for archival or expanded-year data.

## Local timestamp display

`formatDate(value, fallback = '—')` and `formatDateTime(value, fallback = '—')` parse with native `Date`, then read local fields. The date label uses numeric year, padded month and day; the date-time label also includes padded 24-hour hours, minutes, and seconds. Keeping the time distinguishes separate events on the same day without importing a domain-specific event model.

| Input                       | Display policy                                      |
| --------------------------- | --------------------------------------------------- |
| `undefined` or empty string | Return the caller's fallback, an em dash by default |
| Parseable nonempty text     | Format its local date/time fields                   |
| Unparseable nonempty text   | Return the original text unchanged                  |

Returning malformed source text preserves diagnostic information; it is not validation success. Render it as ordinary escaped text. These helpers do not sanitize HTML, reject native date rollover, choose a business time zone, or normalize different native parser implementations.

A timestamp close to UTC midnight may display on the previous or next local day. Native parsing of a date-only `YYYY-MM-DD` string starts at UTC midnight, so displaying it through local fields can also shift the visible date. Use the strict UTC functions for a calendar-date field that must keep its stated day. Local display on a server can differ from local display in a browser when their time zones differ; choose the rendering owner deliberately if stable SSR/hydration output matters.

## Labels and UTC buckets

`MONTH_LABELS` contains English `Jan` through `Dec`; `WEEKDAY_LABELS` contains `Su` through `Sa`, starting with Sunday. Treat these shared arrays as immutable. They express a fixed English presentation policy rather than locale negotiation.

`formatMonthDayUTC(timestamp)` returns `Mon D` from UTC fields. `formatMonthYear(monthIndex, year)` combines an integer zero-based month with a year; an index outside 0 through 11 falls back to the year alone. Neither helper pads or validates the year.

`monthKeyUTC(timestamp)` and `quarterKeyUTC(timestamp)` parse through native `Date` and read UTC fields. An explicit offset in an input timestamp can therefore place the value in a different UTC month or quarter from its written local date. `quarterOfMonthIndex(index)` maps caller-validated month indices 0 through 11 to quarters 1 through 4; it does not reject values outside that range.

```ts
import {
  monthKeyUTC,
  quarterKeyUTC,
  yearSeparatorAfterGroupIndexes,
  yearSubAxisLabels,
} from '#lib/datetime/time-buckets.js';

monthKeyUTC('2026-01-01T00:30:00+02:00'); // '2025-12'
quarterKeyUTC('2026-01-01T00:30:00+02:00'); // '2025-Q4'

const periods = ['2025-Q3', '2025-Q4', '2026-Q1'];
yearSeparatorAfterGroupIndexes(periods); // [1]
yearSubAxisLabels(periods);
// [{ fromIndex: 0, toIndex: 1, label: '2025' },
//  { fromIndex: 2, toIndex: 2, label: '2026' }]
```

The returned `YearSubAxisLabel` ranges are inclusive indexes into the supplied array. The helpers preserve order, do not sort, and group only adjacent matching year prefixes. If the same year appears again after another year, it forms another range. These shapes can feed chart sub-axis labels and separator positions without making the chart responsible for interpreting timestamps.

`monthLabelFromMonthKey` turns an expected `YYYY-MM` key into `Mon YYYY`. Quarter helpers either strip the year for a group label (`Qn`) or move it after the quarter (`Qn YYYY`). Unmatched quarter separators pass through. These are label adapters for keys already produced by the caller; they are intentionally not strict parsers.

### Permissive input behavior remains visible

| Call                                                              | Result or limitation                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `formatMonthDayUTC('invalid')`                                    | `'undefined NaN'`                                                     |
| `monthKeyUTC('invalid')` / `quarterKeyUTC('invalid')`             | `'NaN-NaN'` / `'NaN-QNaN'`                                            |
| `formatMonthYear(99, 2026)`                                       | `'2026'`                                                              |
| Fractional or `NaN` month index in `formatMonthYear`              | An undefined month label; the range check is not an integer validator |
| `monthLabelFromMonthKey('2025-01-extra')`                         | `'Jan 2025'`; extra segments are ignored                              |
| Invalid/non-finite month-key fields or month outside 1 through 12 | Original key returned                                                 |

Validate untrusted date text before these display/grouping operations. Do not silently broaden the strict parser to match permissive labels, and do not change inherited formatting behavior merely to hide malformed upstream data. A project can introduce a stricter key type or explicit locale/time-zone policy at its boundary.

## Tests and extension

The [UTC date tests](../tests/datetime/date.test.ts) cover actual-calendar validation, whitespace, UTC midnight, epoch values, and the supported-year/formatter distinction. [Local display tests](../tests/datetime/datetime.test.ts) build expectations from local date parts so they hold under different test-process time zones. [Label and bucket tests](../tests/datetime/format-and-time-buckets.test.ts) cover month/quarter labels, inclusive year ranges, input ordering, and permissive invalid-input behavior.

Keep financial calendars, fiscal-year definitions, report windows, and account-specific time-zone choices in the domain. Add them as explicit policy functions with their own tests; none is implied by these UTC calendar buckets. Run the [UI gates](../../../README.md#run-and-validate) when changing these modules, especially when changing a previously preserved edge case.

Add another general date/time operation here only when its input interpretation and output policy can be stated independently of a domain workflow. Keep those policies named and separate instead of expanding a permissive display helper into an implicit validation boundary.
