<!--
@component
Renders a local document and lends its heading navigation to the shell.
-->
<script lang="ts">
  import { APP_NAME } from '#lib';
  import { onMount } from 'svelte';
  import { getShellContext } from '#lib/context/shell.js';
  import RailPanel from '#lib/components/layout/RailPanel.svelte';
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import Button from '#lib/components/elements/Button.svelte';
  import Card from '#lib/components/elements/Card.svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';
  import MarkdownRenderer from '#lib/markdown/MarkdownRenderer.svelte';

  /** Public inputs for this route. */
  type Props = {
    /** The document, its title, and its extracted headings. */
    data: PageData;
  };

  let { data }: Props = $props();
  const shell = getShellContext();
  onMount(() =>
    shell.registerContextualRail({
      label: 'table of contents',
      content: contents,
    }),
  );
</script>

{#snippet contents()}
  <RailPanel label="Table of contents" title="On this page">
    <nav aria-label="Table of contents" class="flex flex-col gap-2">
      {#each data.headings as heading (heading.id)}
        <a
          href={`#${heading.id}`}
          onclick={() => shell.closeContextDrawer()}
          class="text-sm text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
          style:padding-left={`${Math.max(0, heading.level - 1) * 0.75}rem`}
          >{heading.text}</a
        >
      {/each}
    </nav>
  </RailPanel>
{/snippet}

<svelte:head>
  <title>{data.title} · {APP_NAME}</title>
</svelte:head>

<PageContainer>
  <PageHeader title={data.title} description="" align="start" />

  <Card class="mt-6 p-6">
    <MarkdownRenderer doc={data.doc} />
  </Card>

  <Button href={resolve('/docs')} variant="secondary" class="mt-6 self-start">
    All documents
  </Button>
</PageContainer>
