<!--
@component
Provides a labeled multi-line text input with a bindable value; the multi-line sibling of TextField, where Enter inserts a newline. Optionally mutes spans of its own text.
-->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import {
    FIELD_CONTROL_CLASS,
    FIELD_CONTROL_PADDING,
    FIELD_GAP_CLASS,
    FIELD_LABEL_CLASS,
    type FieldDensity,
  } from '#lib/components/elements/field.js';

  /** How a run of the field's text is drawn against the ordinary text color. */
  export type TextAreaSegmentTone =
    'muted' | 'accent' | 'accent-alt' | 'accent-constant';

  /** A run of the field's text, drawn in the tone the owner gives it. */
  export type TextAreaSegment = {
    /** The run's text; the runs must concatenate to the field's value. */
    text: string;
    /** How to draw the run; plain text when absent. */
    tone?: TextAreaSegmentTone;
  };

  /** Native attributes forwarded to the component root, excluding properties it owns. */
  type SharedAttributes = Omit<
    HTMLTextareaAttributes,
    'class' | 'id' | 'value' | 'onscroll'
  >;

  /** Public inputs and callbacks for this component. */
  type Props = SharedAttributes & {
    /** Visible label associated with the text area. */
    label: string;
    /** Text shared with the owner through bind:value. */
    value: string;
    /** Identifier for the text area; defaults to a generated one. */
    id?: string;
    /** Presentation density; defaults to form. */
    density?: FieldDensity;
    /**
     * The value split into runs to draw in tone. When given, the text is
     * drawn from these runs rather than by the text area itself, so they must
     * be recomputed from the current value on every change.
     */
    segments?: TextAreaSegment[];
    /**
     * Whether a line-number gutter is drawn inside the field, with the text
     * inset to make room for it. Requires `segments`, which is what the numbers
     * are counted from. Defaults to false.
     */
    lineNumbers?: boolean;
    /** Typography classes, such as a font family, shared by the text and its segments. Defaults to an empty string. */
    textClass?: string;
    /** Additional classes applied to the text area, including its dark ground. Defaults to an empty string. */
    inputClass?: string;
    /** Additional classes applied to the outer wrapper. Defaults to an empty string. */
    class?: string;
  };

  let {
    label,
    value = $bindable(),
    id,
    density = 'form',
    segments,
    lineNumbers = false,
    textClass = '',
    inputClass = '',
    class: className = '',
    ...attributes
  }: Props = $props();

  const uid = $props.id();
  const textareaId = $derived(id ?? `textarea-${uid}`);
  let overlayElement = $state<HTMLElement>();

  // Three accents, each with its dark-theme counterpart, beside the muted tone
  // the comment rule already used.
  const TONE_CLASS: Record<TextAreaSegmentTone, string> = {
    muted: 'text-slate-400 dark:text-slate-500',
    accent: 'text-sky-700 dark:text-sky-300',
    'accent-alt': 'text-violet-700 dark:text-violet-300',
    'accent-constant': 'text-emerald-700 dark:text-emerald-300',
  };

  // The two layers wrap and scroll identically only if they reserve the same
  // scrollbar gutter and break long runs the same way.
  const sharedTextClass = 'text-sm [scrollbar-gutter:stable] wrap-break-word';
  // The gutter sits outside the field's box, at the left edge of the column the
  // controls below share, and the box gives up exactly that width so the two
  // together still span it. The drawn layer covers both, which is what keeps a
  // number level with the line it counts even when that line wraps: the number
  // and its text are one row.
  const GUTTER_CLASS = 'w-8 shrink-0 pr-2 text-left select-none';
  const GUTTER_OFFSET_CLASS = 'ml-8 w-[calc(100%-2rem)]';
  // The row's own border and padding stand in for the text area's, since the
  // layer no longer sits directly over it.
  const GUTTER_TEXT_CLASS = 'min-w-0 flex-1 border-x border-transparent px-3';

  // Each logical line is its own row, so a number sits at the top of the line it
  // counts and a wrapped line indents under the text rather than under its
  // number.
  const lines = $derived.by(() => {
    const rows: TextAreaSegment[][] = [[]];
    for (const segment of segments ?? []) {
      const pieces = segment.text.split('\n');
      pieces.forEach((piece, index) => {
        if (index > 0) rows.push([]);
        (rows.at(-1) as TextAreaSegment[]).push({ ...segment, text: piece });
      });
    }
    return rows;
  });

  function syncScroll(event: Event): void {
    if (!overlayElement) return;
    const textarea = event.currentTarget as HTMLTextAreaElement;
    overlayElement.scrollTop = textarea.scrollTop;
    overlayElement.scrollLeft = textarea.scrollLeft;
  }
</script>

<div class={className}>
  <label class={FIELD_LABEL_CLASS[density]} for={textareaId}>{label}</label>
  <div class={['relative', FIELD_GAP_CLASS[density]]}>
    <textarea
      id={textareaId}
      bind:value
      onscroll={syncScroll}
      class={[
        FIELD_CONTROL_CLASS,
        FIELD_CONTROL_PADDING,
        sharedTextClass,
        textClass,
        lineNumbers ? GUTTER_OFFSET_CLASS : 'w-full',
        segments &&
          'text-transparent caret-slate-900 placeholder:text-slate-400 dark:caret-slate-100 dark:placeholder:text-slate-500',
        inputClass,
      ]}
      {...attributes}></textarea>
    {#if segments}
      <!--
        The text area underneath keeps the caret, selection, and editing; this
        layer only draws its text, so it lets every pointer event through.
        The trailing zero-width space gives a final empty line its height.
      -->
      <div
        bind:this={overlayElement}
        aria-hidden="true"
        class={[
          'pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap',
          lineNumbers
            ? 'border-y border-transparent py-2'
            : ['rounded-md border border-transparent', FIELD_CONTROL_PADDING],
          sharedTextClass,
          textClass,
        ]}
      >
        {#if lineNumbers}
          {#each lines as line, row (row)}
            <div class="flex">
              <span class={[GUTTER_CLASS, 'text-slate-400 dark:text-slate-600']}
                >{row + 1}</span
              >
              <span class={GUTTER_TEXT_CLASS}
                >{#each line as segment, index (index)}<span
                    class={[segment.tone && TONE_CLASS[segment.tone]]}
                    >{segment.text}</span
                  >{/each}&#8203;</span
              >
            </div>
          {/each}
        {:else}
          {#each segments as segment, index (index)}<span
              class={[segment.tone && TONE_CLASS[segment.tone]]}
              >{segment.text}</span
            >{/each}&#8203;
        {/if}
      </div>
    {/if}
  </div>
</div>
