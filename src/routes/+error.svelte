<!--
@component
Renders an uncaught route error with its status and message.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import Button from '#lib/components/elements/Button.svelte';
  import PageContainer from '#lib/components/layout/PageContainer.svelte';
  import PageHeader from '#lib/components/layout/PageHeader.svelte';
</script>

<PageContainer width="narrow">
  <PageHeader
    title={`${page.status}`}
    description={page.error?.message ?? 'Something went wrong.'}
  />
  <Button href={resolve('/')} variant="secondary" class="mt-6 self-center">
    Back to start
  </Button>
</PageContainer>
