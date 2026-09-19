<!--
@component
Renders a labeled checkbox whose checked state is supplied by the owner and updated through onChange.
-->
<script lang="ts">
  import { checkedFrom } from '#lib/dom/events.js';

  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Current checked state supplied by the owner. */
    checked: boolean;
    /** Visible text and accessible name for the checkbox. */
    label: string;
    /** Requests that the owner adopt the checkbox's new checked state. */
    onChange: (checked: boolean) => void;
    /** Extra classes for the wrapping label, e.g. layout or spacing. Defaults to an empty string. */
    class?: string;
    /** Extra classes for the label text, e.g. a muted color. Defaults to an empty string. */
    labelClass?: string;
  };

  let {
    checked,
    label,
    onChange,
    class: wrapperClass = '',
    labelClass = '',
  }: Props = $props();
</script>

<!--
  A plain checkbox with its text, not a Switch: Switch renders a toggle pill for
  a setting that reads as on/off hardware, and these are ordinary form controls.
  The text lives inside the label so it supplies the checkbox's accessible name.
-->
<label class={['flex cursor-pointer items-center gap-2 text-xs', wrapperClass]}>
  <input
    type="checkbox"
    {checked}
    onchange={(event) => onChange(checkedFrom(event))}
  />
  <span class={['font-medium', labelClass]}>{label}</span>
</label>
