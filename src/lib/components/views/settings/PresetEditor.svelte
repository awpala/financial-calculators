<!--
@component
Owns a settings draft's restore, validation, Save/Discard controls, and feedback. The route supplies its fields and preset persistence policy; working calculator inputs are never changed here.
-->
<script lang="ts" generics="T extends object">
  import { onMount, untrack, type Snippet } from 'svelte';
  import Card from '#lib/components/elements/Card.svelte';
  import Button from '#lib/components/elements/Button.svelte';

  /** Mutable draft holder supplied to the route's field snippet. */
  type Draft = {
    /** Editable preset value; the snippet binds its fields to this property. */
    value: T;
  };

  /** One calculator's settings editor and its explicit persistence boundary. */
  type Props = {
    /** Calculator name used in the heading, accessible label, and save feedback. */
    name: string;
    /** Fresh deterministic draft for SSR; captured once for this editor instance. */
    initial: T;
    /** Reads a fresh saved preset; called on mount, discard, and change comparison. */
    read: () => T;
    /** Validates without mutation; undefined means the draft may be saved. */
    validate: (value: T) => string | undefined;
    /** Persists a valid preset synchronously, without altering calculator inputs. */
    save: (value: T) => void;
    /** Form fields bind to this instance's draft.value; drafts are discarded on teardown. */
    children: Snippet<[Draft]>;
  };
  let { name, initial, read, validate, save, children }: Props = $props();
  const draft = $state<Draft>({ value: untrack(() => initial) });
  let savedSignature = $state('');
  let restored = $state(false);
  onMount(() => {
    draft.value = read();
    restored = true;
  });
  const signature = $derived(JSON.stringify(draft.value));
  const error = $derived(validate(draft.value));
  const dirty = $derived(restored && signature !== JSON.stringify(read()));
  const saved = $derived(savedSignature !== '' && savedSignature === signature);
</script>

<Card
  as="section"
  class="min-w-0 space-y-6 p-5 sm:p-6"
  aria-label={`${name} defaults`}
>
  <div>
    <h2 class="text-base font-semibold">{name} defaults</h2>
    <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
      Save a preset for Reset. The calculator’s current inputs stay as they are
      until you reset them.
    </p>
  </div>
  {@render children(draft)}
  {#if error}<p
      role="status"
      class="text-sm text-amber-700 dark:text-amber-400"
    >
      {error}
    </p>{/if}
  <div class="flex flex-wrap items-center gap-3">
    <Button
      disabled={!dirty || error !== undefined}
      onclick={() => {
        save(draft.value);
        savedSignature = signature;
      }}>Save defaults</Button
    >
    <Button
      variant="secondary"
      disabled={!dirty}
      onclick={() => {
        draft.value = read();
        savedSignature = '';
      }}>Discard changes</Button
    >
  </div>
  {#if saved}<p
      role="status"
      class="text-sm text-emerald-700 dark:text-emerald-400"
    >
      {name} defaults saved.
    </p>{/if}
</Card>
