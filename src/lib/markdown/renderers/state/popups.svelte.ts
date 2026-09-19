import { tick } from 'svelte';
import type { Attachment } from 'svelte/attachments';

import { resolveFootnoteDefinition } from '../render-scope.js';
import type { BlockNode, InlineNode, MarkdownDocument } from '../../types.js';

/** Minimal math-enhancement capability supplied by the owning renderer. */
interface MarkdownMathLike {
  /** Typeset this element after loading the runtime; failures reject the promise. */
  typesetElement: (element: Element | null) => Promise<void>;
  /** Release tracked math when an owner's popup leaves the document. */
  clearElement: (element: Element | null) => void;
}

/** Inline trigger kinds that open the shared anchored popup textbox. */
export type PopupSource =
  | {
      /** Resolve a footnote definition in the current document scope. */
      kind: 'footnote';
      /** Authored identifier of the footnote definition. */
      id: string;
    }
  | {
      /** Render a definition carried directly by the trigger. */
      kind: 'definition';
      /** Visible title of the definition popup. */
      term: string;
      /** Parsed inline content of the definition. */
      definition: InlineNode[];
    };

/** Resolved content the popup textbox renders for the active trigger. */
export interface PopupContent {
  /** Visible title of the active popup. */
  heading: string;
  /** Accessible name of the popup region. */
  label: string;
  /** Unique render path used to resolve nested references. */
  scope: string;
  /** Resolved block or inline content; a missing footnote has null blocks. */
  body:
    | {
        /** Select the block renderer. */
        kind: 'blocks';
        /** Resolved footnote blocks, or null when the reference is missing. */
        nodes: BlockNode[] | null;
      }
    | {
        /** Select the inline renderer. */
        kind: 'inline';
        /** Parsed definition content. */
        nodes: InlineNode[];
      };
}

/**
 * Create popup state inside a mounted renderer's effect scope. The scope owns
 * and releases document/viewport listeners; each invocation has independent state.
 */
export function useMarkdownPopups(
  getDoc: () => MarkdownDocument,
  math: MarkdownMathLike,
) {
  let activePopup = $state<{
    token: string;
    source: PopupSource;
    activation: 'click' | 'hover';
  } | null>(null);
  let activePopupAnchor = $state<HTMLButtonElement | null>(null);
  let popupElement = $state<HTMLDivElement | null>(null);
  /** Capture this controller's own popup and release tracked math on detach. */
  const attachPopup: Attachment<HTMLDivElement> = (element) => {
    popupElement = element;
    return () => {
      math.clearElement(element);
      if (popupElement === element) popupElement = null;
    };
  };
  let popupPosition = $state({ top: 0, left: 0, width: 0 });
  const activePopupContent = $derived.by((): PopupContent | null => {
    if (!activePopup) return null;
    const { token, source } = activePopup;
    const scope = `popup.${token}`;
    if (source.kind === 'footnote') {
      return {
        heading: `Footnote ${source.id}`,
        label: `Footnote ${source.id}`,
        scope,
        body: {
          kind: 'blocks',
          nodes: resolveFootnoteDefinition(getDoc(), token, source.id),
        },
      };
    }
    return {
      heading: source.term,
      label: `Definition of ${source.term}`,
      scope,
      body: { kind: 'inline', nodes: source.definition },
    };
  });
  const popupStyle = $derived(
    `top:${popupPosition.top}px;left:${popupPosition.left}px;${popupPosition.width > 0 ? `width:${popupPosition.width}px;` : ''}max-width:calc(100vw - 16px);`,
  );
  const activePopupIsPersistent = $derived(activePopup?.activation === 'click');

  /** Open one popup with the interaction mode that should control its lifetime. */
  function openPopup(
    token: string,
    source: PopupSource,
    anchor: HTMLButtonElement,
    activation: 'click' | 'hover',
  ): void {
    activePopup = { token, source, activation };
    activePopupAnchor = anchor;
    void tick().then(() => {
      positionPopup();
    });
  }

  function positionPopup(): void {
    if (!activePopup || !activePopupAnchor) return;
    if (!activePopupAnchor.isConnected) {
      activePopup = null;
      activePopupAnchor = null;
      return;
    }

    const triggerRect = activePopupAnchor.getBoundingClientRect();
    const margin = 8;
    const gap = 8;
    const viewportWidth = window.innerWidth;
    const preferredWidth =
      viewportWidth >= 640 ? 640 : Math.round(viewportWidth * 0.94);
    const maxViewportWidth = Math.max(0, viewportWidth - margin * 2);
    const width = Math.min(preferredWidth, maxViewportWidth);
    const spaceLeft = Math.max(0, triggerRect.right - margin);
    const spaceRight = Math.max(0, viewportWidth - triggerRect.left - margin);
    let left: number;

    if (spaceRight >= width + gap) left = triggerRect.left;
    else if (spaceLeft >= width + gap) left = triggerRect.right - width;
    else if (spaceRight >= spaceLeft) left = triggerRect.left;
    else left = triggerRect.right - width;

    left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
    const top = triggerRect.bottom + gap;
    popupPosition = {
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
    };
  }

  /** Toggle the popup for one inline trigger. */
  function togglePopup(
    token: string,
    source: PopupSource,
    anchor: HTMLButtonElement,
  ): void {
    if (activePopup?.token === token) {
      if (activePopup.activation === 'hover') {
        openPopup(token, source, anchor, 'click');
        return;
      }
      closeActivePopup();
      return;
    }
    openPopup(token, source, anchor, 'click');
  }

  /** Temporarily show a popup while its trigger is hovered. */
  function showPopupOnHover(
    token: string,
    source: PopupSource,
    anchor: HTMLButtonElement,
  ): void {
    if (activePopup?.activation === 'click') return;
    if (activePopup?.token === token) return;
    openPopup(token, source, anchor, 'hover');
  }

  /** Close a popup when the hover that opened it ends. */
  function hidePopupOnHover(token: string): void {
    if (activePopup?.activation !== 'hover' || activePopup.token !== token)
      return;
    closeActivePopup();
  }

  /** Clear active popup state and close its textbox. */
  function closeActivePopup(): void {
    activePopup = null;
    activePopupAnchor = null;
  }

  $effect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!activePopup) return;
      const target = event.target;
      if (!(target instanceof Element)) {
        closeActivePopup();
        return;
      }
      if (popupElement?.contains(target)) return;
      if (!activePopupAnchor?.contains(target)) closeActivePopup();
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  });

  $effect(() => {
    if (!activePopup) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeActivePopup();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  $effect(() => {
    if (!activePopup) return;
    const handleViewportChange = () => positionPopup();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    void tick().then(() => positionPopup());
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  });

  $effect(() => {
    if (!activePopup || !popupElement) return;
    const popup = popupElement;
    let cancelled = false;
    void (async () => {
      await tick();
      if (cancelled || !activePopup) return;
      await math.typesetElement(popup);
    })().catch(() => {
      // Popup content remains readable if the optional math enhancement fails.
    });
    return () => {
      cancelled = true;
      math.clearElement(popup);
    };
  });

  return {
    attachPopup,
    /** Resolved content of the current popup, or null when closed. */
    get activePopupContent(): PopupContent | null {
      return activePopupContent;
    },
    /** Viewport-relative positioning style for the active popup. */
    get popupStyle() {
      return popupStyle;
    },
    /** Whether activation by click keeps the popup open after pointer exit. */
    get activePopupIsPersistent(): boolean {
      return activePopupIsPersistent;
    },
    togglePopup,
    showPopupOnHover,
    hidePopupOnHover,
    closeActivePopup,
  };
}
