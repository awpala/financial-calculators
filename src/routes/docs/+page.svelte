<!-- @component Lists the local documents emitted by the static build. -->
<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import Card from '#lib/components/elements/Card.svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';

  /** Public inputs for the document catalog. */
  type Props = {
    /** Bundled document titles and route slugs. */
    data: PageData;
  };
  let { data }: Props = $props();
</script>

<PageContainer>
  <PageHeader
    title="Documentation"
    description="Local markdown, rendered with the shared document library."
  />
  <ul class="mt-6 space-y-3">
    {#each data.documents as doc (doc.slug)}
      <li>
        <Card class="p-4">
          <a
            class="font-medium hover:underline"
            href={resolve('/docs/[...slug]', { slug: doc.slug })}>{doc.title}</a
          >
        </Card>
      </li>
    {/each}
  </ul>
</PageContainer>
