<!--
@component
Renders an authored HTML table, preserving spans, header cells, and the constrained alignment classes the dialect allows.
-->
<script lang="ts">
  import type { HtmlTableNode } from '../../types.js';
  import type { Attachment } from 'svelte/attachments';

  import { freezeLeftColumns } from '../frozen-columns.js';
  import { useMarkdownRenderer } from '../state/renderer-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** Parser-sanitized table markup and its footnote IDs; untrusted external ASTs are not accepted. */
    node: HtmlTableNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
  };

  let { node, scope }: Props = $props();
  const renderer = useMarkdownRenderer();
  const denseMinWidthCh = $derived(
    node.denseColumnCount
      ? renderer.denseHtmlTableMinWidthCh(node.denseColumnCount)
      : null,
  );
  let lastNonMousePointerActivation: {
    button: HTMLButtonElement;
    timeStamp: number;
  } | null = null;

  interface HtmlTableFootnoteTrigger {
    button: HTMLButtonElement;
    id: string;
    token: string;
  }

  /** Resolve a generated HTML-table footnote trigger from a delegated event target. */
  function resolveFootnoteTrigger(
    root: HTMLElement,
    target: EventTarget | null,
  ): HtmlTableFootnoteTrigger | null {
    if (!(target instanceof Element)) return null;

    const button = target.closest<HTMLButtonElement>(
      'button[data-html-table-footnote]',
    );
    if (!button || !root.contains(button)) return null;

    const index = Number(button.dataset.htmlTableFootnote);
    const id = node.footnotes[index];
    if (!Number.isInteger(index) || id === undefined) return null;

    const token = `${scope}.html-footnote.${index}`;
    button.dataset.popupToken = token;
    return { button, id, token };
  }

  /** Open the shared popup for a clicked HTML-table footnote trigger. */
  function handleFootnoteClick(root: HTMLElement, event: MouseEvent): void {
    const trigger = resolveFootnoteTrigger(root, event.target);
    if (!trigger) return;
    if (
      event.detail > 0 &&
      lastNonMousePointerActivation?.button === trigger.button &&
      event.timeStamp - lastNonMousePointerActivation.timeStamp < 1_000
    ) {
      lastNonMousePointerActivation = null;
      return;
    }
    renderer.togglePopup(
      trigger.token,
      { kind: 'footnote', id: trigger.id },
      trigger.button,
    );
  }

  /** Activate a touch or pen tap as soon as the pointer is released. */
  function handleFootnotePointerUp(
    root: HTMLElement,
    event: PointerEvent,
  ): void {
    if (event.pointerType === 'mouse') return;
    const trigger = resolveFootnoteTrigger(root, event.target);
    if (!trigger) return;
    lastNonMousePointerActivation = {
      button: trigger.button,
      timeStamp: event.timeStamp,
    };
    renderer.togglePopup(
      trigger.token,
      { kind: 'footnote', id: trigger.id },
      trigger.button,
    );
  }

  /** Temporarily open the shared popup when an HTML-table footnote is hovered. */
  function handleFootnotePointerOver(
    root: HTMLElement,
    event: PointerEvent,
  ): void {
    if (event.pointerType !== 'mouse') return;
    const trigger = resolveFootnoteTrigger(root, event.target);
    if (!trigger) return;
    if (
      event.relatedTarget instanceof Node &&
      trigger.button.contains(event.relatedTarget)
    )
      return;
    renderer.showPopupOnHover(
      trigger.token,
      { kind: 'footnote', id: trigger.id },
      trigger.button,
    );
  }

  /** Close a hover-opened popup when its HTML-table footnote is no longer hovered. */
  function handleFootnotePointerOut(
    root: HTMLElement,
    event: PointerEvent,
  ): void {
    if (event.pointerType !== 'mouse') return;
    const trigger = resolveFootnoteTrigger(root, event.target);
    if (!trigger) return;
    if (
      event.relatedTarget instanceof Node &&
      trigger.button.contains(event.relatedTarget)
    )
      return;
    renderer.hidePopupOnHover(trigger.token);
  }

  /** Delegate generated footnote interactions from the raw HTML table. */
  const attachFootnoteTriggers: Attachment<HTMLElement> = (root) => {
    const handleClick = (event: MouseEvent) => handleFootnoteClick(root, event);
    const handlePointerUp = (event: PointerEvent) =>
      handleFootnotePointerUp(root, event);
    const handlePointerOver = (event: PointerEvent) =>
      handleFootnotePointerOver(root, event);
    const handlePointerOut = (event: PointerEvent) =>
      handleFootnotePointerOut(root, event);
    root.addEventListener('click', handleClick);
    root.addEventListener('pointerup', handlePointerUp);
    root.addEventListener('pointerover', handlePointerOver);
    root.addEventListener('pointerout', handlePointerOut);
    return () => {
      root.removeEventListener('click', handleClick);
      root.removeEventListener('pointerup', handlePointerUp);
      root.removeEventListener('pointerover', handlePointerOver);
      root.removeEventListener('pointerout', handlePointerOut);
    };
  };
