<!--
@component
Renders a parsed markdown document as a Svelte tree, providing the renderer context, math, popups, and clipboard behavior to its subtree.
-->
<script lang="ts">
  import Clipboard from '#lib/components/behaviors/Clipboard.svelte';
  import { getThemeContext } from '#lib/state/theme.svelte.js';

  import {
    ArticleHtmlTableEnhancer,
    ArticleMathEnhancer,
    BlockRenderer,
    Popup,
    articleHeadingAndBody,
    articleThemeData,
    denseHtmlTableMinWidthCh,
    denseTableLayout,
    headingClass,
    isTableTitleParagraph,
    listClass,
    paragraphClass,
    provideMarkdownRenderer,
    subheaderCellContent,
    tableAlignClass,
    tableCellFlowClass,
    useMarkdownMath,
    useMarkdownPopups,
  } from './renderers/index.js';
  import type { MarkdownDocument } from './types.js';

  /** Public inputs for this component. */
  type Props = {
    /** The parsed document to render, and the source of the renderer context. */
    doc: MarkdownDocument;
  };

  let { doc }: Props = $props();

  const theme = getThemeContext();
  const math = useMarkdownMath();
  const isDarkMode = $derived(theme.current === 'dark');
  const popups = useMarkdownPopups(() => doc, math);

  // Everything the element renderers need, assembled once and read out of
  // context by each of them. Passing this down as props would thread a dozen
  // values through every intermediate renderer for the benefit of one leaf.
  provideMarkdownRenderer({
    headingClass,
    listClass,
    tableAlignClass,
    paragraphClass,
    isTableTitleParagraph,
    tableCellFlowClass,
    denseTableLayout,
    denseHtmlTableMinWidthCh,
    subheaderCellContent,
    articleHeadingAndBody,
    articleThemeData: (dataAttributes) =>
      articleThemeData(dataAttributes, isDarkMode),
    normalizeLatexValue: math.normalizeLatexValue,
    togglePopup: popups.togglePopup,
    showPopupOnHover: popups.showPopupOnHover,
    hidePopupOnHover: popups.hidePopupOnHover,
  });
</script>

<Clipboard>
  <ArticleMathEnhancer {doc} {math}>
    <ArticleHtmlTableEnhancer {doc}>
      <article>
        <BlockRenderer nodes={doc.children} depth={0} scope="root" />
      </article>
    </ArticleHtmlTableEnhancer>
  </ArticleMathEnhancer>
</Clipboard>

{#if popups.activePopupContent}
  <Popup
    attach={popups.attachPopup}
    content={popups.activePopupContent}
    style={popups.popupStyle}
    showClose={popups.activePopupIsPersistent}
    onClose={popups.closeActivePopup}
  />
{/if}
