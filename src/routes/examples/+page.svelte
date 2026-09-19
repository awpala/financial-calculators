<!-- @component Composes existing controls, confirmation, and charts with route-owned example data. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '#lib/components/elements/Button.svelte';
  import Card from '#lib/components/elements/Card.svelte';
  import EmptyState from '#lib/components/elements/EmptyState.svelte';
  import SearchField from '#lib/components/elements/SearchField.svelte';
  import TextField from '#lib/components/elements/TextField.svelte';
  import ConfirmDialog from '#lib/components/behaviors/ConfirmDialog.svelte';
  import BarChart from '#lib/components/charts/BarChart.svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';
  import RailPanel from '#lib/components/layout/RailPanel.svelte';
  import { getShellContext } from '#lib/context/shell.js';

  const initialItems = ['Components', 'Markdown', 'Charts'];
  const shell = getShellContext();
  const searchId = $props.id();
  let items = $state.raw(initialItems);
  let search = $state('');
  let draftTitle = $state('');
  let resetOpen = $state(false);
  const visible = $derived(
    items.filter((item) =>
      item.toLowerCase().includes(search.trim().toLowerCase()),
    ),
  );

  function create(event: SubmitEvent) {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title || items.includes(title)) return;
    items = [...items, title];
    draftTitle = '';
  }

  onMount(() =>
    shell.registerContextualRail({
      label: 'example filters',
      content: filters,
    }),
  );
</script>

{#snippet filters()}
  <RailPanel
    label="Example filters"
    title="Filters"
    count={`${visible.length} of ${items.length}`}
  >
    <SearchField
      id={searchId}
      placeholder="Filter by title"
      label="Search examples"
      value={search}
      onChange={(value) => (search = value)}
    />
  </RailPanel>
{/snippet}

<PageContainer>
  <PageHeader
    title="Component examples"
    description="Shared controls with local, route-owned state. Changes last until you leave this page."
  />
  <Card as="form" class="mt-6 p-4" onsubmit={create}>
    <TextField label="Item title" bind:value={draftTitle} required />
    <div class="mt-4 flex gap-3">
      <Button type="submit">Add item</Button>
      <Button variant="secondary" onclick={() => (resetOpen = true)}
        >Reset examples</Button
      >
    </div>
  </Card>
  {#if visible.length === 0}
    <EmptyState
      title="No matching items"
      description="Clear the search to see the whole collection."
    />
  {:else}
    <ul class="mt-6 space-y-3">
      {#each visible as item (item)}
        <li><Card class="p-4">{item}</Card></li>
      {/each}
    </ul>
  {/if}
  <Card class="mt-6 p-4">
    <h2 class="mb-4 font-semibold">Grouped bar chart</h2>
    <BarChart
      groupLabels={['First', 'Second', 'Third']}
      series={[{ id: 'sample', label: 'Sample', values: [12, 18, 9] }]}
      yLabel="Value"
    />
  </Card>
</PageContainer>

<ConfirmDialog
  open={resetOpen}
  label="Reset examples"
  heading="Reset the example list?"
  confirmLabel="Reset"
  pendingLabel="Resetting…"
  onClose={() => (resetOpen = false)}
  onConfirm={async () => {
    items = initialItems;
    search = '';
    draftTitle = '';
    resetOpen = false;
  }}
>
  <p>This clears the items added during this visit.</p>
</ConfirmDialog>
