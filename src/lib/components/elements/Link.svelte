<!--
@component
Renders a prose link in the shared link styling, opening outbound destinations in a new tab.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PathnameWithSearchOrHash } from '$app/types';
  import type { Snippet } from 'svelte';

  import {
    LINK_CLASS,
    isExternalUrl,
    linkTargetAttributes,
    safeLinkHref,
  } from '#lib/navigation/links.js';

  /** Public inputs and content for this component. */
  type Props = {
    /** Destination URL; outbound URLs open in a new tab, in-app ones do not. */
    href: string;
    /** Link label content. */
    children: Snippet;
    /** Extra classes appended to the shared link styling. Defaults to an empty string. */
    class?: string;
  };

  let { href, children, class: extraClass = '' }: Props = $props();
  const safeHref = $derived(safeLinkHref(href));
  const external = $derived(isExternalUrl(safeHref));
  const attributes = $derived(linkTargetAttributes(safeHref));
</script>

{#if external}
  <a
    href={safeHref}
    target={attributes.target}
    rel="external noopener noreferrer"
    data-sveltekit-preload-data="false"
    class={`${LINK_CLASS} ${extraClass}`.trim()}
  >
    {@render children()}
  </a>
{:else}
  <a
    href={resolve(safeHref as PathnameWithSearchOrHash)}
    data-sveltekit-preload-data="false"
    class={`${LINK_CLASS} ${extraClass}`.trim()}
  >
    {@render children()}
  </a>
{/if}
