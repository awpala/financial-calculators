<!--
@component
Frames content on the application's standard bordered surface, rendering whichever element the caller names.
-->
<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import {
    SURFACE_BORDER_CLASS,
    SURFACE_FILL_CLASS,
  } from '#lib/components/elements/surface.js';

  /** Whether the surface carries its own ground or only an outline. */
  export type CardSurface = 'filled' | 'outline';
  /** Corner radius of the surface. */
  export type CardRadius = 'lg' | 'xl';

  /** Native attributes forwarded to the component root, excluding properties it owns. */
  type SharedAttributes = Omit<HTMLAttributes<HTMLElement>, 'class'>;

  /** Public inputs and content for this component. */
  type Props = SharedAttributes & {
    /** Element to render; defaults to div. */
    as?: 'div' | 'section' | 'article' | 'form';
    /** Whether the surface is filled or outline-only; defaults to filled. */
    surface?: CardSurface;
    /** Corner radius; defaults to lg. */
    radius?: CardRadius;
    /** Padding and any other classes this surface needs. Defaults to an empty string. */
    class?: string;
    /** Surface content. */
    children: Snippet;
  };

  let {
    as = 'div',
    surface = 'filled',
    radius = 'lg',
    class: className = '',
    children,
    ...attributes
  }: Props = $props();

  // Radius and fill are props rather than caller-supplied classes because two
  // competing utilities for the same property resolve by stylesheet order, not
  // by the order they appear in the class attribute.
  const RADII: Record<CardRadius, string> = {
    lg: 'rounded-lg',
    xl: 'rounded-xl',
  };
</script>

<svelte:element
  this={as}
  class={[
    SURFACE_BORDER_CLASS,
    RADII[radius],
    surface === 'filled' && SURFACE_FILL_CLASS,
    className,
  ]}
  {...attributes}
>
  {@render children()}
</svelte:element>
