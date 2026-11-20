# Scratchpad language specification

Scratchpad is a small numeric language for calculations that benefit from named inputs, intermediate values, and written explanations. A program can be a single expression or a sequence of named calculations followed by a result. Alongside ordinary arithmetic, the language provides percentages, magnitude suffixes, mathematical constants, numeric arrays, statistical functions, and finite sums and products.

This specification describes the language implemented in the Financial Calculators Scratchpad. Values are scalar numbers or flat arrays of numbers; dollar signs and descriptive names help present a calculation but do not introduce currencies or units. Arrays are a narrow numeric datatype, not JavaScript arrays exposed to the language. The final section contains complete programs covering several application domains. Implementation and integration details are documented separately in the [calculator library guide](../src/lib/calculator/README.md).

## Purpose and scope

Scratchpad occupies the space between a single-entry handheld calculator and a dedicated calculation or spreadsheet system such as Excel. Its purpose is to make ad hoc calculations easier to write, inspect, and revise while keeping the entire calculation in a short, readable piece of text.

A handheld calculator works well for an isolated expression. As a calculation grows, reusing intermediate results, remembering what each number represents, and retracing the steps can require memory registers, repeated entry, or separate notes. Scratchpad keeps those steps together: inputs have descriptive names, later expressions reuse them, and comments explain assumptions and units. The result remains beside the working that produced it, and named intermediate values can be inspected individually.

The notation is designed to reduce the effort of entering and reading that working. Names such as `annual demand` can read like labels on paper; figures such as `$12.5k` and `6%` retain familiar notation; and sums and products express repeated arithmetic without manually expanding every term. To try another assumption, edit its declaration and calculate again. The program is evaluated from the beginning using the revised input, so dependent values are recalculated together.

