import '@testing-library/jest-dom/vitest';

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(): void {
    this.setAttribute('open', '');
  };
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close(): void {
    this.removeAttribute('open');
  };
}

// jsdom implements no Web Animations API, which Svelte's built-in transitions
// drive. The stub settles immediately so a transitioning element reaches its
// end state instead of hanging half-mounted.
if (!Element.prototype.animate) {
  Element.prototype.animate = function animate(): Animation {
    const animation = {
      currentTime: 0,
      startTime: 0,
      playbackRate: 1,
      playState: 'finished',
      pending: false,
      finished: Promise.resolve(),
      onfinish: null as (() => void) | null,
      oncancel: null as (() => void) | null,
      cancel: () => undefined,
      finish: () => undefined,
      pause: () => undefined,
      play: () => undefined,
      reverse: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    queueMicrotask(() => animation.onfinish?.());
    return animation as unknown as Animation;
  };
}
