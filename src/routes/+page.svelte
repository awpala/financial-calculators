<!--
@component
Landing view: introduces the reusable UI, document pipeline, and standalone deployment.
-->
<script lang="ts">
  import { APP_NAME } from '#lib';
  import { resolve } from '$app/paths';
  import Button from '#lib/components/elements/Button.svelte';
  import Card from '#lib/components/elements/Card.svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';

  /** One tier of the stack, as shown on the landing grid. */
  type Tier = {
    /** Tier name. */
    name: string;
    /** What the tier owns. */
    role: string;
    /** Where its code lives. */
    path: string;
  };

  const tiers: Tier[] = [
    {
      name: 'Components',
      role: 'Controls, interactions, layouts, charts, and icons.',
      path: 'src/lib/components/',
    },
    {
      name: 'Markdown',
      role: 'Structured parsing, highlighting, diagrams, tables, and math.',
      path: 'src/lib/markdown/',
    },
    {
      name: 'State',
      role: 'Context-owned preferences, request lifetimes, and scroll memory.',
      path: 'src/lib/state/',
    },
    {
      name: 'Standalone',
      role: 'Public static pages with interactive browser visualizations.',
      path: 'src/routes/',
    },
  ];
</script>

<PageContainer>
  <PageHeader
    title={APP_NAME}
    description="A foundation for ad hoc financial calculations and visualizations. Calculator implementation is coming next."
  />

  <div class="mt-8 grid gap-4 sm:grid-cols-2">
    {#each tiers as tier (tier.name)}
      <Card class="p-4">
        <h2 class="text-sm font-semibold">{tier.name}</h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {tier.role}
        </p>
        <p class="mt-2 font-mono text-xs text-slate-500">{tier.path}</p>
      </Card>
    {/each}
  </div>

  <Card class="mt-6 p-4">
    <h2 class="text-sm font-semibold">Where to start</h2>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
      Explore the component examples and rendered documentation while the
      financial calculators are being developed.
    </p>
    <div class="mt-4 flex flex-wrap gap-3">
      <Button href={resolve('/examples')}>Explore examples</Button>
      <Button href={resolve('/docs')} variant="secondary"
        >Read documentation</Button
      >
    </div>
  </Card>
</PageContainer>
