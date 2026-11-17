# Scratchpad language specification

Scratchpad is a small numeric language for calculations that benefit from named inputs, intermediate values, and written explanations. A program can be a single expression or a sequence of named calculations followed by a result. Alongside ordinary arithmetic, the language provides percentages, magnitude suffixes, mathematical constants, functions, and finite sums and products.

This specification describes the language implemented in the Financial Calculators Scratchpad. All values are numbers; dollar signs and descriptive names help present a calculation but do not introduce currencies, units, or other data types. The final section contains complete programs covering several application domains. Implementation and integration details are documented separately in the [calculator library guide](../src/lib/calculator/README.md).

## Program structure

### Declarations and the result

A **declaration** gives a name to the value of an expression:

```text
samples = 24;
seconds per sample = 2.5;
samples * seconds per sample
```

This program declares `samples` and `seconds per sample`, then produces the result **60**. The names and their values also appear in the workspace's named-values table.

A program consists of zero or more declarations and, optionally, one final expression without a name. That final expression is the program's result. A program ending in a declaration is valid and produces named values without a separate result. To both name a value and show it as the result, declare it and then put its name in the final expression.

Declarations are evaluated in their written order. Each name becomes available only after its declaration, and it can be declared only once in a program. A declaration cannot refer to itself or to a name declared later. `count = count + 1;` therefore does not update a value: it is invalid, whether `count` is undeclared or already declared. Use a new name for a subsequent value.

### Statement separators and whitespace

The semicolon `;` separates statements. It is required between statements and optional after the last statement. A line break is whitespace, not a statement separator: an expression can span several lines, and several declarations can share one line.

Every statement before the last must be a declaration. For example, `2 + 3; 4 + 5` is invalid because its first statement has no name. A single `2 + 3;` is valid. Empty statements, such as a leading `;` or consecutive `;;`, are invalid.

