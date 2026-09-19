<!--
@component
Presents two mutually exclusive labels around a neutral switch. The selected label is emphasized while the track retains its color; the caller owns the selected option.
-->
<script lang="ts">
  import Switch from '#lib/components/elements/Switch.svelte';

  /** Labels, selection, and interaction for a two-option control. */
  type Props = {
    /** Visible label selected when checked is false. */
    firstLabel: string;
    /** Visible label selected when checked is true. */
    secondLabel: string;
    /** Whether the second option is selected; the first is selected otherwise. */
    checked: boolean;
    /** Accessible name describing selection of the second option. */
    label: string;
    /** Requests selection of the second option when true, or the first when false. */
    onChange: (checked: boolean) => void;
    /** Whether changes are unavailable; defaults to false. */
    disabled?: boolean;
  };

  let {
    firstLabel,
    secondLabel,
    checked,
    label,
    onChange,
    disabled = false,
  }: Props = $props();
  const selectedClass = 'font-medium text-slate-900 dark:text-slate-100';
  const unselectedClass = 'font-normal text-slate-500 dark:text-slate-400';
</script>

<div class="inline-flex items-center gap-2 text-sm">
  <span class={checked ? unselectedClass : selectedClass}>{firstLabel}</span>
  <Switch variant="neutral" {checked} {label} {onChange} {disabled} />
  <span class={checked ? selectedClass : unselectedClass}>{secondLabel}</span>
</div>
