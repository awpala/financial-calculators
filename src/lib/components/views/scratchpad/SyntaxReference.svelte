<!--
@component
Presents highlighted Scratchpad syntax and runnable examples, including nested iteration scopes. The route owns expansion persistence and the action that transfers an example to the editor.
-->
<script lang="ts">
  import Card from '#lib/components/elements/Card.svelte';
  import HighlightedExpression from '#lib/components/views/scratchpad/HighlightedExpression.svelte';
  import ChevronDownIcon from '#lib/icons/navigation/ChevronDownIcon.svelte';
  import ChevronRightIcon from '#lib/icons/navigation/ChevronRightIcon.svelte';
  /** Route-owned disclosure state and example execution action. */
  type Props = {
    /** Whether syntax content is expanded, restored by the route on mount. */
    expanded: boolean;
    /** Persists changes made through the disclosure summary. */
    onExpandedChange: (expanded: boolean) => void;
    /** Replaces editor source, evaluates it, and brings the editor into view. */
    onRun: (source: string) => void;
  };
  let { expanded, onExpandedChange, onRun }: Props = $props();
  const bindingsExample =
    'income = $1k;\ntax rate = 0.25;\nincome * (1 - tax rate)';
  const nestedIterationExample = [
    '# Five deposits, each growing from its own year',
    'deposit = $5k;',
    'sum_t(',
    '  deposit * prod_y(1.03 + 0.005 * (y - 1), t, 5),',
    '  1, 5',
    ')',
  ].join('\n');
</script>

<Card as="section" class="p-5 sm:p-6" aria-label="Syntax reference">
  <details bind:open={() => expanded, onExpandedChange}>
    <summary
      class="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold [&::-webkit-details-marker]:hidden"
    >
      {#if expanded}
        <ChevronDownIcon class="h-4 w-4 shrink-0" />
      {:else}
        <ChevronRightIcon class="h-4 w-4 shrink-0" />
      {/if}
      Syntax & examples
    </summary>
    <div
      class="mt-5 grid gap-6 text-sm leading-relaxed text-slate-600 md:grid-cols-3 dark:text-slate-400"
    >
      <div class="space-y-2">
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">
          Figures & names
        </h3>
        <p>
          <HighlightedExpression source="$1,250.50" />, <HighlightedExpression
            source="2.5k"
          />, <HighlightedExpression source="3M" />,
          <HighlightedExpression source="1b" />, <HighlightedExpression
            source="1t"
          />, <HighlightedExpression source="4.5%" />
        </p>
        <HighlightedExpression
          source={bindingsExample}
          block
          {onRun}
          exampleName="Figures & names"
        />
        <p>
          Names can contain spaces. A <HighlightedExpression source="#" /> starts
          a comment.
        </p>
      </div>
      <div class="space-y-2">
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">
          Arithmetic & functions
        </h3>
        <p>
          <HighlightedExpression source="+ - * / ^" /> with <HighlightedExpression
            source={'() [] {}'}
          />
          grouping. A figure may end in <HighlightedExpression source="%" />, so
          <HighlightedExpression source="4.5%" /> is
          <HighlightedExpression source="0.045" />.
        </p>
        <p>
          <HighlightedExpression
            source="log lg ln sqrt abs floor ceil round fact inv"
          />
        </p>
        <p>
          <HighlightedExpression source="mod(8, 3)" /> is the remainder, 2.
        </p>
        <p>
          <HighlightedExpression source="round(-2.5)" /> is -2: half ties round toward
          positive infinity. <HighlightedExpression source="min(4, 2, 8)" />
          is 2; <HighlightedExpression source="max(4, 2, 8)" /> is 8. Both accept
          one or more arguments. Every comma separates them; write grouped figures
          as <HighlightedExpression source="1_000" /> or
          <HighlightedExpression source="(1,000)" />.
        </p>
        <p>
          <HighlightedExpression source="n_root(27, 3)" /> is 3;
          <HighlightedExpression source="log_n(81, 3)" /> is 4. Root degrees may be
          any nonzero real number; negative inputs need odd integer degrees. Logarithm
          bases must be positive and cannot be 1.
        </p>
        <p>
          <HighlightedExpression source="nCr(5, 2)" /> counts 10 combinations;
          <HighlightedExpression source="nPr(5, 2)" /> counts 20 permutations. Both
          require whole numbers with 0 ≤ r ≤ n. Spellings are case-sensitive.
        </p>
        <p>
          Constants: <HighlightedExpression source="e pi phi" />.
        </p>
        <HighlightedExpression
          source="sqrt(3 ^ 2 + 4 ^ 2)"
          block
          {onRun}
          exampleName="Arithmetic & functions"
        />
      </div>
      <div class="space-y-2">
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">
          Sums & products
        </h3>
        <HighlightedExpression
          source="sum_i(i ^ 2, 1, 10)"
          block
          {onRun}
          exampleName="Sum"
        />
        <HighlightedExpression
          source="prod_y(1.05, 1, 5)"
          block
          {onRun}
          exampleName="Product"
        />
        <p>
          Both bounds are inclusive whole numbers. The index belongs to the
          first argument. Use ungrouped figures for bounds.
        </p>
        <p>
          Undefined arithmetic is shown as <em>Undefined</em>. Results use
          floating-point arithmetic.
        </p>
      </div>
    </div>
    <div
      class="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400"
    >
      <h3 class="font-semibold text-slate-900 dark:text-slate-100">
        Trigonometry
      </h3>
      <p>
        <HighlightedExpression source="sin cos tan sec csc cot" /> use radians. Append
        <code>_d</code>
        for degree arguments:
        <HighlightedExpression source="sin_d(30)" /> is 0.5.
      </p>
      <p>
        Inverses: <HighlightedExpression
          source="arcsin arccos arctan arcsec arccsc arccot"
        />. Append <code>_d</code> for degree results:
        <HighlightedExpression source="arcsin_d(0.5)" /> is 30.
        <HighlightedExpression source="arctan2(y, x)" /> gives a point's angle;
        <HighlightedExpression source="arctan2_d(1, -1)" /> is 135.
      </p>
      <p>
        Hyperbolic functions: <HighlightedExpression
          source="sinh cosh tanh sech csch coth"
        />, with inverses
        <HighlightedExpression
          source="arcsinh arccosh arctanh arcsech arccsch arccoth"
        />. These are unitless and have no <code>_d</code> variants. Arguments
        outside a function's real domain display as <em>Undefined</em>.
      </p>
      <HighlightedExpression
        source="sin_d(30) + cos_d(60)"
        block
        {onRun}
        exampleName="Trigonometry"
      />
    </div>
    <div
      class="mt-6 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2 dark:border-slate-800"
    >
      <div
        class="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
      >
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">
          Nested sums & products
        </h3>
        <p>
          Deposit $5,000 at the start of each of five years. Each deposit grows
          through the remaining years, with the rate rising from 3% by half a
          percentage point each year.
        </p>
        <p>
          The sum’s local index <code
            class="font-mono text-sky-700 dark:text-sky-300">t</code
          >
          selects the deposit year and supplies the product’s starting bound. The
          product’s local index
          <code class="font-mono text-sky-700 dark:text-sky-300">y</code> selects
          each growth year and exists only inside that product’s first argument.
        </p>
        <p>Result: <HighlightedExpression source="28,429.910985" />.</p>
      </div>
      <HighlightedExpression
        source={nestedIterationExample}
        block
        {onRun}
        exampleName="Nested sums & products"
      />
    </div>
  </details>
</Card>