</script>

<div class="my-5 max-w-full" data-html-table-shell>
  <div
    class={`mx-auto max-w-full overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 ${node.isDenseContent ? 'w-full' : 'w-fit'}`}
    data-html-table-frame
  >
    <div
      class="max-h-[82vh] overflow-x-auto overflow-y-auto"
      data-html-table-content
      style={denseMinWidthCh
        ? `--dense-table-min-width:${denseMinWidthCh}ch`
        : undefined}
      {@attach attachFootnoteTriggers}
      {@attach freezeLeftColumns(node.frozenLeftColumns)}
    >
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- The parser sanitizes table HTML after expanding authored markdown. -->
      {@html node.html}
    </div>
  </div>
</div>

<style>
  [data-html-table-content] :global(table) {
    border-collapse: separate;
    border-spacing: 0;
    table-layout: auto;
    width: 100%;
    max-width: 100%;
    font-size: 0.875rem;
  }

  /*
   * Authored tables can carry `colspan`/`rowspan`, so a dense one is split
   * evenly rather than by content weight; a `<colgroup>` still wins.
   */
  [data-html-table-content] :global(table[data-is-dense-content-table]) {
    table-layout: fixed;
    min-width: var(--dense-table-min-width, 0);
  }

  /*
   * Frozen columns are pinned by the shared attachment, which measures each
   * cell's `left` once the browser has laid the table out.
   */
  [data-html-table-content] :global(td[data-frozen-column]),
  [data-html-table-content] :global(th[data-frozen-column]) {
    position: sticky;
    z-index: 15;
  }

  /* `thead` holds the header background, so a pinned header cell restates it. */
  [data-html-table-content] :global(thead th[data-frozen-column]) {
    z-index: 25;
    background: rgb(241 245 249);
  }

  [data-html-table-content] :global([data-frozen-column='last']) {
    border-right: 1px solid rgb(203 213 225);
  }

  /* The row stripes are translucent, which a pinned cell cannot afford. */
  [data-html-table-content]
    :global(tbody tr:nth-child(even) td[data-frozen-column]),
  [data-html-table-content]
    :global(tbody tr:nth-child(even) th[data-frozen-column]) {
    background: rgb(248 250 252);
  }

  [data-html-table-content] :global(thead) {
    position: sticky;
    top: 0;
    z-index: 20;
    background: rgb(241 245 249);
  }

  [data-html-table-content] :global(th),
  [data-html-table-content] :global(td) {
    border-top: 1px solid rgb(226 232 240);
    padding: 0.5rem 0.75rem;
    vertical-align: top;
    white-space: normal;
    overflow-wrap: normal;
    word-break: normal;
  }

  [data-html-table-content] :global(th p),
  [data-html-table-content] :global(td p) {
    margin: 0;
    line-height: 1.625;
  }

  [data-html-table-content] :global(th p + p),
  [data-html-table-content] :global(td p + p) {
    margin-top: 0.75rem;
  }

  /* Preflight strips list markers, which authored `<ul>`/`<ol>` cells rely on. */
  [data-html-table-content] :global(th ul),
  [data-html-table-content] :global(td ul) {
    list-style: disc outside;
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }

  [data-html-table-content] :global(th ol),
  [data-html-table-content] :global(td ol) {
    list-style: decimal outside;
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  [data-html-table-content] :global(th li),
  [data-html-table-content] :global(td li) {
    margin: 0.125rem 0;
    line-height: 1.625;
  }

  [data-html-table-content] :global(thead th) {
    border-top: 0;
    border-bottom: 1px solid rgb(203 213 225);
    font-weight: 600;
    color: rgb(15 23 42);
  }

  [data-html-table-content] :global(tbody th) {
    font-weight: 400;
    color: rgb(51 65 85);
    background: rgb(248 250 252);
  }

  [data-html-table-content] :global(td) {
    color: rgb(51 65 85);
  }

  [data-html-table-content] :global(tbody tr:nth-child(odd) td),
  [data-html-table-content]
    :global(tbody tr:nth-child(odd) th[data-class='line-item']) {
    background: rgb(255 255 255);
  }

  [data-html-table-content] :global(tbody tr:nth-child(even) td),
  [data-html-table-content]
    :global(tbody tr:nth-child(even) th[data-class='line-item']) {
    background: rgb(248 250 252 / 0.7);
  }

  [data-html-table-content] :global([data-align='left']) {
    text-align: left;
  }

  [data-html-table-content] :global([data-align='center']) {
    text-align: center;
  }

  [data-html-table-content] :global([data-align='right']) {
    text-align: right;
  }

  [data-html-table-content] :global(.align-left) {
    text-align: left !important;
  }

  [data-html-table-content] :global(.align-center) {
    text-align: center !important;
  }

  [data-html-table-content] :global(.align-right) {
    text-align: right !important;
  }

  [data-html-table-content] :global(.align-top) {
    vertical-align: top !important;
  }

  [data-html-table-content] :global(.align-middle) {
    vertical-align: middle !important;
  }

  [data-html-table-content] :global(.align-bottom) {
    vertical-align: bottom !important;
  }

  [data-html-table-content] :global(.align-baseline) {
    vertical-align: baseline !important;
  }

  [data-html-table-content] :global([data-class~='table-title']) {
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  [data-html-table-content] :global([data-class~='section-title']) {
    font-weight: 600;
  }

  [data-html-table-content] :global([data-class~='dollar-figure']) {
    font-variant-numeric: tabular-nums;
  }

  [data-html-table-content] :global(img[data-html-table-image]) {
    display: block;
    margin-inline: auto;
    height: auto;
    max-width: 100%;
    border: 1px solid rgb(203 213 225);
    border-radius: 0.375rem;
    background: rgb(255 255 255);
  }

  [data-html-table-content] :global(button[data-html-table-footnote]) {
    margin-left: 0.125rem;
    border: 0;
    border-radius: 0.125rem;
    background: transparent;
    padding: 0 0.125rem;
    color: rgb(67 56 202);
    font-family: inherit;
    font-size: 0.72em;
    font-weight: 600;
    line-height: inherit;
    vertical-align: super;
    cursor: pointer;
  }

  [data-html-table-content] :global(button[data-html-table-footnote]:hover) {
    color: rgb(55 48 163);
  }

  [data-html-table-content] :global(th.html-table-super-divider),
  [data-html-table-content] :global(td.html-table-super-divider) {
    border-left: 2px solid rgb(203 213 225);
  }

  :global(.dark) [data-html-table-content] :global(thead) {
    background: rgb(30 41 59);
  }

  :global(.dark) [data-html-table-content] :global(th),
  :global(.dark) [data-html-table-content] :global(td) {
    border-top-color: rgb(30 41 59);
  }

  :global(.dark) [data-html-table-content] :global(thead th) {
    border-bottom-color: rgb(51 65 85);
    color: rgb(241 245 249);
  }

  :global(.dark) [data-html-table-content] :global(tbody th) {
    color: rgb(226 232 240);
    background: rgb(30 41 59 / 0.45);
  }

  :global(.dark) [data-html-table-content] :global(td) {
    color: rgb(203 213 225);
  }

  :global(.dark) [data-html-table-content] :global(img[data-html-table-image]) {
    border-color: rgb(51 65 85);
    background: rgb(15 23 42);
  }

  :global(.dark)
    [data-html-table-content]
    :global(button[data-html-table-footnote]) {
    color: rgb(165 180 252);
  }

  :global(.dark)
    [data-html-table-content]
    :global(button[data-html-table-footnote]:hover) {
    color: rgb(199 210 254);
  }

  :global(.dark) [data-html-table-content] :global(tbody tr:nth-child(odd) td),
  :global(.dark)
    [data-html-table-content]
    :global(tbody tr:nth-child(odd) th[data-class='line-item']) {
    background: rgb(15 23 42);
  }

  :global(.dark) [data-html-table-content] :global(tbody tr:nth-child(even) td),
  :global(.dark)
    [data-html-table-content]
    :global(tbody tr:nth-child(even) th[data-class='line-item']) {
    background: rgb(30 41 59 / 0.2);
  }

  :global(.dark)
    [data-html-table-content]
    :global([data-frozen-column='last']) {
    border-right-color: rgb(51 65 85);
  }

  :global(.dark)
    [data-html-table-content]
    :global(thead th[data-frozen-column]) {
    background: rgb(30 41 59);
  }

  :global(.dark)
    [data-html-table-content]
    :global(tbody tr:nth-child(even) td[data-frozen-column]),
  :global(.dark)
    [data-html-table-content]
    :global(tbody tr:nth-child(even) th[data-frozen-column]) {
    background: rgb(30 41 59);
  }

  :global(.dark) [data-html-table-content] :global(th.html-table-super-divider),
  :global(.dark)
    [data-html-table-content]
    :global(td.html-table-super-divider) {
    border-left-color: rgb(71 85 105);
  }
</style>
