<!--
@component
Names the fields whose text cannot be read in a WarnNote: amounts that are not one number, and percentages outside 0–100 or written with letters, each with the notation it accepts. The owner supplies each field's visible label and problem, renders it only while there is at least one, and marks those fields with `invalidFieldAttributes` so each is described by this note.
-->
<script module lang="ts">
  /**
   * Attributes for a field in an invalid-fields form: invalid and described by
   * the note with `noteId`, or nothing extra while the field is valid.
   */
  export function invalidFieldAttributes(
    invalid: boolean,
    noteId: string,
  ): { 'aria-invalid'?: true; 'aria-describedby'?: string } {
    return invalid ? { 'aria-invalid': true, 'aria-describedby': noteId } : {};
  }
</script>

<script lang="ts">
  import WarnNote from '#lib/components/elements/WarnNote.svelte';
  import type { NumberInputProblem } from '#lib/calculator/presentation/number-input.js';

  const LIST = new Intl.ListFormat('en-US', { type: 'conjunction' });

  /** The fields to name and how their owner treats them. */
  type Props = {
    /** Required ID that invalid fields reference through `invalidFieldAttributes`. */
    id: string;
    /** Required invalid fields in form order: each visible label, whose trailing parenthesized unit such as (USD) is omitted, and its problem. */
    issues: readonly { label: string; problem: NumberInputProblem }[];
    /** Optional sentence on what the owner does with them meanwhile; defaults to none. */
    consequence?: string;
  };
  let { id, issues, consequence }: Props = $props();

  const malformed = $derived(namesOf('malformed'));
  const percent = $derived(namesOf('percent'));

  /** The unit-free names of the fields with one problem. */
  function namesOf(problem: NumberInputProblem): string[] {
    return issues
      .filter((issue) => issue.problem === problem)
      .map((issue) => issue.label.replace(/\s*\(.*\)$/, ''));
  }
</script>

<WarnNote {id}>
  {#if malformed.length > 0}
    {LIST.format(malformed)}
    {malformed.length === 1 ? 'is not a number' : 'are not numbers'}. Use digits
    with at most one k/m/b/t suffix, such as $125k.
  {/if}
  {#if percent.length > 0}
    {LIST.format(percent)} must be {percent.length === 1
      ? 'a percentage'
      : 'percentages'} from 0 to 100, written in digits without letters, such as 6.5.
  {/if}
  {consequence ?? ''}
</WarnNote>
