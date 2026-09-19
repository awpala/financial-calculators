<!--
@component
Accepts a file by drag-and-drop or by opening the system picker, and hands it to its owner. Keyboard-operable; the owner does the reading and validation.
-->
<script lang="ts">
  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Requests that the owner take the chosen file; called once per selection. */
    onSelect: (file: File) => void;
    /** Accept filter passed to the file input, such as `.csv,text/csv`; defaults to any file. */
    accept?: string;
    /** Whether selection is refused; defaults to false. */
    disabled?: boolean;
    /** Primary instruction shown in the target. Defaults to `'Drop a file here, or click to choose'`. */
    label?: string;
    /** Optional secondary line, such as the accepted formats or a size limit. Defaults to an empty string. */
    hint?: string;
    /** Additional classes applied to the drop target. Defaults to an empty string. */
    class?: string;
  };

  let {
    onSelect,
    accept = '',
    disabled = false,
    label = 'Drop a file here, or click to choose',
    hint = '',
    class: className = '',
  }: Props = $props();

  let dragging = $state(false);
  let inputElement = $state<HTMLInputElement | null>(null);

  function handleDragEnter(event: DragEvent): void {
    if (disabled) return;
    // Without preventDefault the browser navigates to the dropped file, which
    // discards whatever the page was doing.
    event.preventDefault();
    dragging = true;
  }

  function handleDragOver(event: DragEvent): void {
    if (disabled) return;
    event.preventDefault();
    dragging = true;
  }

  function handleDragLeave(event: DragEvent): void {
    if (disabled) return;
    // Dragging across a child fires dragleave on the target. Containment is
    // what distinguishes that from the pointer actually leaving the zone --
    // without it, the highlight flickers over every nested element.
    const target = event.currentTarget as HTMLElement;
    if (!target.contains(event.relatedTarget as Node)) dragging = false;
  }

  function handleDrop(event: DragEvent): void {
    if (disabled) return;
    event.preventDefault();
    dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) onSelect(file);
  }

  function handleChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) onSelect(file);
    // Clearing the value is what lets the same file be chosen twice in a row;
    // otherwise the second selection fires no change event.
    input.value = '';
  }

  function openPicker(): void {
    if (!disabled) inputElement?.click();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inputElement?.click();
    }
  }
</script>

<div
  role="button"
  tabindex={disabled ? -1 : 0}
  aria-disabled={disabled}
  aria-label={label}
  class={[
    'flex h-56 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center transition-colors',
    dragging
      ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800'
      : 'border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
    disabled && 'pointer-events-none opacity-60',
    className,
  ]}
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={openPicker}
  onkeydown={handleKeydown}
>
  <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
  {#if hint}
    <p class="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
  {/if}
  <input
    bind:this={inputElement}
    type="file"
    {accept}
    class="hidden"
    onchange={handleChange}
  />
</div>