The scope is deliberately smaller than a spreadsheet system. A Scratchpad program is an ordered sequence of numeric expressions, with a small set of functions and explicit ranges for sums and products. It does not organize workbooks, manage tabular datasets or cell references, solve equations symbolically, or provide a comprehensive library of financial and accounting models. A calculation's assumptions and formulas belong in the text the user writes. This makes Scratchpad useful for checking a formula, estimating a cost, comparing a few assumptions, or working through a calculation whose reasoning should remain visible without setting up a larger model.

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
| Functions | `log`, `lg`, `ln`, `log_n`, `sqrt`, `n_root`, `abs`, `floor`, `ceil`, `round`, `min`, `max`, `mean`, `median`, `mode`, `sd_p`, `sd_s`, `fact`, `nCr`, `nPr`, `inv`, `mod`, and every spelling in the [trigonometric reference](#trigonometric-functions) are reserved. |
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

Commas and underscores may separate adjacent digits, including digits in the fractional part. They do not affect the value, and groups need not contain three digits. For example, `12_000`, `12,000`, and `12000` are equivalent, as are `0.123_456` and `0.123456`. A separator cannot touch another separator or whitespace: `1,,000`, `1__000`, and `1, 000` are invalid as single numbers. Commas also separate array elements and function arguments, subject to the [array rules](#numeric-arrays-and-unpacking) and [argument-separator rules](#commas-in-argument-lists).

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

The binary operators are addition `+`, subtraction `-`, multiplication `*`, division `/`, and exponentiation `^`. They require scalar numeric operands. At the start of a function argument, unary `*` instead unpacks an array value; it has no arithmetic precedence and cannot appear elsewhere in an expression. Prefix `+` and `-` provide signs and may be repeated, as in `--3`.

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

Parentheses `()` and braces `{}` group expressions. They may be nested and mixed, but every opening bracket must close with its own kind. `(2 + {3 * 4})` is valid; `(2 + 3]` is not. Bare square brackets `[]` create numeric arrays: `[2 + {3 * 4}]` is a one-element array containing 14. Braces do not create objects or separate statement scopes. Replace square brackets previously used for scalar grouping with parentheses or braces. Previously saved results are ignored once after this language change; input text and presentation preferences are preserved, so calculate again after any needed syntax edits.

A function call consists of its name followed by arguments inside any of these bracket pairs. Whitespace between the name and the opening bracket is allowed. `sqrt(25)`, `sqrt[25]`, and `sqrt {25}` all give 5. Calls may be nested and their arguments may be full scalar expressions or unpacked numeric arrays. Square brackets immediately after a function or sum/product head delimit its arguments, so `sqrt[25]` remains a scalar call while `[25]` is an array.

Matching bracket pairs share a color in the editor and syntax examples, with colors cycling by nesting level. Brackets within comments or declared names keep their comment or name color; unmatched or mismatched brackets stay plain.

## Numeric arrays and unpacking

An array is an ordered, immutable, flat collection of numeric scalar values. Write its elements between `[` and `]`, separated by commas. Integer and fractional values may be mixed, and each element may be a numeric expression using earlier bindings, constants, functions, or sums and products. One trailing comma is allowed after the last element, including before whitespace or a comment. `[]` is an empty array; `[,]`, `[1,,2]`, and `[1,,]` are invalid.

```text
base = 4;
measurements = [base, 5.5, 2 * base,];
measurements
```

This returns `[4, 5.5, 8]`. Arrays can be declared, referred to by later statements, aliased (`copy = measurements;`), or used as the final result. They cannot be updated, indexed, sliced, concatenated, or used directly in arithmetic. There are no nested arrays, strings, booleans, objects, comprehensions, or general JavaScript iterables. `[1, "2"]`, `[[1, 2]]`, and `measurements + 1` are rejected during parsing, before Calculate is enabled. Numeric type validation does not require finite arithmetic: `[1, sqrt(-1)]` is valid and displays `[1, Undefined]`.

Every comma at an array's own bracket level separates elements, irrespective of spaces: `[1,000]` contains 1 and 0. Write `[1_000]`, `[1k]`, or `[(1,000)]` for one element containing 1,000. Commas within nested calls, parentheses, braces, comments, or matched declared names retain their own meaning.

At the start of a function argument, unary `*` unpacks an earlier array binding or an anonymous numeric array literal into scalar arguments in its element order:

```text
measurements = [4, 5.5, 8,];
max(2 * 3, *measurements)
```

The result is 8. Here `2 * 3` uses binary multiplication, while `*measurements` supplies three arguments. Unpacking is identified by its position, not by whitespace: `max(* measurements)` is also valid. Multiple unpackings and scalar arguments may be mixed, as in `max(*measurements, 10, *measurements,)`. An empty array supplies no arguments; `empty = []; max(3, *empty)` returns 3, but `max(*empty)` has no arguments and is invalid.

The operand must be a numeric array: an earlier array binding, an anonymous array literal, or either wrapped in parentheses or braces. `max(*[1, 2.5, 3,])` returns 3, and `max(*(measurements))` and `max(*([1, 2]))` are also valid. Scalar operands such as `n = 3; max(*n)`, a bare `*measurements`, and `[*measurements]` are invalid. An unpacking occupies the whole argument; `max(*measurements * 2)` is invalid. An array passed without unpacking, as in `max(measurements)`, is also invalid. Descriptive names and aliases follow the ordinary name-matching rules; a local sum/product index shadows an outer binding of the same name and cannot be unpacked as an array.

Unpacking works with fixed-arity functions as well: `pair = [14, 4]; mod(*pair)` returns 2. The parser knows array lengths and checks the argument count after expansion. `pair = [14, 4]; sqrt(*pair)` is invalid because two expanded arguments do not fit `sqrt`. Sums and products keep their three scalar arguments and do not accept unpacking.

A function call containing unpacking divides at **every comma at that call's own bracket level**, even for a fixed-arity function. Write grouped figures with underscores, suffixes, or parentheses in these calls. For example, `divisor = [4]; mod(1_000, *divisor)` is valid, while `mod(1,000, *divisor)` would supply three arguments. Binary multiplication alone does not change a call's usual comma rules.

## Constants and functions

### Constants

| Name | Meaning | Approximate value |
| --- | --- | --- |
| `e` | Euler's number, the base of natural logarithms | 2.7182818285 |
| `pi` | The ratio of a circle's circumference to its diameter | 3.1415926536 |
| `phi` | The golden ratio, `(1 + sqrt(5)) / 2` | 1.6180339887 |

These are values, not functions. For example, `pi(2)` is invalid; multiplication requires `pi * 2`. Their names must use the lowercase spellings above.

### Function reference

Functions take exactly one expression except `mod`, `nCr`, `nPr`, `n_root`, `log_n`, `arctan2`, and `arctan2_d`, which take two, and `min`, `max`, `mean`, `median`, `mode`, `sd_p`, and `sd_s`, which take one or more scalar arguments after unpacking. The parameter letters below are placeholders, not names that must be declared. Function names are case-sensitive: `nCr` and `nPr` require those capital letters, and inverses use the `arc` prefix rather than aliases such as `asin`.

| Call | Meaning | Domain and behavior |
| --- | --- | --- |
| `log(x)` | Base-10 logarithm | Requires `x > 0` for a finite result. |
| `lg(x)` | Base-2 logarithm | Requires `x > 0` for a finite result. |
| `ln(x)` | Natural logarithm | Requires `x > 0` for a finite result. |
| `log_n(x, base)` | Logarithm of `x` in the chosen base | Requires `x > 0` and a finite positive base other than 1 for a finite result. |
| `sqrt(x)` | Square root | Negative arguments give *Undefined*. |
| `n_root(x, n)` | Real nth root | `n` must be finite and nonzero; negative `x` requires an odd integer degree. |
| `abs(x)` | Absolute value | Returns the nonnegative magnitude of `x`. |
| `floor(x)` | Greatest integer less than or equal to `x` | `floor(-2.4)` is -3. |
| `ceil(x)` | Least integer greater than or equal to `x` | `ceil(-2.4)` is -2. |
| `round(x)` | Nearest integer, with half ties toward positive infinity | `round(2.5)` is 3; `round(-2.5)` is -2. |
| `min(x, ...)` | Least of one or more expressions | `min(4, -2, 8)` is -2; an empty argument list is invalid. |
| `max(x, ...)` | Greatest of one or more expressions | `max(4, -2, 8)` is 8; an empty argument list is invalid. |
| `mean(x, ...)` | Arithmetic mean | Sum of the values divided by their count. |
| `median(x, ...)` | Middle value in numeric sorted order | An even count returns the mean of the middle pair; the original array order is preserved. |
| `mode(x, ...)` | Most frequent value | Ties return the first encountered tied value; all-unique input returns its first value. |
| `sd_p(x, ...)` | Population standard deviation | Square root of the mean squared deviation from the mean; one value returns 0. |
| `sd_s(x, ...)` | Sample standard deviation | Uses divisor `n - 1` for `n` observations; one value gives *Undefined*. |
| `fact(x)` | Factorial, the product of integers from 1 through `x` | `fact(0)` is 1; negative or fractional arguments give *Undefined*. |
| `nCr(n, r)` | Combinations: choose `r` items from `n` without replacement, ignoring order | Both arguments must be nonnegative integers with `r <= n`. |
| `nPr(n, r)` | Permutations: choose `r` items from `n` without replacement, counting order | Both arguments must be nonnegative integers with `r <= n`. |
| `inv(x)` | Reciprocal, `1 / x` | Zero gives *Undefined*. |
| `mod(a, b)` | Remainder after dividing `a` by `b` | The remainder has the dividend's sign; zero divisor gives *Undefined*. |

For example, `mod(-14, 4)` is -2, whereas `mod(14, -4)` is 2. `mod` also accepts fractional values; it is not restricted to integer arithmetic.

Factorials through `fact(170)` produce finite results. Larger nonnegative integer arguments overflow and display as *Undefined*. Large factorials are subject to the same floating-point precision limits as other arithmetic. There is no postfix `!` operator.

`nCr(n, r)` is mathematically `fact(n) / (fact(r) * fact(n - r))`, and `nPr(n, r)` is `fact(n) / fact(n - r)`. Both return 1 for `r = 0`, including `n = 0`. `nCr(5, 2)` is 10, while `nPr(5, 2)` is 20. They compute counts directly rather than evaluating overflowing factorials: `nCr(200, 2)` is 19,900 and `nPr(200, 2)` is 39,800. Counts use exact integer intermediates and round to the calculator's floating-point number type at the end; arguments already carry that type's precision limits. Results beyond the finite numeric range display as *Undefined*, and huge selections stop promptly on overflow.

`n_root(x, 2)` matches `sqrt(x)`. Positive `x` accepts any finite nonzero real degree: `n_root(16, 0.5)` is 256. A negative degree takes a reciprocal root, so `n_root(16, -2)` is 0.25 and `n_root(-8, -3)` is -0.5. Negative `x` accepts only odd integer degrees: `n_root(-8, 3)` is -2, while even or fractional degrees give *Undefined*. A zero degree is undefined, as is a negative-degree root of zero.

`log_n(x, 10)`, `log_n(x, 2)`, and `log_n(x, e)` match `log(x)`, `lg(x)`, and `ln(x)`. Other bases use `ln(x) / ln(base)`: `log_n(81, 3)` is 4, and `log_n(8, 0.5)` is -3. Invalid bases, negative `x`, and nonfinite results display as *Undefined*.

`round` takes one argument and rounds to a whole number; it has no optional precision parameter. To round to two decimal places, write `round(x * 100) / 100`. `min` and `max` accept one or more complete expressions and evaluate every argument in source order. Their values retain ordinary nonfinite arithmetic: `min(1 / 0, 3)` is 3, while `min(sqrt(-1), 3)` is *Undefined*. These functions are built in; user-defined functions are not supported.

### Statistics

The five statistics functions accept scalar expressions and unpacked numeric arrays, whether bound or written inline. Empty argument lists, including calls supplied only with empty unpackings, are invalid. Any nonfinite observation gives *Undefined* for all five functions. A one-value sample passed to `sd_s` is valid syntax but gives *Undefined* because its divisor is zero. Standard deviations use squared deviations from the arithmetic mean, dividing by the observation count for `sd_p` or one less than that count for `sd_s`; they are not variances.

```text
observations = [2, 4, 4, 4, 5, 5, 7, 9,];
average = mean(*observations);
midpoint = median(*observations);
most frequent = mode(*observations);
population deviation = sd_p(*observations);
sample deviation = sd_s(*observations);
average
```

The result and `average` are 5; `midpoint` and `most frequent` are 4.5 and 4; `population deviation` is 2; `sample deviation` is approximately 2.1380899353. Repeated observations count individually. `mode(2, 1, 1, 2)` returns 2 because both values occur twice and 2 appears first. These functions use the same floating-point numeric type as the rest of Scratchpad; they do not add exact decimal arithmetic.

### Trigonometric functions

Circular functions use radians by default. A `_d` suffix makes direct functions accept degrees and inverse functions return degrees: `sin(pi / 6)` and `sin_d(30)` are 0.5; `arcsin(0.5)` is approximately `pi / 6`, and `arcsin_d(0.5)` is approximately 30. Inverse names always start with `arc`. Their arguments are ratios, not angles. `arctan2(y, x)` takes the vertical coordinate first and chooses the correct quadrant for the point `(x, y)`.

| Radian call | Degree call | Meaning and principal range |
| --- | --- | --- |
| `sin(x)` | `sin_d(x)` | Sine. |
| `cos(x)` | `cos_d(x)` | Cosine. |
| `tan(x)` | `tan_d(x)` | Tangent. |
| `sec(x)` | `sec_d(x)` | Secant, `1 / cos(x)`. |
| `csc(x)` | `csc_d(x)` | Cosecant, `1 / sin(x)`. |
| `cot(x)` | `cot_d(x)` | Cotangent, `1 / tan(x)`. |
| `arcsin(x)` | `arcsin_d(x)` | Inverse sine: `-pi/2` through `pi/2`, or -90° through 90°; requires `abs(x) <= 1`. |
| `arccos(x)` | `arccos_d(x)` | Inverse cosine: 0 through `pi`, or 0° through 180°; requires `abs(x) <= 1`. |
| `arctan(x)` | `arctan_d(x)` | Inverse tangent: between `-pi/2` and `pi/2`, or -90° and 90°. |
| `arcsec(x)` | `arcsec_d(x)` | Inverse secant: 0 through `pi`, or 0° through 180°, excluding `pi/2` or 90°; requires `abs(x) >= 1`. |
| `arccsc(x)` | `arccsc_d(x)` | Inverse cosecant: `-pi/2` through `pi/2`, or -90° through 90°, excluding 0; requires `abs(x) >= 1`. |
| `arccot(x)` | `arccot_d(x)` | Inverse cotangent: between 0 and `pi`, or 0° and 180°; `arccot(-1)` is `3 * pi / 4`. |
| `arctan2(y, x)` | `arctan2_d(y, x)` | Point angle: `-pi` through `pi`, or -180° through 180°; `arctan2_d(1, -1)` is 135. |

Degree functions preserve exact sine and cosine values at multiples of 90°, so `sin_d(180)` and `cos_d(90)` are exactly 0. Poles such as `tan_d(90)`, `sec_d(90)`, `csc_d(0)`, and `cot_d(180)` display as *Undefined*. Radian functions use floating-point approximations of angles: `sin(pi)` may leave a small residual, and `tan(pi / 2)` may be a large finite number. Invalid real domains and nonfinite results display as *Undefined*.

Hyperbolic functions and their inverses are unitless and have no `_d` variants. They also use `arc` for inverse names.

| Function | Inverse | Real inverse domain and range |
| --- | --- | --- |
| `sinh(x)` | `arcsinh(x)` | Any real input and output. |
| `cosh(x)` | `arccosh(x)` | Input at least 1; nonnegative output. |
| `tanh(x)` | `arctanh(x)` | Input strictly between -1 and 1 for finite output. |
| `sech(x)` | `arcsech(x)` | Input greater than 0 and at most 1 for finite, nonnegative output. |
| `csch(x)` | `arccsch(x)` | Nonzero input and output. |
| `coth(x)` | `arccoth(x)` | Input with absolute value greater than 1 for finite output. |

The reciprocal hyperbolic functions are `1 / cosh(x)`, `1 / sinh(x)`, and `1 / tanh(x)`. Their inverses apply `arccosh`, `arcsinh`, and `arctanh` to `1 / x`. These operations follow ordinary floating-point intermediate overflow and underflow behavior; they do not promise exact symbolic cancellation.

### Commas in argument lists

Function calls, sums, and products allow one optional trailing comma after the final argument: `sqrt(25,)`, `mod(14, 4,)`, `min(4, 2,)`, and `sum_i(i, 1, 3,)` are valid. Whitespace and comments may follow that comma before the closing bracket. The comma does not supply a missing argument: `mod(14,)` is still invalid, as are repeated trailing commas and commas in ordinary expression groups such as `(25,)`.

Because commas can group digits as well as separate arguments, fixed-arity calls use a specific rule: **after setting aside an optional trailing comma, the last required commas directly inside a call's brackets separate its arguments**. Variadic `min`, `max`, `mean`, `median`, `mode`, `sd_p`, and `sd_s`, and any function call containing unpacking, instead divide at every comma directly inside their brackets. Commas inside nested brackets, comments, or matched declared names do not count as separators for the surrounding call.

| Call | Argument separators | Example |
| --- | --- | --- |
| A one-argument function | None; other than the optional trailing comma, commas only group digits | `log(10,000,)` is the logarithm of 10,000. |
| Any variadic function, or a function call containing unpacking | Every comma at that bracket level, with one optional trailing comma | `min(1,000)` has two arguments, 1 and 0; use `min((1,000), 900)` or `min(1_000, 900)` to compare 1,000 with 900. |
| A two-argument function: `mod`, `nCr`, `nPr`, `n_root`, `log_n`, `arctan2`, or `arctan2_d` | The last comma at that bracket level before any trailing comma | `mod(10,000, 6,)` has dividend 10,000 and divisor 6; `nCr(1,000, 2)` chooses 2 from 1,000. |
| `sum_i(body, start, end)` or `prod_i(body, start, end)` | The last two commas at that bracket level before any trailing comma | `sum_i(1,500 * i, 1, 3,)` has body `1,500 * i` and bounds 1 and 3. |

Use ungrouped digits, underscores, magnitude suffixes, or declared names for the second argument of any two-argument function and the bounds of sums and products. For example, write `mod(12000, 1000)` or `mod(12000, 1_000)`, and write `sum_i(i, 1000, 2000)` or `sum_i(i, 1k, 2k)`. An extra pair of parentheses or braces can also protect grouped digits: `mod(12000, (1,000))`, `nCr(2000, (1,000))`, and `sum_i(i, (1,000), (2,000))` are valid.

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

Arrays display in brackets with comma-separated elements and underscore digit grouping within each element, as `[1_000, 2.5]`, so grouping cannot be confused with element separators. Nonfinite elements display individually as *Undefined*. Empty arrays display as `[]`.

The **Suffixed** option abbreviates the final result with `K`, `M`, `B`, or `T` and at most three fractional digits; even values below 1,000 use that shorter precision when the option is enabled, apart from the very small values shown in scientific notation. For array results it applies separately to each element. Named values retain the normal display format. These settings affect presentation only. A later expression uses the underlying value of a name, not its rounded display text.

Scientific notation can appear in output even though it is not accepted as input. To reuse such a displayed value, translate it to decimal notation or an expression such as `5.551115 * 10 ^ -17`. Copying a rounded display value also loses precision compared with referring to the name in the same program.

### Undefined arithmetic

Syntax can be valid even when a calculation has no finite numeric result. Nonfinite values display as **Undefined**, including division by zero, a logarithm of a nonpositive number or invalid base, a root outside its real domain, an invalid factorial or combinatorial selection, a trigonometric pole or invalid inverse domain, invalid iteration bounds, and overflow. Complex numbers are not supported.

Undefined arithmetic does not disable Calculate or stop the rest of a program from being evaluated. A name may display as *Undefined* while an independent final expression remains finite. Internally, nonfinite floating-point values continue through subsequent arithmetic; *Undefined* is their common display label rather than a distinct error value. For example, `inv(1 / 0)` evaluates to 0. Avoid treating every undefined intermediate as interchangeable or assuming it will always propagate to the final result.

### Syntax errors and calculation workflow

Scratchpad checks syntax as the input changes and reports the first problem with a line number. Calculate is disabled while the input is invalid or empty. Valid input is evaluated when Calculate is selected or **Shift Enter** is pressed anywhere on the Scratchpad page, including the editor; editing the input clears the previous calculation. Enter by itself inserts a line break in the editor. The page shortcut is released when navigating away and yields to open dialogs.

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
| An array where a scalar is required | Use a numeric scalar; in a function call, use `*name` or `*[...]` to unpack a numeric array. |
| An invalid unpacking target | Use a numeric array binding or literal after `*` as a complete function argument. |
| A wrong closing bracket | Match each `(`, `[`, or `{` with its own closer. |

The language has no strings, booleans, comparisons, conditional expressions, nested or nonnumeric arrays, assignments that update an existing name, or general-purpose loops. `=` declares a name; it does not test equality. A declaration with parentheses in its name does not define a callable function. Built-in functions and finite sums and products provide the supported forms of repeated calculation.

## Notepad++ highlighting

The optional [Notepad++ language definition](../misc/scratchpad.notepad-plus-plus.udl.xml) highlights case-sensitive built-in functions and constants, `sum_` and `prod_` heads, `#` line comments, arithmetic and grouping punctuation, `=`, and `;`. The file contains Notepad++'s XML language-definition format. Import it through **Language > User Defined Language > Define your language > Import**, choosing `scratchpad.notepad-plus-plus.udl.xml`. After importing, select **Language > Scratchpad** to activate highlighting in the current document. Files ending in `.scratchpad` select it automatically. Default text, numbers, fonts, and backgrounds use Notepad++'s settings; accent foreground colors can be adjusted in the UDL Styler dialog.

`min` and `max` receive highlighting only when immediately followed by `(`, `[`, or `{`, as in `min(4, 2)` and `max[4, 2]`. The name and attached opening bracket share the operator color. Bare words, including those in descriptive names such as `min value`, stay plain. Whitespace-separated forms such as `min (4, 2)` also leave the name plain in Notepad++, even though Scratchpad accepts whitespace before a call's bracket.

This definition provides static highlighting. It cannot follow declared names or index scope, distinguish grouping commas from argument separators, validate bracket pairs, or check whether a statement requires a semicolon. Keywords and punctuation within descriptive names can receive their ordinary token colors. The literal `min` and `max` call-head rules can also match within longer names, such as `min(` within `admin(`, and prefix matching colors invalid iteration heads such as `sum_2023`. Use Scratchpad to validate and evaluate the program; the language rules above still apply.

## Representative examples

Each `text` code block below is a complete, independent program that can be pasted into Scratchpad. The LaTeX equations describe the mathematical models; they are explanatory notation, not Scratchpad input. Results are described using normal display unless an approximation is stated. Units in names and comments document the intended interpretation; Scratchpad does not check units or convert them automatically.

### Finance: net present value of a project

A project requires a $60,000 outlay today and is expected to generate $16,000 in net cash inflows at the end of each of the next five years. Equipment is expected to sell for another $8,000 at the end of year five. Using an illustrative annual discount rate of 8%, calculate the present value of the future cash flows and subtract the initial outlay.

With initial outlay $I_0$, annual net cash inflow $C$, resale proceeds $S$, annual discount rate $r$, and project duration $N$ years, the model is:

$$
\mathrm{NPV} = -I_0 + \sum_{t=1}^{N}\frac{C}{(1+r)^t} + \frac{S}{(1+r)^N}.
$$

Here $t$ counts year-end cash flows, and $r=0.08$ is the rate as a fraction.

```text
# Project inputs: dollars, years, and annual discount rate
I_0 = $60k;
C = $16k;
S = $8k;
N = 5;
r = 8%;

# Discount the operating cash flows and year-end resale
PV_cash = sum_t(C / (1 + r) ^ t, 1, N);
PV_resale = S / (1 + r) ^ N;

# Net value after the initial outlay
NPV = PV_cash + PV_resale - I_0;
NPV
```

The result is approximately **9,328.03**, in dollars. The operating cash flows have a present value of approximately $63,883.36, and the resale proceeds add approximately $5,444.67. The initial outlay occurs today and is not discounted. The final operating inflow and resale proceeds both occur at the end of year five, so both use the fifth-year discount factor. The positive result means the modeled discounted inflows exceed the outlay by that amount under these assumptions.

The sum's `t` index supplies each discount exponent, and its inclusive range includes all five operating inflows. This example treats the stated cash flows as complete; any additional cash flows would need to be included explicitly. It uses the supplied discount rate rather than calculating a rate of return.

### Accounting: periodic weighted-average inventory cost

A retailer begins a period with 120 units carried at $18 each and purchases another 80 units at $21 each. During the period, it sells 150 units for $32 each. Under the periodic weighted-average method, divide the total cost of goods available for sale by the total units available, then use that average to allocate cost between units sold and ending inventory.

Let $q_b$ and $q_p$ be beginning and purchased quantities, $c_b$ and $c_p$ their unit costs, $q_s$ the quantity sold, and $p$ the selling price per unit. The weighted-average unit cost $\bar c$ allocates the available cost between cost of goods sold and ending inventory:

$$
\begin{aligned}
\bar c &= \frac{q_b c_b + q_p c_p}{q_b+q_p}, \\
\mathrm{COGS} &= q_s\bar c, \\
V_{\text{ending}} &= (q_b+q_p-q_s)\bar c, \\
\text{Gross profit} &= q_s p-\mathrm{COGS}.
\end{aligned}
$$

| Symbol | Scratchpad name | Meaning |
| --- | --- | --- |
| $q_b,\ q_p,\ q_s$ | `q_b`, `q_p`, `q_s` | Beginning, purchased, and sold quantities |
| $c_b,\ c_p$ | `c_b`, `c_p` | Beginning and purchase unit costs |
| $\bar c$ | `c_bar` | Weighted-average unit cost |
| $V_{\text{ending}}$ | `V_ending` | Ending inventory cost |

```text
# Beginning inventory and purchases: units and dollars per unit
q_b = 120;
c_b = $18;
q_p = 80;
c_p = $21;

# Sales for the period
q_s = 150;
p = $32; # selling price per unit

# Pool the available inventory and calculate its average unit cost
q_available = q_b + q_p;
cost_available = q_b * c_b + q_p * c_p;
c_bar = cost_available / q_available;

# Allocate inventory cost between sales and remaining stock
COGS = q_s * c_bar;
q_ending = q_available - q_s;
V_ending = q_ending * c_bar;

# Sales revenue and gross profit, in dollars
revenue = q_s * p;
gross profit = revenue - COGS;
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

### Physics: conservation of energy with air drag

A 2-kilogram object is released from rest 5 meters above the ground. Calculate its speed just before reaching the ground after allowing for energy transferred to the surroundings by air drag. Take the ground as zero potential energy, use a constant gravitational acceleration of 9.81 meters per second squared, and assume a drag force averaging 4 newtons over the distance fallen.

For mass $m$, gravitational acceleration $g$, heights $h_i,h_f$, and speeds $v_i,v_f$, include the positive energy transfer $E_{\text{drag}}$ in the energy balance:

$$
\begin{aligned}
mgh_i+\frac12 mv_i^2 &= mgh_f+\frac12 mv_f^2+E_{\text{drag}}, \\
E_{\text{drag}} &= \bar F_{\text{drag}}(h_i-h_f), \\
v_f &= \sqrt{v_i^2+2g(h_i-h_f)-\frac{2E_{\text{drag}}}{m}}.
\end{aligned}
$$

Subscripts $i$ and $f$ mean initial and final. The force magnitude $\bar F_{\text{drag}}$ is averaged over the downward travel distance; $E_{\text{drag}}$ is energy transferred out of mechanical motion, not energy destroyed.

| Symbol | Scratchpad name | Meaning |
| --- | --- | --- |
| $\bar F_{\text{drag}}$ | `F_drag_bar` | Drag magnitude averaged over distance |
| $U_i,\ U_f$ | `U_i`, `U_f` | Initial and final gravitational potential energy |
| $K_i,\ K_f$ | `K_i`, `K_f` | Initial and final kinetic energy |
| $E_i,\ E_f$ | `E_i`, `E_f` | Initial and final total mechanical energy |

```text
# Initial conditions and final height
m = 2; # kilograms
g = 9.81; # meters per second squared
h_i = 5; # meters above the ground
h_f = 0;
v_i = 0; # meters per second
F_drag_bar = 4; # newtons; distance-averaged drag magnitude

# Initial energy and work against drag, in joules
U_i = m * g * h_i;
K_i = 0.5 * m * v_i ^ 2;
E_i = U_i + K_i;
E_drag = F_drag_bar * (h_i - h_f);

# Remaining mechanical energy and energy accounting
U_f = m * g * h_f;
K_f = E_i - U_f - E_drag;
E_f = U_f + K_f;
E_accounted = E_f + E_drag;

# Convert final kinetic energy to speed, in meters per second
v_f = sqrt(2 * K_f / m);
v_f
```

The result is approximately **8.83742 meters per second**. Named values show 98.1 joules of initial potential energy and zero initial kinetic energy. Drag transfers 20 joules to the surroundings over the 5-meter fall, leaving 78.1 joules of kinetic energy just before impact, when potential energy is zero. The `E_accounted` remains 98.1 joules: final mechanical energy plus the energy transferred by drag equals initial mechanical energy. The calculation rearranges $K=\tfrac12 mv^2$ to obtain speed; Scratchpad evaluates that formula rather than solving an equation symbolically.

Mechanical energy decreases, while total energy is conserved when the surroundings are included; energy lost to drag is transferred into air motion and ultimately thermal energy. The assumed drag force is an average over distance, not time, so multiplying it by distance gives the work against drag. This example does not predict that average from speed, air density, or object shape, and changing the fall conditions may require a different average. Setting `F_drag_bar` to zero recovers the drag-free speed of approximately 9.90454 meters per second. The model stops before impact and assumes a straight downward fall, positive mass, and nonnegative drag loss. Inputs that give negative final kinetic energy are inconsistent with reaching the stated height and make the square root undefined. Units are recorded in comments and prose, since Scratchpad does not check them.

### Engineering: AC series RLC circuit analysis

A 120-volt RMS, 60-hertz sinusoidal source drives a series circuit with a 40-ohm resistor, a 0.1-henry inductor, and a 100-microfarad capacitor. Calculate the steady-state RMS current, impedance phase angle, power factor, and average real power. Use volts, hertz, ohms, henries, and farads throughout; `0.0001` farad is 100 microfarads. Units belong in the explanation or declared names, since Scratchpad does not convert units.

For source frequency $f$, resistance $R$, inductance $L$, capacitance $C$, and RMS voltage $V_{\mathrm{rms}}$, calculate angular frequency $\omega$, net reactance $X$, impedance magnitude $|Z|$, RMS current $I_{\mathrm{rms}}$, impedance phase angle $\theta$, and average real power $P$:

$$
\begin{aligned}
\omega &= 2\pi f, & X &= \omega L-\frac{1}{\omega C}, \\
|Z| &= \sqrt{R^2+X^2}, & I_{\mathrm{rms}} &= \frac{V_{\mathrm{rms}}}{|Z|}, \\
\theta &= \mathrm{atan2}(X,R), & \mathrm{PF} &= \cos\theta, \\
P &= I_{\mathrm{rms}}^2R &= V_{\mathrm{rms}}I_{\mathrm{rms}}\mathrm{PF}.
\end{aligned}
$$

Here $\mathrm{PF}$ is the power factor. The program expresses $\theta$ in degrees and pairs `arctan2_d` with `cos_d` to keep the angle convention consistent.

| Symbol | Scratchpad name | Meaning |
| --- | --- | --- |
| $\omega$ | `omega` | Angular frequency, in radians per second |
| $\lvert Z\rvert$ | `Z_mag` | Impedance magnitude |
| $\theta$ | `theta_deg` | Impedance phase angle, in degrees |
| $X_L,\ X_C$ | `X_L`, `X_C` | Inductive and capacitive reactance magnitudes |

```text
# Source and component values in SI units
V_rms = 120; # volts
f = 60; # hertz
R = 40; # ohms
L = 0.1; # henries
C = 0.0001; # farads

# Frequency-dependent reactance and impedance, in ohms
omega = 2 * pi * f; # radians per second
X_L = omega * L;
X_C = 1 / (omega * C);
X = X_L - X_C;
Z_mag = sqrt(R ^ 2 + X ^ 2);

# Current, phase, and power factor
I_rms = V_rms / Z_mag; # amperes
theta_deg = arctan2_d(X, R); # degrees
PF = cos_d(theta_deg);

# Average real power, in watts
P = I_rms ^ 2 * R;
P
```

The result is approximately **333.94 watts**. Named values show an impedance magnitude of approximately 41.5312 ohms, an RMS current of 2.88939 amperes, an impedance phase angle of 15.6068 degrees, and a power factor of 0.963131. Positive net reactance makes the circuit inductive, so current lags the source voltage by that angle. `arctan2_d` takes the reactive component first and the resistive component second; `cos_d` uses its degree result directly. The real-power result also agrees with `V_rms * I_rms * PF`.

This model assumes ideal components in sinusoidal steady state, with the resistor representing all real dissipation. The inductor and capacitor exchange energy without dissipating average power. It keeps the real and reactive impedance components as separate numeric values, so no complex-number syntax is required; it does not model switching transients, parasitic losses, or component tolerances.

### Engineering: steady-state chemical reactor balance

An ideal continuous stirred-tank reactor (CSTR) converts species A to B in an irreversible, first-order reaction with one mole of B formed per mole of A consumed. Its liquid volume is 100 liters, the feed and outlet flow rates are both 10 liters per minute, the feed contains 2 moles of A per liter and no B, and the rate constant is 0.08 per minute. Calculate the outlet concentrations and percentage conversion of A.

Let $Q$ be the common inlet and outlet volumetric flow rate, $V$ the reactor volume, $k$ the first-order rate constant, and $C_{A,\mathrm{in}}$ and $C_A$ the inlet and outlet concentrations of A. Zero accumulation gives the species balance and its explicit solution:

$$
\begin{aligned}
0 &= Q C_{A,\mathrm{in}}-Q C_A-kVC_A, \\
\tau &= \frac{V}{Q}, & C_A &= \frac{C_{A,\mathrm{in}}}{1+k\tau}, \\
C_B &= C_{A,\mathrm{in}}-C_A, & X_A &= 1-\frac{C_A}{C_{A,\mathrm{in}}}.
\end{aligned}
$$

Here $\tau$ is residence time, $C_B$ is outlet B concentration for the stated one-to-one reaction with no B in the feed, and $X_A$ is the fractional conversion. The program evaluates the rearranged formula and reports $100X_A$ as a percentage; it does not solve the balance symbolically.

| Symbol | Scratchpad name | Meaning |
| --- | --- | --- |
| $\tau$ | `tau` | Residence time |
| $C_{A,\mathrm{in}}$ | `C_A_in` | Inlet concentration of A |
| $C_A,\ C_B$ | `C_A`, `C_B` | Outlet concentrations of A and B |
| $X_A$ | `X_A` | Fractional conversion of A |

```text
# Reactor, feed, and reaction inputs
V = 100; # liters
Q = 10; # liters per minute; same at inlet and outlet
C_A_in = 2; # moles per liter
k = 0.08; # per minute

# Residence time and steady-state outlet concentrations
tau = V / Q; # minutes
C_A = C_A_in / (1 + k * tau); # moles per liter
C_B = C_A_in - C_A;
X_A = 1 - C_A / C_A_in;

# Reconcile the A balance, in moles per minute
A_in = Q * C_A_in;
A_out = Q * C_A;
A_reacted = k * V * C_A;
balance residual = A_in - A_out - A_reacted;

# Report fractional conversion as a percentage
100 * X_A
```

The result is approximately **44.4444**, meaning 44.4444% conversion. Named values show a residence time of 10 minutes, an outlet A concentration of approximately 1.11111 moles per liter, and an outlet B concentration of 0.888889 moles per liter. The A balance reconciles 20 moles per minute entering with 11.1111 leaving and 8.88889 consumed; `balance residual` is zero for these inputs, subject to floating-point rounding after edits.

The model assumes perfect mixing, constant liquid density and volume, constant temperature, and a positive flow rate. The reactor concentration therefore equals the outlet concentration, and the reaction rate is evaluated at `C_A`. The rate constant is fixed at the operating temperature; the calculation does not solve an energy balance, predict temperature changes, or model startup accumulation or additional reactions.

### Control theory: a discrete-time PID control update

A position controller commands a force to move an object toward a 1-meter setpoint. Its current measured position is 0.8 meter, the previous position error was 0.15 meter, and the stored integral of error before this update is 0.4 meter-seconds. Calculate one proportional-integral-derivative (PID) update with a sampling interval of 0.1 second and gains of 20 newtons per meter, 5 newtons per meter-second, and 2 newton-seconds per meter, respectively.

At sample $k$, let $r_k$ be the position setpoint, $y_k$ the measured position, $e_k$ the error, $J_k$ the accumulated error integral, and $u_k$ the commanded force. With sampling interval $\Delta t>0$ and gains $K_p,K_i,K_d$, use a rectangular integral update based on the current error and a backward difference for its derivative:

$$
\begin{aligned}
e_k &= r_k-y_k, \\
J_k &= J_{k-1}+e_k\Delta t, \\
\dot e_k &\approx \frac{e_k-e_{k-1}}{\Delta t}, \\
u_k &= K_p e_k+K_i J_k+K_d\frac{e_k-e_{k-1}}{\Delta t}.
\end{aligned}
$$

The proportional term responds to the current error, the integral term includes accumulated error, and the derivative term responds to its rate of change. Each gain converts its term into newtons, so the three contributions can be added.

| Symbol | Scratchpad name | Meaning |
| --- | --- | --- |
| $\Delta t$ | `dt` | Sampling interval |
| $e_{k-1}$ | `e_prev` | Error at the previous sample |
| $J_{k-1}$ | `J_prev` | Error integral before this update |
| $\dot e_k$ | `e_dot` | Backward-difference estimate of the error derivative |
| $K_p e_k$ | `u_P` | Proportional force contribution |
| $K_i J_k$ | `u_I` | Integral force contribution |
| $K_d(e_k-e_{k-1})/\Delta t$ | `u_D` | Derivative force contribution |

```text
# Current sample and state carried from the previous sample
r_k = 1; # position setpoint, meters
y_k = 0.8; # measured position, meters
e_prev = 0.15; # previous error, meters
J_prev = 0.4; # previous error integral, meter-seconds

# Sampling interval and controller gains
dt = 0.1; # seconds
K_p = 20; # newtons per meter
K_i = 5; # newtons per meter-second
K_d = 2; # newton-seconds per meter

# Update the error, its integral, and its rate of change
e_k = r_k - y_k;
J_k = J_prev + e_k * dt;
e_dot = (e_k - e_prev) / dt;

# Inspect each force contribution, in newtons
u_P = K_p * e_k;
u_I = K_i * J_k;
u_D = K_d * e_dot;

# Commanded force for this sample
u_k = u_P + u_I + u_D;
u_k
```

The result is **7.1 newtons**. Named values show a current error of 0.2 meter, an updated error integral of 0.42 meter-seconds, and an error rate of 0.5 meter per second. The proportional, integral, and derivative forces are 4, 2.1, and 1 newtons, respectively. Positive force is assumed to act in the direction of increasing position.

This is one controller update, not a simulation of the object's motion or a demonstration of closed-loop stability. For the next sample, supply the new measured position and carry `e_k` into `e_prev` and `J_k` into `J_prev`; Scratchpad does not advance controller state automatically. The example assumes an actuator that can supply the requested force, no output bias, and unfiltered differentiation of error. It does not include force limits, integral anti-windup, or derivative filtering; measurement noise or a sudden setpoint change can produce a large derivative contribution. The illustrative gains are not a tuning recommendation for a physical system.

### Engineering mechanics: stress and strain in a LEHI material

A straight bar made from a linear elastic, homogeneous, isotropic (LEHI) material carries a centered axial tensile load of 20,000 newtons. Its original length is 1,000 millimeters and its rectangular cross section is 20 millimeters wide by 10 millimeters thick. Assume Young's modulus is 200,000 megapascals (200 gigapascals) and Poisson's ratio is 0.30. Calculate axial stress, axial and lateral strain, elongation, and the change in width.

Linear elasticity makes stress proportional to strain with recoverable deformation; homogeneity means the material properties are uniform throughout the bar, and isotropy means they are independent of direction. For uniaxial stress with traction-free lateral surfaces, Hooke's law gives axial strain and Poisson contraction. See the [MIT lecture on constitutive material response](https://ocw.mit.edu/courses/16-001-unified-engineering-materials-and-structures-fall-2021/mit16_001_f21_lec15.pdf) for the underlying stress-strain relations.

Let $F$ be tensile force, $L_0$ original length, $b_0$ original width, $t_0$ original thickness, $A_0$ original cross-sectional area, $E$ Young's modulus, and $\nu$ Poisson's ratio. With the $x$ axis along the bar and $y,z$ transverse to it, the small-strain model is:

$$
\begin{aligned}
A_0 &= b_0t_0, & \sigma_x &= \frac{F}{A_0}, & \sigma_y &= \sigma_z=0, \\
\varepsilon_x &= \frac{\sigma_x}{E}, & \varepsilon_y &= \varepsilon_z=-\nu\varepsilon_x, \\
\Delta L &= \varepsilon_x L_0=\frac{FL_0}{EA_0}, & \Delta b &= \varepsilon_y b_0.
\end{aligned}
$$

Stress $\sigma_x$ is positive in tension. Strains $\varepsilon_x,\varepsilon_y,\varepsilon_z$ are dimensionless ratios of dimensional change to original dimension. Use newtons and millimeters consistently: one newton per square millimeter equals one megapascal, so stress and modulus have matching units without an extra conversion.

| Symbol | Scratchpad name | Meaning |
| --- | --- | --- |
| $\nu$ | `nu` | Poisson's ratio |
| $\sigma_x$ | `sigma_x` | Axial engineering stress |
| $\varepsilon_x$ | `epsilon_x` | Axial strain |
| $\varepsilon_y=\varepsilon_z$ | `epsilon_y` | Shared lateral strain |
| $\Delta L$ | `dL` | Axial elongation |
| $\Delta b$ | `db` | Width change |

```text
# Applied load and original geometry
F = 20k; # newtons
L_0 = 1k; # millimeters
b_0 = 20; # millimeters
t_0 = 10; # millimeters

# Material properties
E = 200k; # megapascals = newtons per square millimeter
nu = 0.30; # Poisson ratio

# Engineering stress and dimensionless strains
A_0 = b_0 * t_0; # square millimeters
sigma_x = F / A_0; # megapascals
epsilon_x = sigma_x / E;
epsilon_y = -nu * epsilon_x; # also epsilon_z

# Dimensional changes and loaded dimensions, in millimeters
dL = epsilon_x * L_0;
db = epsilon_y * b_0;
L_loaded = L_0 + dL;
b_loaded = b_0 + db;

# Report axial elongation
dL
```

The result is **0.5 millimeter** of elongation. Named values show an original area of 200 square millimeters, an axial stress of 100 megapascals, an axial strain of 0.0005 (0.05%), and a lateral strain of -0.00015 (-0.015%). The width change is -0.003 millimeter, indicating contraction. The loaded length and width are 1,000.5 and 19.997 millimeters, respectively.

This model assumes small deformation, loading within the material's linear elastic range, and uniform axial stress away from load introduction and support regions. It uses original dimensions for engineering stress and strain and neglects bending, thermal strain, plastic deformation, and local stress concentrations. The lateral faces must be free to contract; lateral restraint would require a multiaxial stress-strain model. The supplied modulus and Poisson's ratio do not establish a yield strength or allowable load, and this calculation does not check either.

### Geometry and measurement error

A circular plate has a measured diameter of 48.6 centimeters and a nominal diameter of 50 centimeters. Calculate its area and the magnitude of the area deviation from the nominal plate.

```text
measured diameter (cm) = 48.6;
nominal diameter (cm) = 50;
measured area = pi * (measured diameter (cm) / 2) ^ 2;
nominal area = pi * (nominal diameter (cm) / 2) ^ 2;
equivalent square side (cm) = sqrt(measured area);
relative area error = abs(measured area - nominal area) / nominal area;
100 * relative area error
```

The result is **5.5216**, meaning an area difference of 5.5216%. The equivalent square's side is approximately 43.07 centimeters. Parentheses within the declared diameter names are part of the names, while the outer parentheses in the area expressions group arithmetic. `abs` reports the magnitude of the deviation regardless of its direction.

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

### Cryptography: a small RSA round trip

Use the small primes 3 and 11 to illustrate how RSA encrypts and recovers an integer message. Choose public exponent 3, private exponent 7, and message 4. These deliberately tiny values expose the arithmetic; they are not secure keys.

For distinct primes $p,q$, form the modulus $n=pq$. Euler's totient $\varphi(n)$ counts the integers from 1 through $n-1$ that are coprime to $n$. Choose a public exponent $e$ coprime to $\varphi(n)$ and a private exponent $d$ satisfying the modular inverse relation below. For an integer message $0\leq m<n$, ciphertext $c$ and recovered message $m_{\text{recovered}}$ follow:

$$
\begin{aligned}
n &= pq, & \varphi(n) &= (p-1)(q-1), \\
ed &\equiv 1 \pmod{\varphi(n)}, \\
c &= m^e \bmod n, & m_{\text{recovered}} &= c^d \bmod n.
\end{aligned}
$$

The encryption and decryption steps are the integer primitives described in [RFC 8017, Section 5.1](https://www.rfc-editor.org/rfc/rfc8017.html#section-5.1). Here Euler's totient is calculated explicitly: Scratchpad's built-in `phi` is the golden ratio, not a totient function. Likewise, the built-in `e` is Euler's number, so the public exponent needs a different name. The private exponent is supplied rather than solved for; `inv` computes an ordinary reciprocal, not a modular inverse.

| Symbol | Scratchpad name | Meaning |
| --- | --- | --- |
| $p,\ q$ | `p`, `q` | Distinct prime factors |
| $n$ | `n` | RSA modulus |
| $\varphi(n)$ | `phi_n` | Euler's totient of the modulus |
| $e,\ d$ | `e_pub`, `d_priv` | Public and private exponents |
| $m,\ c$ | `m`, `c` | Original message and ciphertext integers |
| $m_{\text{recovered}}$ | `m_recovered` | Recovered message integer |

```text
# Small illustrative key inputs and integer message
p = 3;
q = 11;
e_pub = 3;
d_priv = 7;
m = 4;

# Build the modulus and check the supplied exponent pair
n = p * q;
phi_n = (p - 1) * (q - 1);
inverse check = mod(e_pub * d_priv, phi_n); # must be 1

# Encrypt, decrypt, and inspect the round-trip difference
c = mod(m ^ e_pub, n);
m_recovered = mod(c ^ d_priv, n);
round trip difference = m_recovered - m; # should be 0
m_recovered
```

The result is **4**, recovering the original message. Named values show `n` = 33, `phi_n` = 20, and `inverse check` = 1 because 3 × 7 leaves remainder 1 on division by 20. Encryption gives `c` = 31, and decryption returns 4 with a `round trip difference` of zero. The check confirms the supplied exponent relation; it does not test whether the inputs are prime or validate the message range.

This example shows textbook RSA arithmetic without message encoding or padding. Scratchpad evaluates each power before taking its remainder; the largest power here is $31^7=27{,}512{,}614{,}111$, an exactly representable integer within its floating-point precision. Larger inputs can lose integer precision or overflow before `mod` runs. Real RSA requires large-integer modular arithmetic and a complete encryption scheme such as RSA-OAEP; this small calculation is for understanding the mathematical round trip.

### Comparing acoustic intensity levels

For an intensity ratio, the decibel difference is ten times its base-10 logarithm. This example uses explicit powers of ten for small quantities because scientific input notation is unsupported.

For positive intensities $I_A,I_B$ and a common positive reference intensity $I_0$, define intensity levels $L_A,L_B$ in decibels:

$$
L_A=10\log_{10}\!\left(\frac{I_A}{I_0}\right),\qquad
L_B=10\log_{10}\!\left(\frac{I_B}{I_0}\right),\qquad
L_A-L_B=10\log_{10}\!\left(\frac{I_A}{I_B}\right).
$$

The common reference cancels in the difference; each intensity ratio is dimensionless.

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

For half-life $T_{1/2}$, decay constant $\lambda$, elapsed time $t$, remaining fraction $f(t)$, and target fraction $q$, the exponential model gives:

$$
\lambda=\frac{\ln 2}{T_{1/2}},\qquad
f(t)=e^{-\lambda t},\qquad
t_q=-\frac{\ln q}{\lambda}.
$$

Use $T_{1/2}>0$ and $0<q\leq1$ for a nonnegative target time $t_q$. With time measured in days, $\lambda$ has units of inverse days.

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

### Statistics: measured processing times

A workshop records the time to process eight parts under the same machine setup: 12, 15, 14.5, 15, 18, 16, 15, and 14.5 seconds. Keep the observations together in a numeric array, then compare their average, middle value, most frequent value, and spread. Each observation has equal weight; a repeated time represents another completed part and must remain in the data.

For observations $x_1,\ldots,x_n$, with $n=8$, the mean and the two standard deviations are:

$$
\bar{x}=\frac{1}{n}\sum_{i=1}^{n}x_i,\qquad
\sigma=\sqrt{\frac{1}{n}\sum_{i=1}^{n}(x_i-\bar{x})^2},\qquad
s=\sqrt{\frac{1}{n-1}\sum_{i=1}^{n}(x_i-\bar{x})^2}.
$$

The median is the average of the fourth and fifth observations after numeric sorting because the count is even. The mode is the most frequent observed time. Means, medians, modes, and standard deviations all retain the observations' unit of seconds; only the squared deviations inside the formulas have units of seconds squared.

```text
# Eight observed processing times, all in seconds
processing times (s) = [12, 15, 14.5, 15, 18, 16, 15, 14.5,];

# Typical processing time, summarized three ways
average time (s) = mean(*processing times (s));
middle time (s) = median(*processing times (s));
most common time (s) = mode(*processing times (s));

# Spread of this complete batch versus a sample of the ongoing process
population spread (s) = sd_p(*processing times (s));
sample spread (s) = sd_s(*processing times (s));
sample spread (s)
```

The result is approximately **1.6690459208** seconds. The named values are:

| Scratchpad name | Value in seconds | Interpretation |
| --- | --- | --- |
| `average time (s)` | 15 | The eight times total 120 seconds. |
| `middle time (s)` | 15 | Both middle observations in sorted order are 15. |
| `most common time (s)` | 15 | Three parts took 15 seconds, the highest frequency. |
| `population spread (s)` | Approximately 1.5612494996 | Uses all eight observations as the population being described. |
| `sample spread (s)` | Approximately 1.6690459208 | Uses divisor seven when the observations are a sample of a larger process. |

Use `sd_p` when the question concerns exactly these eight completed parts as a complete population. Use `sd_s` when treating them as a sample for estimating the variability of repeated runs under the same conditions. The squared deviations total 19.5 seconds squared, so the difference between the two reported spreads comes from dividing by eight or seven before taking the square root. Neither calculation establishes that the sample represents future runs or that processing times follow a particular distribution.

The trailing comma after the last observation is optional, and each `*processing times (s)` expands the same array into scalar arguments. The parentheses within that descriptive name are part of the name. `median` sorts a copy, leaving the bound observations in their original order. For a short calculation without a binding, `mean(*[14.5, 15.5,])` similarly returns 15 seconds. To compare another batch, replace the observations and calculate again; all five summaries are recomputed together.

### Probability of passing a sampling check

Suppose eight independently sampled items each have a 10% chance of a defect. A check passes if at most one is defective. Sum the binomial probabilities for zero and one defect.

Let $D$ be the number of defective items among $n$ independent items, each with defect probability $p$. For an allowed defect count $a$, the binomial model is:

$$
\Pr(D\leq a)=\sum_{d=0}^{a}\binom{n}{d}p^d(1-p)^{n-d}.
$$

Here $n=8$, $p=0.10$, and $a=1$. The program's `nCr` supplies the binomial coefficient, and multiplying the probability by 100 expresses it as a percentage.

```text
sample size = 8;
defect probability = 10%;
allowed defects = 1;
pass probability = sum_d(
  nCr(sample size, d)
    * defect probability ^ d
    * (1 - defect probability) ^ (sample size - d),
  0, allowed defects
);
100 * pass probability
```

The result is **81.310473**, a pass probability of 81.310473%. `nCr` counts which items are defective; the two powers give the probability of each such arrangement. The index `d` belongs to the sum's body, and `nCr(sample size, 0) = 1` makes the zero-defect term valid. The calculation assumes independent items with the same defect probability.

### Reliability across stages

Consider a process with four independent stages whose success rates are 99%, 98%, 97%, and 96%. Every stage must succeed for the process to succeed.

For $N$ independent stages with success probabilities $p_j$, the probability that at least one fails is the complement of all stages succeeding:

$$
\Pr(\text{at least one failure})=1-\prod_{j=1}^{N}p_j,\qquad
p_j=p_1-(j-1)\delta.
$$

Here $N=4$, $p_1=0.99$, and $\delta=0.01$ is the absolute probability decrease per stage. Each $p_j$ must remain between zero and one.

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

For $N$ groups, let $r$ index the group and $c$ index a task within that group. The total time $T$, in minutes, is:

$$
T = \sum_{r=1}^{N}\sum_{c=1}^{r}(r+c).
$$

Here $N=4$. The inner sum collects the task times within group $r$, and the outer sum combines the group totals.

| Symbol | Scratchpad name | Meaning |
| --- | --- | --- |
| $N$ | `groups` | Number of groups |
| $T$ | `total minutes` | Total time across all groups |

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
