<!--
@component
Composes route-based settings tabs and the confirmed reset of both financial calculators. Each child route composes an instance-owned preset editor.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import SettingsTabs from '#lib/components/views/settings/SettingsTabs.svelte';
  import GlobalReset from '#lib/components/views/settings/GlobalReset.svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';
  import { getCalculatorSettings } from '#lib/settings/calculator-settings.svelte.js';

  /** Content supplied by the selected settings route. */
  type Props = {
    /** The selected calculator's preset editor. */
    children: Snippet;
  };
  let { children }: Props = $props();
  const settings = getCalculatorSettings();
</script>

<PageContainer class="gap-6 pb-6">
  <PageHeader
    title="Settings"
    description="Choose the starting values restored by each calculator’s Reset button."
    align="start"
  />
  <SettingsTabs />
  {@render children()}
  <GlobalReset onReset={() => settings.resetCalculators()} />
</PageContainer>
