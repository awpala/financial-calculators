<!--
@component
Introduces the available calculators without owning calculator state.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';
  import AmortizationIcon from '#lib/icons/content/AmortizationIcon.svelte';
  import ScratchpadIcon from '#lib/icons/content/ScratchpadIcon.svelte';
  import CashflowIcon from '#lib/icons/content/CashflowIcon.svelte';
  import InfoNote from '#lib/components/elements/InfoNote.svelte';
  import RoutingCard from '#lib/components/elements/RoutingCard.svelte';
</script>

<svelte:head>
  <title>Financial Calculators</title>
  <meta
    name="description"
    content="Work through everyday calculations, explore loan payments, and estimate take-home income."
  />
</svelte:head>

<PageContainer class="gap-8 py-8 sm:py-16">
  <PageHeader
    title="Financial Calculators"
    description="A little space to work through the numbers."
  />
  <div class="grid gap-4 sm:grid-cols-3">
    <RoutingCard
      href={resolve('/scratchpad')}
      title="Scratchpad"
      description="Write expressions, name your figures, and keep the working beside the result."
      icon={ScratchpadIcon}
    />
    <RoutingCard
      href={resolve('/amortization')}
      title="Amortization"
      description="Estimate a loan payment and see how principal and interest change over time."
      icon={AmortizationIcon}
      accent="emerald"
    />
    <RoutingCard
      href={resolve('/cashflow')}
      title="Cashflow"
      description="Estimate monthly take-home pay and see how income, taxes, and deductions add up."
      icon={CashflowIcon}
      accent="violet"
    />
  </div>
  <InfoNote variant="panel"
    >Your inputs, Scratchpad work, settings, and preferences are saved in this
    browser and restored when you return.</InfoNote
  >
</PageContainer>
