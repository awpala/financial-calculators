<!--
@component
Presents an application destination as an icon, heading, and description inside one card link. The caller resolves the route and owns the surrounding grid; this component owns no state or resources.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Component } from 'svelte';
  import type { RouteId } from '$app/types';

  /** Available color accents for the card's icon, hover, and focus treatments. */
  type Accent = 'sky' | 'emerald' | 'violet';

  /** Public destination and presentation inputs for this card. */
  type Props = {
    /** Internal route ID resolved by this card before navigation. */
    href: RouteId;
    /** Destination name, displayed as a level-two heading. */
    title: string;
    /** Brief description of the destination's purpose. */
    description: string;
    /** Decorative icon component accepting the card's size and accent classes. */
    icon: Component<{
      /** CSS classes supplied to the decorative icon. */
      class?: string;
    }>;
    /** Coordinated icon, hover, and focus color; defaults to sky. */
    accent?: Accent;
    /** Additional layout classes; defaults to an empty string. */
    class?: string;
  };

  let {
    href,
    title,
    description,
    icon: Icon,
    accent = 'sky',
    class: className = '',
  }: Props = $props();

  const accents = {
    sky: {
      link: 'hover:border-sky-500 hover:bg-sky-50 focus-visible:outline-sky-600 dark:hover:bg-sky-950/30',
      icon: 'text-sky-600 dark:text-sky-400',
    },
    emerald: {
      link: 'hover:border-emerald-500 hover:bg-emerald-50 focus-visible:outline-emerald-600 dark:hover:bg-emerald-950/30',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
    violet: {
      link: 'hover:border-violet-500 hover:bg-violet-50 focus-visible:outline-violet-600 dark:hover:bg-violet-950/30',
      icon: 'text-violet-600 dark:text-violet-400',
    },
  };
</script>

<a
  href={resolve(href)}
  class={[
    'group rounded-xl border border-slate-200 p-6 transition-colors focus-visible:outline-2 dark:border-slate-800',
    accents[accent].link,
    className,
  ]}
>
  <Icon class={`mb-5 size-7 ${accents[accent].icon}`} />
  <h2 class="text-lg font-semibold">
    {title} <span aria-hidden="true">→</span>
  </h2>
  <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
    {description}
  </p>
</a>
