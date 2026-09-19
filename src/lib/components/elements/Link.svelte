<!--
@component
Renders a prose link in the shared link styling, opening outbound destinations in a new tab.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  import {
    LINK_CLASS,
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
  const attributes = $derived(linkTargetAttributes(safeHref));
</script>

<a
  href={safeHref}
  target={attributes.target}
  rel={attributes.rel}
  data-sveltekit-preload-data="false"
  class={`${LINK_CLASS} ${extraClass}`.trim()}
>
  {@render children()}
</a>
