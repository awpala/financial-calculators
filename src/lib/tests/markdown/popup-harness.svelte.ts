import { parse } from '#lib/markdown/parser.js';
import { useMarkdownPopups } from '#lib/markdown/renderers/state/popups.svelte.js';

/** Popup controller and effect-root cleanup owned by one test. */
export type PopupHarness = {
  /** Instance-scoped popup operations under test. */
  controller: ReturnType<typeof useMarkdownPopups>;
  /** Release every effect installed by the test controller. */
  destroy: () => void;
};

/** Create a popup controller with a real Svelte effect lifetime and injected math boundary. */
export function createPopupHarness(
  math: Parameters<typeof useMarkdownPopups>[1],
): PopupHarness {
  let controller!: ReturnType<typeof useMarkdownPopups>;
  const destroy = $effect.root(() => {
    controller = useMarkdownPopups(() => parse(''), math);
  });
  return { controller, destroy };
}