Spaces, tabs, and line breaks may separate expression tokens and surround `=`. They cannot split a number, a magnitude or percent suffix from its number, a built-in word, or the head of a sum or product. Whitespace within a descriptive name follows the [name-matching rules](#matching-a-name-in-an-expression).

An input containing only whitespace and comments is empty and has no calculation.

### Comments

`#` starts a comment that continues to the end of its line. Comments may occupy a whole line or follow part of a statement. A `;` or `=` inside a comment has no syntactic meaning.

```text
distance = 18; # kilometers; this semicolon is part of the comment
hours = 1.5;
distance / hours # kilometers per hour
```

Comments do not end statements. If another statement follows a declaration, place its required `;` before an end-of-line comment or on a later line outside the comment. There is no block-comment syntax.

## Names and declarations

### Valid names

A declaration has the form `name = expression`. Its name is the text to the left of `=`, with comments removed, surrounding whitespace trimmed, and internal whitespace runs reduced to one space.

Names may contain spaces, digits, punctuation, and letters in any script. For example, `batch size`, `sensor A (north)`, `phase-2 output`, and `Δ temperature` are valid names. No quotes or other delimiters are required. The characters `=`, `;`, and `#` retain their structural meanings and cannot be literal parts of a name.

Names are case-sensitive: `load`, `Load`, and `LOAD` are distinct. A name must be nonempty, must not have been declared earlier, and must not be reserved or consist entirely of numeric-looking characters.

| Name category | Rule |
| --- | --- |
| Constants | `e`, `pi`, and `phi` are reserved. |
| Functions | `log`, `lg`, `ln`, `sqrt`, `abs`, `floor`, `ceil`, `fact`, `inv`, and `mod` are reserved. |
| Sum and product heads | Any complete word matching `sum_` or `prod_` followed by a valid index is reserved, including `sum_total` and `prod_step2`. |
| Numeric-looking names | A name made only of digits, whitespace, commas, underscores, decimal points, dollar signs, and percent signs is rejected; examples include `123`, `$12.50`, and `8%`. |
| Other spellings | `PI`, `Sqrt`, `sum`, and `sum_2023` may be declared; none is a reserved spelling. |

A name containing a magnitude letter, such as `2k`, is permitted. Once declared, it refers to that declaration rather than the number 2,000. Descriptive names usually make such ambiguity easier to avoid.

### Matching a name in an expression

An expression can refer to any earlier declaration. At each position, a matching declared name takes priority over numbers, operators, and built-in words. The longest matching declared name wins: if both `size` and `size limit` exist, `size limit + size` refers to the two complete names.

A space within a name matches any nonempty run of whitespace, including a line break. Thus `sample count` and `sample   count` refer to the same name. A name ending in a letter, digit, or underscore cannot match just the beginning of a longer word: declaring `rate` does not declare `rates` or `rate_2`.

Punctuation inside a name remains part of it. If `a-b` has been declared, `a-b` refers to that name; `a - b` instead subtracts separately declared `a` and `b`. Likewise, a longer name such as `log book` can contain a built-in word without calling a function. Use spaces around arithmetic operators and descriptive labels when a name could otherwise resemble an expression.

Declarations are available through the remainder of the program. The only additional scope is the local index introduced by a [sum or product](#index-names-and-scope).

## Numeric literals

### Decimal notation and digit grouping

Numbers use decimal digits and `.` as the decimal point. A leading zero is optional for a fraction: `.75` and `0.75` have the same value. A decimal point must be followed by a digit, so `7.` is invalid. A leading `+` or `-` is an arithmetic sign rather than part of the literal.

Commas and underscores may separate adjacent digits, including digits in the fractional part. They do not affect the value, and groups need not contain three digits. For example, `12_000`, `12,000`, and `12000` are equivalent, as are `0.123_456` and `0.123456`. A separator cannot touch another separator or whitespace: `1,,000`, `1__000`, and `1, 000` are invalid as single numbers. Commas also separate function arguments, subject to the [argument-separator rules](#commas-in-argument-lists).

`$` is ignored in expressions except when it belongs to a matched declared name. `$48.25` therefore has the value 48.25. It does not create a currency type, perform conversion, or cause the result to be formatted as money. Other currency symbols and unit suffixes have no built-in numeric meaning; put units in names or comments instead.

### Magnitude suffixes

A number may end in one magnitude suffix, immediately after its digits. Suffixes are case-insensitive and use decimal scales.

| Suffix | Multiplier | Example | Value |
| --- | --- | --- | --- |
| `k` or `K` | 1,000 | `7.5k` | 7,500 |
| `m` or `M` | 1,000,000 | `0.4M` | 400,000 |
| `b` or `B` | 1,000,000,000 | `3b` | 3,000,000,000 |
| `t` or `T` | 1,000,000,000,000 | `1.2T` | 1,200,000,000,000 |

Grouping, decimal notation, and a dollar sign may be combined with a suffix, as in `$12,500.5k`. The suffix cannot be separated by whitespace, stacked with another suffix, or immediately followed by a letter, digit, or underscore. `3 k`, `3kk`, and `3kg` are invalid numeric expressions.

### Percent suffixes

A final `%` divides a numeric literal by 100. It must immediately follow the digits or a magnitude suffix. For example, `12%` is 0.12, `.5%` is 0.005, and `1.5k%` is 15.

Percentages are ordinary numeric values once read. `80 * 12%` gives 9.6, `80 * (1 + 12%)` gives 89.6, and `80 + 12%` gives 80.12. There is no special percentage adjustment based on the surrounding operator.

`%` applies only to a literal. `12 %`, `%12`, `(6 + 6)%`, and `rate%` are invalid unless the text is part of a previously declared name. To convert an expression from percentage points to a fraction, divide it by 100. To display a fraction in percentage points, multiply it by 100; the numeric result does not automatically gain a percent sign.

For a remainder after division, use `mod(dividend, divisor)`.

### Unsupported numeric notations

Scientific input notation such as `4e6` is not supported; write `4m`, `4000000`, or `4 * 10 ^ 6`. Hexadecimal, binary literals, and mixed-number notation are also unsupported. `2-1/3` means two minus one-third, not two and one-third. Parentheses group expressions; they do not denote a negative accounting amount.

## Expressions and arithmetic

### Operators and precedence

The binary operators are addition `+`, subtraction `-`, multiplication `*`, division `/`, and exponentiation `^`. Prefix `+` and `-` provide signs and may be repeated, as in `--3`.

The following table lists precedence from strongest to weakest. Operators on the same row group in the direction shown.

| Precedence | Construct | Grouping | Example |
| --- | --- | --- | --- |
| 1 | Bracketed expressions, function calls, sums, and products | Explicit brackets | `(2 + 4) * 3` gives 18. |
| 2 | `^` | Right to left | `3 ^ 2 ^ 2` means `3 ^ (2 ^ 2)` and gives 81. |
| 3 | Prefix `+` and `-` | Signs apply to the expression immediately following them at this precedence | `-3 ^ 2` gives -9; `(-3) ^ 2` gives 9. |
| 4 | `*` and `/` | Left to right | `24 / 3 * 2` gives 16. |
| 5 | `+` and `-` | Left to right | `12 - 5 - 2` gives 5. |

An exponent or factor may carry a sign: `4 ^ -2` gives 0.0625, and `3 * -4` gives -12. Exponentiation uses `^`, not `**`.

Multiplication must be explicit. `2pi`, `3(4 + 5)`, and `(2 + 1)(4 + 1)` are invalid. Write `2 * pi`, `3 * (4 + 5)`, and `(2 + 1) * (4 + 1)`.

### Grouping and calls

Parentheses `()`, square brackets `[]`, and braces `{}` all group expressions. They may be nested and mixed, but every opening bracket must close with its own kind. `[2 + {3 * 4}]` is valid; `[2 + 3)` is not. Brackets do not create arrays, lists, objects, or separate statement scopes.

A function call consists of its name followed by arguments inside any of these bracket pairs. Whitespace between the name and the opening bracket is allowed. `sqrt(25)`, `sqrt[25]`, and `sqrt {25}` all give 5. Calls may be nested and their arguments may be full expressions.

## Constants and functions

### Constants

| Name | Meaning | Approximate value |
| --- | --- | --- |
| `e` | Euler's number, the base of natural logarithms | 2.7182818285 |
| `pi` | The ratio of a circle's circumference to its diameter | 3.1415926536 |
| `phi` | The golden ratio, `(1 + sqrt(5)) / 2` | 1.6180339887 |

These are values, not functions. For example, `pi(2)` is invalid; multiplication requires `pi * 2`. Their names must use the lowercase spellings above.

### Function reference

All functions except `mod` take exactly one expression; `mod` takes two. The parameter letters below are placeholders, not names that must be declared.

| Call | Meaning | Domain and behavior |
| --- | --- | --- |
| `log(x)` | Base-10 logarithm | Requires `x > 0` for a finite result. |
| `lg(x)` | Base-2 logarithm | Requires `x > 0` for a finite result. |
| `ln(x)` | Natural logarithm | Requires `x > 0` for a finite result. |
| `sqrt(x)` | Square root | Negative arguments give *Undefined*. |
| `abs(x)` | Absolute value | Returns the nonnegative magnitude of `x`. |
| `floor(x)` | Greatest integer less than or equal to `x` | `floor(-2.4)` is -3. |
| `ceil(x)` | Least integer greater than or equal to `x` | `ceil(-2.4)` is -2. |
| `fact(x)` | Factorial, the product of integers from 1 through `x` | `fact(0)` is 1; negative or fractional arguments give *Undefined*. |
| `inv(x)` | Reciprocal, `1 / x` | Zero gives *Undefined*. |
| `mod(a, b)` | Remainder after dividing `a` by `b` | The remainder has the dividend's sign; zero divisor gives *Undefined*. |

For example, `mod(-14, 4)` is -2, whereas `mod(14, -4)` is 2. `mod` also accepts fractional values; it is not restricted to integer arithmetic.

Factorials through `fact(170)` produce finite results. Larger nonnegative integer arguments overflow and display as *Undefined*. Large factorials are subject to the same floating-point precision limits as other arithmetic. There is no postfix `!` operator.

There are no other built-in functions or user-defined functions. Common operations can be expressed using the available ones: `ln(x) / ln(base)` changes a logarithm's base, and `x ^ inv(n)` expresses a root for positive `x`. There is no built-in `round`, `min`, `max`, or trigonometric function.

### Commas in argument lists

Because commas can group digits as well as separate arguments, calls use a specific rule: **the last required commas directly inside a call's brackets separate its arguments**. Commas inside nested brackets, comments, or matched declared names do not count as separators for the surrounding call.

| Call | Argument separators | Example |
| --- | --- | --- |
| A one-argument function | None; commas can only group digits | `log(10,000)` is the logarithm of 10,000. |
| `mod(a, b)` | The last comma at that bracket level | `mod(10,000, 6)` has dividend 10,000 and divisor 6. |
| `sum_i(body, start, end)` or `prod_i(body, start, end)` | The last two commas at that bracket level | `sum_i(1,500 * i, 1, 3)` has body `1,500 * i` and bounds 1 and 3. |

Use ungrouped digits, underscores, magnitude suffixes, or declared names for the divisor of `mod` and the bounds of sums and products. For example, write `mod(12000, 1000)` or `mod(12000, 1_000)`, and write `sum_i(i, 1000, 2000)` or `sum_i(i, 1k, 2k)`. An extra pair of brackets can also protect grouped digits: `mod(12000, (1,000))` and `sum_i(i, (1,000), (2,000))` are valid.

Do not rely on spaces after commas to distinguish the two uses. `mod(12000, 1,000)` does not mean a divisor of 1,000, and `sum_i(i, 1,000, 2,000)` does not provide the intended two bounds.

## Sums and products

### Syntax and ranges

`sum_index(expression, start, end)` adds the expression for each integer index from `start` through `end`. `prod_index(expression, start, end)` multiplies those values. Both endpoints are included, and the index increases by one on each term.

For example, `sum_n(2 * n, 2, 4)` adds 4, 6, and 8 to give 18. `prod_n(n + 1, 2, 4)` multiplies 3, 4, and 5 to give 60. Each sum or product is itself an expression and can be used in a declaration, arithmetic operation, function argument, or another sum or product.

The two bounds are expressions evaluated once in the surrounding scope before iteration starts. They may be negative, zero, or positive, but must evaluate to safe integers: whole numbers from -9,007,199,254,740,991 through 9,007,199,254,740,991. A fractional, nonfinite, or out-of-range bound gives *Undefined*.

If both bounds are valid and `end < start`, the range is empty. An empty sum is 0 and an empty product is 1. The body must still be valid syntax, but it is not evaluated. There is no descending iteration or optional step argument; use an expression of the index when values should follow another sequence.

### Index names and scope

An index starts with a letter and continues with letters, digits, or underscores. Letters may come from any script. Valid heads include `sum_row`, `prod_n2`, and `sum_α`. Write the operator, underscore, and index as one word; `sum row(...)`, `sum(...)`, and `sum_2(...)` do not introduce a valid index. An index cannot itself be a reserved constant, function, or sum/product head, so `sum_pi(...)` is invalid.

The index exists only inside the first argument, the expression being added or multiplied. It is not added to the workspace's named-values table. The start and end expressions do not see the index introduced by that same call; they see the surrounding declarations and any enclosing index instead.

```text
n = 4;
total = sum_n(n ^ 2, 1, n);
total + n
```

The sum's upper bound uses the declared `n`, whose value is 4. Its body uses the local `n`, successively 1, 2, 3, and 4, giving `total` = 30. The final `n` again means the declared value, so the result is **34**. Without an earlier declaration or enclosing index, a reference to `n` in this sum's upper bound would be invalid.

### Nesting

A sum or product can contain another one in its body. The outer index is available throughout that body, including in the inner call's bounds. An inner index with the same name temporarily takes precedence within its own body; using distinct index names often makes nested expressions easier to read.

```text
sum_row(sum_col(row + col, 1, row), 1, 3)
```

For each `row`, the inner sum runs from `col` = 1 through that row number. The three inner totals are 2, 7, and 15, so the result is **24**. After an inner call ends, any outer index of the same name retains its outer value.

### Term limit

One calculation has a shared budget of **10,000,000 terms** across all sums and products in its declarations and final expression. Outer and inner terms both count. For example, an outer sum of 100 terms whose body contains an inner sum of 100 terms uses 100 + 100 × 100 = 10,100 terms.

If a sum or product would exceed the remaining budget, the calculation stops before evaluating that call's body. Scratchpad shows **Cannot calculate**, identifies the call and its line, and returns no result or named-values table for that attempt. This is a calculation limit, distinct from a numeric *Undefined* value. Reduce the range, simplify the formula, or divide the work into separate calculations.

## Numeric behavior and results

### Precision and formatting

Arithmetic uses binary floating-point numbers rather than exact decimal or symbolic arithmetic. Decimal fractions and sufficiently large integers may be rounded internally. All integers through an absolute value of 9,007,199,254,740,991 are represented exactly; beyond that range, adjacent integers cannot always be distinguished. Very large results may overflow, and very small results may underflow to zero.

Normal display uses digit grouping and at most ten fractional digits, without unnecessary trailing zeros. Nonzero values with absolute magnitude below 0.000001 use scientific display notation with up to six fractional digits in the significand. Negative zero displays as 0. Consequently, `0.1 + 0.2` displays as 0.3, while `0.1 + 0.2 - 0.3` exposes the residual as `5.551115e-17`.

The **Suffixed** option abbreviates the final result with `K`, `M`, `B`, or `T` and at most three fractional digits; even values below 1,000 use that shorter precision when the option is enabled, apart from the very small values shown in scientific notation. Named values retain the normal display format. These settings affect presentation only. A later expression uses the underlying value of a name, not its rounded display text.

Scientific notation can appear in output even though it is not accepted as input. To reuse such a displayed value, translate it to decimal notation or an expression such as `5.551115 * 10 ^ -17`. Copying a rounded display value also loses precision compared with referring to the name in the same program.

### Undefined arithmetic

Syntax can be valid even when a calculation has no finite numeric result. Nonfinite values display as **Undefined**, including division by zero, a logarithm of a nonpositive number, a square root of a negative number, an invalid factorial, invalid iteration bounds, and overflow. Complex numbers are not supported.

Undefined arithmetic does not disable Calculate or stop the rest of a program from being evaluated. A name may display as *Undefined* while an independent final expression remains finite. Internally, nonfinite floating-point values continue through subsequent arithmetic; *Undefined* is their common display label rather than a distinct error value. For example, `inv(1 / 0)` evaluates to 0. Avoid treating every undefined intermediate as interchangeable or assuming it will always propagate to the final result.

### Syntax errors and calculation workflow

Scratchpad checks syntax as the input changes and reports the first problem with a line number. Calculate is disabled while the input is invalid or empty. Valid input is evaluated when Calculate is selected or **Shift Enter** is pressed in the editor; editing the input clears the previous calculation. Enter by itself inserts a line break.

| Problem | Explanation or correction |
| --- | --- |
| Two declarations on separate lines without a separating `;` | Line breaks do not end statements. Put `;` between declarations. |
| An unknown name | Declare it earlier, check its spelling and case, or use one of the supported functions. |
| A second declaration of the same name | Choose a new name for the next value. |
| `2(3 + 4)` | Write `2 * (3 + 4)`; multiplication is explicit. |
| `sqrt 9` | Write `sqrt(9)`; calls require brackets. |
| `5!` | Write `fact(5)`. |
| `17 % 4` | Write `mod(17, 4)` for a remainder. |
| An index used after its sum or product | The index belongs only to the call's first argument. |
| A wrong closing bracket | Match each `(`, `[`, or `{` with its own closer. |

The language has no strings, booleans, comparisons, conditional expressions, arrays, assignments that update an existing name, or general-purpose loops. `=` declares a name; it does not test equality. A declaration with parentheses in its name does not define a callable function. Built-in functions and finite sums and products provide the supported forms of repeated calculation.

## Representative examples

Each block below is a complete, independent program that can be pasted into Scratchpad. Results are described using normal display unless an approximation is stated. Units in names and comments document the intended interpretation; Scratchpad does not check units or convert them automatically.

### Finance: net present value of a project

A project requires a $60,000 outlay today and is expected to generate $16,000 in net cash inflows at the end of each of the next five years. Equipment is expected to sell for another $8,000 at the end of year five. Using an illustrative annual discount rate of 8%, calculate the present value of the future cash flows and subtract the initial outlay.

```text
initial outlay = $60k;
annual net cash inflow = $16k;
project years = 5;
resale proceeds = $8k;
discount rate = 8%;
present value of operating cash flows = sum_year(
  annual net cash inflow / (1 + discount rate) ^ year,
  1, project years
);
present value of resale = resale proceeds / (1 + discount rate) ^ project years;
net present value = present value of operating cash flows
  + present value of resale - initial outlay;
net present value
```

The result is approximately **9,328.03**, in dollars. The operating cash flows have a present value of approximately $63,883.36, and the resale proceeds add approximately $5,444.67. The initial outlay occurs today and is not discounted. The final operating inflow and resale proceeds both occur at the end of year five, so both use the fifth-year discount factor. The positive result means the modeled discounted inflows exceed the outlay by that amount under these assumptions.

The sum's `year` index supplies each discount exponent, and its inclusive range includes all five operating inflows. This example treats the stated cash flows as complete; any additional cash flows would need to be included explicitly. It uses the supplied discount rate rather than calculating a rate of return.

### Accounting: periodic weighted-average inventory cost

A retailer begins a period with 120 units carried at $18 each and purchases another 80 units at $21 each. During the period, it sells 150 units for $32 each. Under the periodic weighted-average method, divide the total cost of goods available for sale by the total units available, then use that average to allocate cost between units sold and ending inventory.

```text
beginning units = 120;
beginning unit cost = $18;
purchased units = 80;
purchase unit cost = $21;
units sold = 150;
selling price per unit = $32;
units available = beginning units + purchased units;
cost of goods available = beginning units * beginning unit cost
  + purchased units * purchase unit cost;
weighted average unit cost = cost of goods available / units available;
cost of goods sold = units sold * weighted average unit cost;
ending units = units available - units sold;
ending inventory cost = ending units * weighted average unit cost;
sales revenue = units sold * selling price per unit;
gross profit = sales revenue - cost of goods sold;
gross profit
```

The result is **1,920**, the gross profit in dollars. The named values show 200 units available at a total cost of $3,840, giving a weighted-average unit cost of $19.20. Cost of goods sold is $2,880, and the remaining 50 units carry an inventory cost of $960. These two cost allocations reconcile to the $3,840 available cost. Sales revenue is $4,800; gross profit subtracts cost of goods sold and does not deduct other operating expenses.

The example assumes the stated quantities and costs include all inventory activity for the period, with no returns, losses, or additional inventory costs. It calculates one average for the entire period; it does not recalculate a moving average after each purchase. Scratchpad evaluates the formulas as written, so a quantity sold greater than the quantity available would produce a negative ending quantity rather than an accounting validation error.

### Packing an order and estimating material cost

A workshop needs to ship 257 parts in cartons that hold 24 parts each. Whole-carton capacity, loose parts, and the number of cartons to buy require different rounding operations.

```text
parts = 257;
parts per carton = 24;
full cartons = floor(parts / parts per carton);
loose parts = mod(parts, parts per carton);
cartons needed = ceil(parts / parts per carton);
unused spaces = cartons needed * parts per carton - parts;
cost per carton = $1.85;
cartons needed * cost per carton
```

The result is **20.35**, the cost of 11 cartons. The named values also show 10 full cartons, 17 loose parts, and 7 unused spaces in the purchased cartons. `floor` counts complete groups, `mod` finds the remainder, and `ceil` includes a partly filled carton.

### Geometry and measurement error

A circular plate has a measured diameter of 48.6 centimeters and a nominal diameter of 50 centimeters. Calculate its area and the magnitude of the area deviation from the nominal plate.

```text
measured diameter (cm) = 48.6;
nominal diameter (cm) = 50;
measured area = pi * [measured diameter (cm) / 2] ^ 2;
nominal area = pi * [nominal diameter (cm) / 2] ^ 2;
equivalent square side (cm) = sqrt(measured area);
relative area error = abs(measured area - nominal area) / nominal area;
100 * relative area error
```

The result is **5.5216**, meaning an area difference of 5.5216%. The equivalent square's side is approximately 43.07 centimeters. Parentheses within the declared diameter names are part of the names, while the square brackets in the area expressions group arithmetic. `abs` reports the magnitude of the deviation regardless of its direction.

### Binary identifiers and storage capacity

A catalog needs distinct identifiers for 50,000 items. The number of bits required is the base-2 logarithm rounded up. A separate calculation converts a fixed record size into a decimal storage estimate.

```text
items = 50k;
identifier bits = ceil(lg(items));
identifier capacity = 2 ^ identifier bits;
unused identifiers = identifier capacity - items;
bytes per record = 1_536;
storage bytes = items * bytes per record;
storage bytes / 1m
```

The result is **76.8** decimal megabytes. The named values show that 16 bits provide 65,536 identifiers, leaving 15,536 unused. Here `1m` means 1,000,000; to express the storage in binary mebibytes, change the final divisor to `2 ^ 20`, yielding **73.2421875**.

### Comparing acoustic intensity levels

For an intensity ratio, the decibel difference is ten times its base-10 logarithm. This example uses explicit powers of ten for small quantities because scientific input notation is unsupported.

```text
reference intensity = 10 ^ -12;
intensity A = 2 * 10 ^ -6;
intensity B = 5 * 10 ^ -7;
level A = 10 * log(intensity A / reference intensity);
level B = 10 * log(intensity B / reference intensity);
level A - level B
```

The result is approximately **6.0206** decibels. Intensity A is four times intensity B, so the difference can also be calculated as `10 * log(4)`. The formula here is for an intensity ratio; it does not use the factor of 20 associated with an amplitude ratio.

### Exponential decay and a target fraction

An illustrative tracer has a half-life of eight days. Use the natural logarithm to obtain its exponential decay constant, then calculate both the fraction remaining after 20 days and the time required to reach 10%.

```text
half life (days) = 8;
decay constant = ln(2) / half life (days);
elapsed days = 20;
remaining fraction = e ^ (-decay constant * elapsed days);
target fraction = 10%;
days to target = -ln(target fraction) * inv(decay constant);
days to target
```

The result is approximately **26.5754** days. The named `remaining fraction` is approximately 0.1767766953, or 17.6777%. The example combines `e`, `ln`, a negative exponent, a literal percentage, and `inv` as an alternative to division.

### Probability of passing a sampling check

Suppose eight independently sampled items each have a 10% chance of a defect. A check passes if at most one is defective. Sum the binomial probabilities for zero and one defect.

```text
sample size = 8;
defect probability = 10%;
allowed defects = 1;
pass probability = sum_d(
  fact(sample size) / [fact(d) * fact(sample size - d)]
    * defect probability ^ d
    * (1 - defect probability) ^ (sample size - d),
  0, allowed defects
);
100 * pass probability
```

The result is **81.310473**, a pass probability of 81.310473%. The factorial ratio counts which items are defective; the two powers give the probability of each such arrangement. The index `d` belongs to the sum's body, and `fact(0) = 1` makes the zero-defect term valid. The calculation assumes independent items with the same defect probability.

### Reliability across stages

Consider a process with four independent stages whose success rates are 99%, 98%, 97%, and 96%. Every stage must succeed for the process to succeed.

```text
stages = 4;
first stage success = 99%;
drop per stage = 1%;
all stages succeed = prod_stage(
  first stage success - (stage - 1) * drop per stage,
  1, stages
);
at least one failure = 1 - all stages succeed;
100 * at least one failure
```

The result is **9.654976**, the percentage chance of at least one failure under the independence assumption. The product is 0.99 × 0.98 × 0.97 × 0.96. Subtracting `1%` here subtracts 0.01 from a probability, which is a one-percentage-point decrease per stage, not a 1% relative decrease.

### Work across triangular task groups

A job has four groups. Group `r` contains `r` tasks, and task `c` in group `r` takes `r + c` minutes. The total requires an inner sum whose endpoint changes with the outer index.

```text
groups = 4;
total minutes = sum_r(
  sum_c(r + c, 1, r),
  1, groups
);
total minutes
```

The result is **50** minutes: the groups contribute 2, 7, 15, and 26 minutes. The inner upper bound sees the outer `r`, while its body sees both `r` and `c`. Neither index becomes a persistent named value.

### A proportional layout with several named outputs

For a design study, split a 1,440-pixel width into a main panel and a sidebar whose widths have the golden ratio. This program intentionally ends in a declaration so that the named-values table is the output.

```text
total width (px) = 1_440;
sidebar width (px) = total width (px) / (1 + phi);
main width (px) = total width (px) - sidebar width (px);
sidebar whole pixels = floor(sidebar width (px));
main whole pixels = total width (px) - sidebar whole pixels;
```

There is no separate final result. The named values show an ideal sidebar width of approximately 550.0311 pixels and a main width of approximately 889.9689 pixels. The whole-pixel version allocates 550 and 890 pixels, preserving the total width by taking the second width as the remainder.
